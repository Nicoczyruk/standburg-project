// server/db/queries/pago.queries.js
const db = require('../connection');
const sql = require('mssql');

// Lista de métodos de pago válidos según el CHECK constraint en la DB
const METODOS_PAGO_VALIDOS = ['efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'otro'];

/**
 * Obtiene una lista de pagos con filtros opcionales.
 * @param {object} filters - Objeto con filtros: { pedido_id, turno_id, metodo_pago, fechaInicio, fechaFin }
 */
const getAllPagos = async (filters = {}) => {
    try {
        let queryString = `SELECT * FROM PAGOS WHERE 1=1`;
        const params = {};

        if (filters.pedido_id) {
            queryString += ' AND pedido_id = @pedido_id';
            params.pedido_id = { type: sql.Int, value: filters.pedido_id };
        }
        if (filters.turno_id) {
            queryString += ' AND turno_id = @turno_id';
            params.turno_id = { type: sql.Int, value: filters.turno_id };
        }
        if (filters.metodo_pago && METODOS_PAGO_VALIDOS.includes(filters.metodo_pago)) {
            queryString += ' AND metodo_pago = @metodo_pago';
            params.metodo_pago = { type: sql.VarChar(50), value: filters.metodo_pago };
        }
        // TODO: Añadir filtros de fecha si es necesario

        queryString += ' ORDER BY fecha_hora DESC;';

        const { recordset } = await db.query(queryString, params);
        return recordset;
    } catch (error) {
        console.error('Error al obtener todos los pagos:', error);
        throw error;
    }
};

/**
 * Obtiene un pago específico por su ID.
 * @param {number} id - El ID del pago.
 */
const getPagoById = async (id) => {
    try {
        const { recordset } = await db.query('SELECT * FROM PAGOS WHERE pago_id = @id;', {
             id: { type: sql.Int, value: id }
        });
        return recordset[0];
    } catch (error) {
        console.error(`Error al obtener el pago con ID ${id}:`, error);
        throw error;
    }
};


/**
 * Crea un nuevo pago y actualiza el estado del pedido asociado.
 * @param {object} pagoData - Datos del pago { pedido_id, turno_id (opcional), metodo_pago, monto }.
 */
const createPagoTransaction = async ({ pedido_id, turno_id, metodo_pago, monto }) => {
    let transaction;
    try {
        transaction = await db.getTransaction();

        // 1. Validar que el pedido exista y obtener su total y estado actual
        const pedidoResult = await db.query(
            'SELECT total, estado FROM PEDIDOS WHERE pedido_id = @pedido_id;',
            { pedido_id: { type: sql.Int, value: pedido_id } },
            transaction
        );
        const pedido = pedidoResult.recordset[0];

        if (!pedido) {
            throw new Error(`El pedido con ID ${pedido_id} no existe.`);
        }
        if (pedido.estado === 'pagado') {
             throw new Error(`El pedido con ID ${pedido_id} ya se encuentra pagado.`);
        }
        if (pedido.estado === 'cancelado') {
             throw new Error(`No se puede registrar un pago para un pedido cancelado (ID ${pedido_id}).`);
        }
        // 2. Validar que el monto del pago coincida con el total del pedido
        //    (Convertir a Number para comparación segura, ya que vienen como string a veces)
        if (Number(monto) !== Number(pedido.total)) {
            throw new Error(`El monto del pago (${monto}) no coincide con el total del pedido (${pedido.total}).`);
        }
        // 3. Validar método de pago
        if (!METODOS_PAGO_VALIDOS.includes(metodo_pago)) {
             throw new Error(`Método de pago '${metodo_pago}' no es válido.`);
        }

        // 4. Insertar el pago
        const pagoInsertResult = await db.query(
            `INSERT INTO PAGOS (pedido_id, turno_id, metodo_pago, monto, fecha_hora)
             OUTPUT INSERTED.*
             VALUES (@pedido_id, @turno_id, @metodo_pago, @monto, GETDATE());`,
            {
                pedido_id: { type: sql.Int, value: pedido_id },
                turno_id: { type: sql.Int, value: turno_id }, // Será NULL si turno_id es null/undefined
                metodo_pago: { type: sql.VarChar(50), value: metodo_pago },
                monto: { type: sql.Decimal(10, 2), value: monto }
            },
            transaction
        );
        const nuevoPago = pagoInsertResult.recordset[0];

        // 5. Actualizar el estado del pedido a 'pagado'
        await db.query(
            'UPDATE PEDIDOS SET estado = @estado WHERE pedido_id = @pedido_id;',
            {
                estado: { type: sql.VarChar(20), value: 'pagado' },
                pedido_id: { type: sql.Int, value: pedido_id }
            },
            transaction
        );

        // 6. Confirmar transacción
        await db.commitTransaction(transaction);

        return nuevoPago;

    } catch (error) {
        console.error('Error al crear el pago (transacción):', error.message);
        if (transaction) {
            await db.rollbackTransaction(transaction);
        }
        // Relanzar error para el controlador
        throw new Error(error.message || 'No se pudo registrar el pago.');
    }
};


/**
 * Elimina un pago y revierte el estado del pedido asociado a 'entregado'.
 * @param {number} id - El ID del pago a eliminar.
 */
const deletePagoTransaction = async (id) => {
    let transaction;
    try {
        transaction = await db.getTransaction();

        // 1. Obtener el pago y el pedido_id asociado
        const pagoResult = await db.query('SELECT pedido_id FROM PAGOS WHERE pago_id = @id;', {
            id: { type: sql.Int, value: id } }, transaction);
        const pago = pagoResult.recordset[0];

        if (!pago) {
            throw new Error(`Pago con ID ${id} no encontrado.`);
        }
        const pedido_id = pago.pedido_id;

        // 2. Eliminar el pago
        const deleteResult = await db.query('DELETE FROM PAGOS WHERE pago_id = @id;', {
             id: { type: sql.Int, value: id } }, transaction);

        // Verificar si realmente se borró algo
        if (deleteResult.rowsAffected[0] === 0) {
             throw new Error(`No se encontró el pago con ID ${id} para eliminar (posible condición de carrera).`);
        }

        // 3. Revertir el estado del pedido a 'entregado' (o a 'listo' )
        //    Solo si el pedido todavía existe 
        await db.query(
            `UPDATE PEDIDOS SET estado = 'entregado'
             WHERE pedido_id = @pedido_id AND estado = 'pagado';`, // Solo revertir si estaba 'pagado'
            { pedido_id: { type: sql.Int, value: pedido_id } },
            transaction
        );

        // 4. Confirmar transacción
        await db.commitTransaction(transaction);

        return true; // Indicar éxito

    } catch (error) {
        console.error(`Error al eliminar el pago ID ${id} (transacción):`, error.message);
        if (transaction) {
            await db.rollbackTransaction(transaction);
        }
        throw new Error(error.message || `No se pudo anular el pago con ID ${id}.`);
    }
};


module.exports = {
    getAllPagos,
    getPagoById,
    createPagoTransaction,
    deletePagoTransaction,
    METODOS_PAGO_VALIDOS // Exportar para validación en controlador
};