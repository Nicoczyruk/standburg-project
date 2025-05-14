// server/db/queries/pedido.queries.js
const db = require('../connection');
const sql = require('mssql');
// Importar los métodos de pago válidos para usarlos en la validación
const { METODOS_PAGO_VALIDOS } = require('./pago.queries'); 

/**
 * Obtiene una lista de pedidos con filtros opcionales.
 * 
 */
const getAllPedidos = async (filters = {}) => {
    try {
        let queryString = `
            SELECT
                p.pedido_id, p.mesa_id, m.numero_mesa,
                p.cliente_nombre, p.cliente_telefono, p.cliente_direccion, p.notas,
                p.fecha_hora, p.estado, p.tipo, p.total
            FROM PEDIDOS p
            LEFT JOIN MESAS m ON p.mesa_id = m.mesa_id
            WHERE 1=1`;

        const params = {};

        if (filters.estado) {
            queryString += ' AND p.estado = @estado';
            params.estado = { type: sql.NVarChar(50), value: filters.estado };
        }
        if (filters.mesa_id) {
            queryString += ' AND p.mesa_id = @mesa_id';
            params.mesa_id = { type: sql.Int, value: filters.mesa_id };
        }
        queryString += ' ORDER BY p.fecha_hora DESC;';
        const { recordset } = await db.query(queryString, params);
        return recordset;
    } catch (error) {
        console.error('Error al obtener todos los pedidos:', error);
        throw error;
    }
};

/**
 * Obtiene un pedido específico por su ID, incluyendo sus detalles.
 * 
 */
const getPedidoById = async (id) => { 
    try {
        const pedidoQuery = `
            SELECT
                p.pedido_id, p.mesa_id, m.numero_mesa,
                p.cliente_nombre, p.cliente_telefono, p.cliente_direccion, p.notas,
                p.fecha_hora, p.estado, p.tipo, p.total
            FROM PEDIDOS p
            LEFT JOIN MESAS m ON p.mesa_id = m.mesa_id
            WHERE p.pedido_id = @id;`;
        const pedidoResult = await db.query(pedidoQuery, { id: { type: sql.Int, value: id } });
        const pedido = pedidoResult.recordset[0];

        if (!pedido) {
            return null;
        }

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
 * 
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
        return result.recordset[0];
    } catch (error) {
        console.error(`Error al actualizar estado del pedido ID ${id}:`, error);
        if (error.number === 547 && error.message.includes('CK_PEDIDOS_Estado')) { 
             throw new Error(`El estado '${estado}' no es válido.`);
        }
        throw error;
    }
};


/**
 * Crea un nuevo pedido, sus detalles, registra el pago y actualiza estado a 'pagado'.
 * @param {object} pedidoData - Datos: { mesa_id, cliente_nombre, ..., tipo, items, metodo_pago, estadoOriginal }.
 * estadoOriginal se usa para la inserción inicial antes de marcar como pagado.
 */
const createPedidoConPagoTransaction = async ({
    mesa_id,
    cliente_nombre,
    cliente_telefono,
    cliente_direccion,
    notas,
    tipo,
    items,
    metodo_pago, // Variable que llega con el método de pago seleccionado
    estadoOriginal // Estado inicial del pedido (ej. 'PENDIENTE', 'A CONFIRMAR')
}) => {
    let transaction;
    try {
        transaction = await db.getTransaction();

        // 1. Validar método de pago (el valor que llega en la variable 'metodo_pago')
        if (!METODOS_PAGO_VALIDOS.includes(metodo_pago)) {
            throw new Error(`Valor de método de pago '${metodo_pago}' no es válido. Válidos: ${METODOS_PAGO_VALIDOS.join(', ')}`);
        }

        // 2. Validar productos y almacenar sus precios actuales
        const preciosProductos = {};
        for (const item of items) {
            const productoIdValidado = parseInt(item.producto_id);
            if (isNaN(productoIdValidado) || productoIdValidado <= 0) {
                throw new Error(`Item con producto_id inválido o faltante: ${JSON.stringify(item)}`);
            }
            const prodResult = await db.query(
                'SELECT precio FROM PRODUCTOS WHERE producto_id = @producto_id;',
                { producto_id: { type: sql.Int, value: productoIdValidado } },
                transaction
            );
            if (!prodResult.recordset[0]) {
                throw new Error(`Producto con ID ${productoIdValidado} no encontrado.`);
            }
            preciosProductos[productoIdValidado] = prodResult.recordset[0].precio;
        }

        // 3. Insertar en PEDIDOS (con estadoOriginal y total temporal 0.00)
        const pedidoInsertResult = await db.query(
            `INSERT INTO PEDIDOS (mesa_id, cliente_nombre, cliente_telefono, cliente_direccion, notas, tipo, estado, total)
             OUTPUT INSERTED.pedido_id
             VALUES (@mesa_id, @cliente_nombre, @cliente_telefono, @cliente_direccion, @notas, @tipo, @estado_original_pedido, 0.00);`, // Usar @estado_original_pedido
            {
                mesa_id: { type: sql.Int, value: mesa_id },
                cliente_nombre: { type: sql.NVarChar(150), value: cliente_nombre },
                cliente_telefono: { type: sql.NVarChar(50), value: cliente_telefono },
                cliente_direccion: { type: sql.NVarChar(255), value: cliente_direccion },
                notas: { type: sql.NVarChar(sql.MAX), value: notas },
                tipo: { type: sql.NVarChar(50), value: tipo },
                estado_original_pedido: { type: sql.NVarChar(50), value: estadoOriginal } // Parámetro para estado de PEDIDOS
            },
            transaction
        );
        const nuevoPedidoId = pedidoInsertResult.recordset[0].pedido_id;

        // 4. Insertar en DETALLE_PEDIDO y calcular total
        let totalPedidoCalculado = 0;
        for (const item of items) {
            const productoIdParaDetalle = parseInt(item.producto_id);
            const cantidadParaDetalle = parseInt(item.cantidad);
            const precioUnitario = preciosProductos[productoIdParaDetalle];
            const subtotal = cantidadParaDetalle * parseFloat(precioUnitario);
            totalPedidoCalculado += subtotal;

            await db.query(
                `INSERT INTO DETALLE_PEDIDO (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
                 VALUES (@pedido_id, @producto_id, @cantidad, @precio_unitario, @subtotal);`,
                {
                    pedido_id: { type: sql.Int, value: nuevoPedidoId },
                    producto_id: { type: sql.Int, value: productoIdParaDetalle },
                    cantidad: { type: sql.Int, value: cantidadParaDetalle },
                    precio_unitario: { type: sql.Decimal(10, 2), value: parseFloat(precioUnitario) },
                    subtotal: { type: sql.Decimal(12, 2), value: subtotal }
                },
                transaction
            );
        }

        // 5. Actualizar el total en PEDIDOS
        await db.query(
            'UPDATE PEDIDOS SET total = @total WHERE pedido_id = @pedido_id;',
            {
                total: { type: sql.Decimal(12, 2), value: totalPedidoCalculado },
                pedido_id: { type: sql.Int, value: nuevoPedidoId }
            },
            transaction
        );

        // 6. Insertar en PAGOS (con su propio estado 'COMPLETADO')
        // 
        //    (pago_id, pedido_id, fecha_pago, monto, metodo, estado)
        const estadoDelPagoEnTablaPagos = 'COMPLETADO';
        await db.query(
            `INSERT INTO PAGOS (pedido_id, fecha_pago, monto, metodo, estado)
             VALUES (@pedido_id, GETDATE(), @monto, @valor_variable_metodo_pago, @estado_pago_tabla);`,
            {
                pedido_id: { type: sql.Int, value: nuevoPedidoId },
                // fecha_pago se establece con GETDATE()
                monto: { type: sql.Decimal(12, 2), value: totalPedidoCalculado },
                valor_variable_metodo_pago: { type: sql.NVarChar(50), value: metodo_pago },
                estado_pago_tabla: { type: sql.NVarChar(50), value: estadoDelPagoEnTablaPagos }
            },
            transaction
        );


        // 8. Confirmar transacción
        await db.commitTransaction(transaction);

        // 9. Devolver el pedido completo (con su estadoOriginal)
        return await getPedidoById(nuevoPedidoId);

    } catch (error) {
        console.error('Error en createPedidoConPagoTransaction:', error.message, error.stack);
        if (transaction && transaction._aborted === false && transaction._completed === false ) {
            try { await db.rollbackTransaction(transaction); } catch (rbErr) { console.error("Error durante el rollback:", rbErr); }
        }
        if (error.message.toLowerCase().includes('invalid column name')) {
             throw new Error(`Error de SQL: Nombre de columna inválido. Revisa la definición de la tabla y la consulta. Detalle: ${error.message}`);
        }
        if (error.message.includes('no encontrado') || error.message.includes('inválido')) {
             throw new Error(error.message);
        }
        throw new Error('No se pudo crear el pedido y registrar el pago.');
    }
};


module.exports = {
    getAllPedidos,
    getPedidoById,
    updatePedidoEstado,
    createPedidoConPagoTransaction, 
    METODOS_PAGO_VALIDOS
};