// server/db/queries/pedido.queries.js
const db = require('../connection');
const sql = require('mssql');

/**
 * Obtiene una lista de pedidos con filtros opcionales.
 * CORREGIDO FINAL: Selecciona solo columnas existentes en PEDIDOS y MESAS.
 * No intenta hacer JOIN con ADMIN ya que PEDIDOS no tiene admin_id.
 * @param {object} filters - Objeto con filtros: { estado, mesa_id, fechaInicio, fechaFin }
 */
const getAllPedidos = async (filters = {}) => {
    try {
        // Query corregida final: Selecciona columnas de PEDIDOS y hace JOIN solo con MESAS
        let queryString = `
            SELECT
                p.pedido_id,
                p.mesa_id,
                m.numero_mesa, -- Del JOIN con MESAS
                p.cliente_nombre,
                p.cliente_telefono,
                p.cliente_direccion,
                p.notas,
                p.fecha_hora,
                p.estado,
                p.tipo,
                p.total
            FROM PEDIDOS p
            LEFT JOIN MESAS m ON p.mesa_id = m.mesa_id -- JOIN con MESAS se mantiene
            -- YA NO HAY JOIN CON ADMIN
            WHERE 1=1`; // Base para añadir filtros

        const params = {};

        if (filters.estado) {
            // Asumiendo que 'estado' en PEDIDOS es nvarchar(50) según tu script
            queryString += ' AND p.estado = @estado';
            params.estado = { type: sql.NVarChar(50), value: filters.estado };
        }
        if (filters.mesa_id) {
            queryString += ' AND p.mesa_id = @mesa_id';
            params.mesa_id = { type: sql.Int, value: filters.mesa_id };
        }
        // TODO: Añadir filtros de fecha si es necesario

        queryString += ' ORDER BY p.fecha_hora DESC;';

        const { recordset } = await db.query(queryString, params);
        return recordset; // Devuelve la lista de pedidos con las columnas correctas
    } catch (error) {
        console.error('Error al obtener todos los pedidos:', error);
        throw error; // Relanza para manejo en el controlador
    }
};

// --- getPedidoById (Ajuste menor para reflejar columnas de PEDIDOS) ---
const getPedidoById = async (id) => {
    try {
        // Quitar admin_id y admin_nombre, añadir cliente_*
        const pedidoQuery = `
            SELECT
                p.pedido_id, p.mesa_id, m.numero_mesa,
                p.cliente_nombre, p.cliente_telefono, p.cliente_direccion, p.notas, -- Columnas de cliente y notas
                p.fecha_hora, p.estado, p.tipo, p.total -- Se mantiene tipo
            FROM PEDIDOS p
            LEFT JOIN MESAS m ON p.mesa_id = m.mesa_id
            -- No se necesita JOIN con ADMIN
            WHERE p.pedido_id = @id;`;
        const pedidoResult = await db.query(pedidoQuery, { id: { type: sql.Int, value: id } });
        const pedido = pedidoResult.recordset[0];

        if (!pedido) {
            return null;
        }

        // Obtener detalles (sin cambios aquí)
        const detallesQuery = `
            SELECT
                d.detalle_id, d.producto_id, pr.nombre AS producto_nombre,
                d.cantidad, d.precio_unitario, d.subtotal
            FROM DETALLE_PEDIDO d
            JOIN PRODUCTOS pr ON d.producto_id = pr.producto_id
            WHERE d.pedido_id = @id
            ORDER BY d.detalle_id;`;
        const detallesResult = await db.query(detallesQuery, { id: { type: sql.Int, value: id } });
        pedido.detalles = detallesResult.recordset || [];

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
 * CORREGIDO: No usa admin_id, usa las columnas cliente_*
 * @param {object} pedidoData - Datos: { mesa_id, cliente_nombre, cliente_telefono, cliente_direccion, notas, tipo, items: [{ producto_id, cantidad }] }.
 */
const createPedidoTransaction = async ({ mesa_id, cliente_nombre, cliente_telefono, cliente_direccion, notas, tipo, items }) => {
    let transaction;
    try {
        transaction = await db.getTransaction();

        // Validar productos (igual que antes)
        const preciosProductos = {};
        for (const item of items) {
            const prodResult = await db.query(
                'SELECT precio FROM PRODUCTOS WHERE producto_id = @producto_id;',
                { producto_id: { type: sql.Int, value: item.producto_id } },
                transaction
            );
            if (!prodResult.recordset[0]) {
                await db.rollbackTransaction(transaction);
                throw new Error(`Producto con ID ${item.producto_id} no encontrado.`);
            }
            preciosProductos[item.producto_id] = prodResult.recordset[0].precio;
        }

        // Insertar en PEDIDOS usando las columnas correctas
        const pedidoInsertResult = await db.query(
            `INSERT INTO PEDIDOS (mesa_id, cliente_nombre, cliente_telefono, cliente_direccion, notas, tipo, estado, total)
             OUTPUT INSERTED.pedido_id
             VALUES (@mesa_id, @cliente_nombre, @cliente_telefono, @cliente_direccion, @notas, @tipo, 'PENDIENTE', 0.00);`, // Estado default 'PENDIENTE'
            {
                mesa_id: { type: sql.Int, value: mesa_id }, // Será null si no es tipo mesa
                cliente_nombre: { type: sql.NVarChar(150), value: cliente_nombre },
                cliente_telefono: { type: sql.NVarChar(50), value: cliente_telefono },
                cliente_direccion: { type: sql.NVarChar(255), value: cliente_direccion },
                notas: { type: sql.NVarChar(sql.MAX), value: notas },
                tipo: { type: sql.NVarChar(50), value: tipo } // Usamos la columna 'tipo'
            },
            transaction
        );
        const nuevoPedidoId = pedidoInsertResult.recordset[0].pedido_id;

        // Insertar en DETALLE_PEDIDO y calcular total (igual que antes)
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
                transaction
            );
        }

        // Actualizar el total en PEDIDOS (igual que antes)
        // NOTA: Si el pedido es delivery y tiene costo de envío, ¿dónde se suma?
        // Por ahora, solo sumamos el subtotal de productos. Podrías añadir el costo de envío aquí si lo pasas.
        await db.query(
            'UPDATE PEDIDOS SET total = @total WHERE pedido_id = @pedido_id;',
            {
                total: { type: sql.Decimal(12, 2), value: totalPedidoCalculado }, // Ajusta el tipo decimal si es necesario
                pedido_id: { type: sql.Int, value: nuevoPedidoId }
            },
            transaction
        );

        // Confirmar transacción
        await db.commitTransaction(transaction);

        // Devolver el pedido completo
        return await getPedidoById(nuevoPedidoId); // Necesita que getPedidoById también se actualice si cambian las columnas

    } catch (error) {
        console.error('Error al crear el pedido (transacción):', error.message);
        if (transaction) {
            try { await db.rollbackTransaction(transaction); } catch (rbErr) { console.error("Error durante el rollback:", rbErr); }
        }
         // Manejar error de FK de mesa_id
         if (error.number === 547 && error.message.includes('FK_PEDIDOS_MESAS')) {
             throw new Error(`La mesa con ID ${mesa_id} no existe.`);
        }
        throw new Error(error.message || 'No se pudo crear el pedido.');
    }
};


module.exports = {
    getAllPedidos,
    getPedidoById,
    updatePedidoEstado,
    createPedidoTransaction,
};