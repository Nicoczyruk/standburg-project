// server/db/queries/pedido.queries.js
const db = require('../connection');
const sql = require('mssql');

/**
 * Obtiene una lista de pedidos con filtros opcionales.
 * @param {object} filters - Objeto con filtros: { estado, mesa_id, fechaInicio, fechaFin }
 */
const getAllPedidos = async (filters = {}) => {
    try {
        let queryString = `
            SELECT
                p.pedido_id, p.mesa_id, m.numero_mesa, p.admin_id, a.nombre_usuario AS admin_nombre,
                p.fecha_hora, p.estado, p.total
            FROM PEDIDOS p
            LEFT JOIN MESAS m ON p.mesa_id = m.mesa_id
            LEFT JOIN ADMIN a ON p.admin_id = a.admin_id
            WHERE 1=1`; // Base para añadir filtros

        const params = {};

        if (filters.estado) {
            queryString += ' AND p.estado = @estado';
            params.estado = { type: sql.VarChar(20), value: filters.estado };
        }
        if (filters.mesa_id) {
            queryString += ' AND p.mesa_id = @mesa_id';
            params.mesa_id = { type: sql.Int, value: filters.mesa_id };
        }
        // TODO: Añadir filtros de fecha si es necesario

        queryString += ' ORDER BY p.fecha_hora DESC;';

        const { recordset } = await db.query(queryString, params);
        return recordset;
    } catch (error) {
        console.error('Error al obtener todos los pedidos:', error);
        throw error;
    }
};

/**
 * Obtiene un pedido específico por ID, incluyendo sus detalles.
 * @param {number} id - El ID del pedido.
 */
const getPedidoById = async (id) => {
    try {
        // Obtener datos principales del pedido
        const pedidoQuery = `
            SELECT
                p.pedido_id, p.mesa_id, m.numero_mesa, p.admin_id, a.nombre_usuario AS admin_nombre,
                p.fecha_hora, p.estado, p.total
            FROM PEDIDOS p
            LEFT JOIN MESAS m ON p.mesa_id = m.mesa_id
            LEFT JOIN ADMIN a ON p.admin_id = a.admin_id
            WHERE p.pedido_id = @id;`;
        const pedidoResult = await db.query(pedidoQuery, { id: { type: sql.Int, value: id } });
        const pedido = pedidoResult.recordset[0];

        if (!pedido) {
            return null; // Pedido no encontrado
        }

        // Obtener detalles del pedido
        const detallesQuery = `
            SELECT
                d.detalle_id, d.producto_id, pr.nombre AS producto_nombre,
                d.cantidad, d.precio_unitario, d.subtotal
            FROM DETALLE_PEDIDO d
            JOIN PRODUCTOS pr ON d.producto_id = pr.producto_id
            WHERE d.pedido_id = @id
            ORDER BY d.detalle_id;`; // O ordenar por pr.nombre
        const detallesResult = await db.query(detallesQuery, { id: { type: sql.Int, value: id } });
        pedido.detalles = detallesResult.recordset || []; // Añadir detalles al objeto pedido

        return pedido;
    } catch (error) {
        console.error(`Error al obtener el pedido con ID ${id}:`, error);
        throw error;
    }
};

/**
 * Actualiza el estado de un pedido.
 * @param {number} id - El ID del pedido.
 * @param {string} estado - El nuevo estado.
 */
const updatePedidoEstado = async (id, estado) => {
    try {
        const result = await db.query(
            `UPDATE PEDIDOS SET estado = @estado
             OUTPUT INSERTED.pedido_id, INSERTED.estado
             WHERE pedido_id = @id;`,
            {
                id: { type: sql.Int, value: id },
                estado: { type: sql.VarChar(20), value: estado }
            }
        );
        return result.recordset[0]; // Devuelve el ID y nuevo estado si se actualizó
    } catch (error) {
        console.error(`Error al actualizar estado del pedido ID ${id}:`, error);
         // Manejar error de CHECK constraint en estado (aunque validamos antes)
        if (error.number === 547 && error.message.includes('CK__PEDIDOS__estado')) {
             throw new Error(`El estado '${estado}' no es válido.`);
        }
        throw error;
    }
};


/**
 * Crea un nuevo pedido y sus detalles usando una transacción.
 * @param {object} pedidoData - Datos del pedido { mesa_id, admin_id, items: [{ producto_id, cantidad }] }.
 */
const createPedidoTransaction = async ({ mesa_id, admin_id, items }) => {
    let transaction;
    try {
        // 1. Iniciar transacción
        transaction = await db.getTransaction();

        // 2. Obtener precios actuales de los productos y validar existencias
        const preciosProductos = {};
        for (const item of items) {
            const prodResult = await db.query(
                'SELECT precio FROM PRODUCTOS WHERE producto_id = @producto_id;',
                { producto_id: { type: sql.Int, value: item.producto_id } },
                transaction // Ejecutar dentro de la transacción
            );
            if (!prodResult.recordset[0]) {
                throw new Error(`Producto con ID ${item.producto_id} no encontrado.`);
            }
            preciosProductos[item.producto_id] = prodResult.recordset[0].precio;
        }

        // 3. Insertar en PEDIDOS (estado inicial 'pendiente', total inicial 0)
        const pedidoInsertResult = await db.query(
            `INSERT INTO PEDIDOS (mesa_id, admin_id, estado, total)
             OUTPUT INSERTED.pedido_id
             VALUES (@mesa_id, @admin_id, 'pendiente', 0.00);`,
            {
                mesa_id: { type: sql.Int, value: mesa_id },
                admin_id: { type: sql.Int, value: admin_id }
            },
            transaction // Ejecutar dentro de la transacción
        );
        const nuevoPedidoId = pedidoInsertResult.recordset[0].pedido_id;

        // 4. Insertar en DETALLE_PEDIDO y calcular total
        let totalPedidoCalculado = 0;
        for (const item of items) {
            const precioUnitario = preciosProductos[item.producto_id];
            const cantidad = item.cantidad;
            const subtotal = cantidad * precioUnitario;
            totalPedidoCalculado += subtotal;

            await db.query(
                `INSERT INTO DETALLE_PEDIDO (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
                 VALUES (@pedido_id, @producto_id, @cantidad, @precio_unitario, @subtotal);`,
                {
                    pedido_id: { type: sql.Int, value: nuevoPedidoId },
                    producto_id: { type: sql.Int, value: item.producto_id },
                    cantidad: { type: sql.Int, value: cantidad },
                    precio_unitario: { type: sql.Decimal(10, 2), value: precioUnitario },
                    subtotal: { type: sql.Decimal(10, 2), value: subtotal }
                },
                transaction // Ejecutar dentro de la transacción
            );
        }

        // 5. Actualizar el total en PEDIDOS
        await db.query(
            'UPDATE PEDIDOS SET total = @total WHERE pedido_id = @pedido_id;',
            {
                total: { type: sql.Decimal(10, 2), value: totalPedidoCalculado },
                pedido_id: { type: sql.Int, value: nuevoPedidoId }
            },
            transaction // Ejecutar dentro de la transacción
        );

        // 6. Confirmar transacción
        await db.commitTransaction(transaction);

        // 7. Devolver el pedido completo recién creado
        return await getPedidoById(nuevoPedidoId);

    } catch (error) {
        console.error('Error al crear el pedido (transacción):', error.message);
        // 8. Deshacer transacción si hubo error
        if (transaction) {
            await db.rollbackTransaction(transaction);
        }
        // Relanzar el error específico o uno genérico
        throw new Error(error.message || 'No se pudo crear el pedido.');
    }
};


module.exports = {
    getAllPedidos,
    getPedidoById,
    updatePedidoEstado,
    createPedidoTransaction,
};