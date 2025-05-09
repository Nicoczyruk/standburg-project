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
 * @param {object} pedidoData - Datos: { mesa_id, cliente_nombre, ..., tipo, items, estadoInicial }.
 */
const createPedidoTransaction = async ({
    mesa_id,
    cliente_nombre,
    cliente_telefono,
    cliente_direccion,
    notas,
    tipo,
    items, // Este es el array de items que viene del frontend.
    estadoInicial
}) => {
    let transaction;
    try {
        transaction = await db.getTransaction();

        console.log("BACKEND DEBUG: Iniciando createPedidoTransaction con items:", JSON.stringify(items, null, 2));

        // 1. Validar productos y almacenar sus precios actuales
        const preciosProductos = {}; // Objeto para almacenar precios { producto_id: precio }
        for (const item of items) {
            const productoIdValidado = parseInt(item.producto_id); // Parsear aquí por si acaso
            if (isNaN(productoIdValidado) || productoIdValidado <= 0) {
                await db.rollbackTransaction(transaction);
                throw new Error(`Item con producto_id inválido o faltante: ${JSON.stringify(item)}`);
            }

            const prodResult = await db.query(
                'SELECT precio FROM PRODUCTOS WHERE producto_id = @producto_id;',
                { producto_id: { type: sql.Int, value: productoIdValidado } },
                transaction
            );

            if (!prodResult.recordset[0]) {
                await db.rollbackTransaction(transaction);
                throw new Error(`Producto con ID ${productoIdValidado} no encontrado en la base de datos.`);
            }
            preciosProductos[productoIdValidado] = prodResult.recordset[0].precio; // Guardar el precio
            console.log(`BACKEND DEBUG: Precio para producto_id ${productoIdValidado}: ${preciosProductos[productoIdValidado]}`);
        }

        // 2. Insertar en PEDIDOS
        const estadoParaInsertar = estadoInicial || 'PENDIENTE'; // El controlador ya define esto.
        const pedidoInsertResult = await db.query(
            `INSERT INTO PEDIDOS (mesa_id, cliente_nombre, cliente_telefono, cliente_direccion, notas, tipo, estado, total)
             OUTPUT INSERTED.pedido_id
             VALUES (@mesa_id, @cliente_nombre, @cliente_telefono, @cliente_direccion, @notas, @tipo, @estado, 0.00);`,
            {
                mesa_id: { type: sql.Int, value: mesa_id },
                cliente_nombre: { type: sql.NVarChar(150), value: cliente_nombre },
                cliente_telefono: { type: sql.NVarChar(50), value: cliente_telefono },
                cliente_direccion: { type: sql.NVarChar(255), value: cliente_direccion },
                notas: { type: sql.NVarChar(sql.MAX), value: notas },
                tipo: { type: sql.NVarChar(50), value: tipo },
                estado: { type: sql.NVarChar(50), value: estadoParaInsertar }
            },
            transaction
        );
        const nuevoPedidoId = pedidoInsertResult.recordset[0].pedido_id;

        // 3. Insertar en DETALLE_PEDIDO y calcular total
        let totalPedidoCalculado = 0;
        for (const item of items) {
            const productoIdParaDetalle = parseInt(item.producto_id);
            const cantidadParaDetalle = parseInt(item.cantidad);

            // Validación redundante pero segura
            if (isNaN(productoIdParaDetalle) || productoIdParaDetalle <= 0 || isNaN(cantidadParaDetalle) || cantidadParaDetalle <= 0) {
                await db.rollbackTransaction(transaction);
                throw new Error(`Datos de item inválidos para DETALLE_PEDIDO antes de insertar. producto_id: ${item.producto_id}, cantidad: ${item.cantidad}`);
            }

            const precioUnitario = preciosProductos[productoIdParaDetalle]; // <--- OBTENER PRECIO GUARDADO

            if (precioUnitario === undefined || isNaN(parseFloat(precioUnitario))) {
                await db.rollbackTransaction(transaction);
                throw new Error(`Precio no encontrado o inválido para producto_id: ${productoIdParaDetalle} en el objeto preciosProductos. preciosProductos: ${JSON.stringify(preciosProductos)}`);
            }

            const subtotal = cantidadParaDetalle * parseFloat(precioUnitario);
            totalPedidoCalculado += subtotal;

            console.log(`BACKEND DEBUG: Preparando para insertar en DETALLE_PEDIDO: pedido_id=${nuevoPedidoId}, producto_id=${productoIdParaDetalle}, cantidad=${cantidadParaDetalle}, precio_unitario=${precioUnitario}, subtotal=${subtotal}`);

            await db.query(
                `INSERT INTO DETALLE_PEDIDO (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
                 VALUES (@pedido_id, @producto_id, @cantidad, @precio_unitario, @subtotal);`,
                {
                    pedido_id: { type: sql.Int, value: nuevoPedidoId },
                    producto_id: { type: sql.Int, value: productoIdParaDetalle },
                    cantidad: { type: sql.Int, value: cantidadParaDetalle },
                    precio_unitario: { type: sql.Decimal(10, 2), value: parseFloat(precioUnitario) }, // Usar precioUnitario obtenido
                    subtotal: { type: sql.Decimal(12, 2), value: subtotal }
                },
                transaction
            );
        }

        // 4. Actualizar el total en PEDIDOS
        await db.query(
            'UPDATE PEDIDOS SET total = @total WHERE pedido_id = @pedido_id;',
            {
                total: { type: sql.Decimal(12, 2), value: totalPedidoCalculado },
                pedido_id: { type: sql.Int, value: nuevoPedidoId }
            },
            transaction
        );

        // 5. Confirmar transacción
        await db.commitTransaction(transaction);

        // 6. Devolver el pedido completo
        return await getPedidoById(nuevoPedidoId);

    } catch (error) {
        console.error('Error completo en createPedidoTransaction:', error.message, error.stack); // Loguear el stack también
        if (transaction && transaction._aborted === false && transaction._completed === false ) {
            try { await db.rollbackTransaction(transaction); } catch (rbErr) { console.error("Error durante el rollback:", rbErr); }
        }
        throw error; // Relanzar para que el controlador lo maneje (o uno más específico si se prefiere)
    }
};


module.exports = {
    getAllPedidos,
    getPedidoById,
    updatePedidoEstado,
    createPedidoTransaction,
};