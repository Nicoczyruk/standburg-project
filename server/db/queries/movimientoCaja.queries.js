// server/db/queries/movimientoCaja.queries.js
const db = require('../connection');
const sql = require('mssql');

const TIPOS_MOVIMIENTO_VALIDOS = ['INGRESO', 'EGRESO'];

/**
 * Crea un nuevo movimiento de caja.
 * @param {object} movimientoData - Datos del movimiento.
 * { fecha_hora_movimiento (opcional, default GETDATE), tipo_movimiento, descripcion, monto, metodo_pago_afectado (opcional), arqueo_id (opcional) }
 */
const createMovimientoCaja = async ({
    fecha_hora_movimiento, // Puede ser omitido para usar GETDATE()
    tipo_movimiento,
    descripcion,
    monto,
    metodo_pago_afectado, // ej: 'efectivo', 'banco_x', etc. Puede ser NULL.
    arqueo_id // Puede ser NULL si el movimiento no ocurre durante un arqueo activo.
}) => {
    try {
        const result = await db.query(
            `INSERT INTO MOVIMIENTOS_CAJA (fecha_hora_movimiento, tipo_movimiento, descripcion, monto, metodo_pago_afectado, arqueo_id)
             OUTPUT INSERTED.*
             VALUES (@fecha_hora_movimiento, @tipo_movimiento, @descripcion, @monto, @metodo_pago_afectado, @arqueo_id);`,
            {
                fecha_hora_movimiento: { type: sql.DateTime2, value: fecha_hora_movimiento || new Date() }, // Default a ahora si no se provee
                tipo_movimiento: { type: sql.NVarChar(50), value: tipo_movimiento },
                descripcion: { type: sql.NVarChar(255), value: descripcion },
                monto: { type: sql.Decimal(12, 2), value: monto },
                metodo_pago_afectado: { type: sql.NVarChar(50), value: metodo_pago_afectado },
                arqueo_id: { type: sql.Int, value: arqueo_id }
            }
        );
        return result.recordset[0];
    } catch (error) {
        console.error('Error al crear movimiento de caja:', error);
        if (error.number === 547) { // Error de FK o CHECK
            if (error.message.includes('CK_MOVIMIENTOS_CAJA_Tipo')) {
                throw new Error(`Tipo de movimiento '${tipo_movimiento}' inválido. Permitidos: ${TIPOS_MOVIMIENTO_VALIDOS.join(', ')}`);
            }
            if (error.message.includes('CK_MOVIMIENTOS_CAJA_MontoPositivo')) {
                throw new Error(`El monto del movimiento debe ser positivo.`);
            }
            if (error.message.includes('FK_MOVIMIENTOS_CAJA_ARQUEOS') && arqueo_id) {
                throw new Error(`El arqueo_id ${arqueo_id} no existe.`);
            }
        }
        throw error;
    }
};

/**
 * Obtiene todos los movimientos de caja, opcionalmente filtrados.
 * @param {object} filters - { fecha_desde, fecha_hasta, tipo_movimiento, arqueo_id }
 */
const getAllMovimientosCaja = async (filters = {}) => {
    try {
        let queryString = `
            SELECT 
                movimiento_id, fecha_hora_movimiento, tipo_movimiento, 
                descripcion, monto, metodo_pago_afectado, arqueo_id
                -- ,a.nombre_usuario AS admin_nombre -- Si añades admin_id y JOIN con ADMIN
            FROM MOVIMIENTOS_CAJA mc
            -- LEFT JOIN ADMIN a ON mc.admin_id = a.admin_id -- Si tuvieras admin_id
            WHERE 1=1`;
        const params = {};

        if (filters.fecha_desde) {
            queryString += ' AND mc.fecha_hora_movimiento >= @fecha_desde';
            params.fecha_desde = { type: sql.DateTime2, value: filters.fecha_desde };
        }
        if (filters.fecha_hasta) {
            queryString += ' AND mc.fecha_hora_movimiento <= @fecha_hasta';
            params.fecha_hasta = { type: sql.DateTime2, value: filters.fecha_hasta };
        }
        if (filters.tipo_movimiento && TIPOS_MOVIMIENTO_VALIDOS.includes(filters.tipo_movimiento)) {
            queryString += ' AND mc.tipo_movimiento = @tipo_movimiento';
            params.tipo_movimiento = { type: sql.NVarChar(50), value: filters.tipo_movimiento };
        }
        if (filters.arqueo_id) {
            queryString += ' AND mc.arqueo_id = @arqueo_id';
            params.arqueo_id = { type: sql.Int, value: filters.arqueo_id };
        }

        queryString += ' ORDER BY mc.fecha_hora_movimiento DESC, mc.movimiento_id DESC;';

        const { recordset } = await db.query(queryString, params);
        return recordset;
    } catch (error) {
        console.error('Error al obtener movimientos de caja:', error);
        throw error;
    }
};

/**
 * Obtiene un movimiento de caja por su ID.
 * @param {number} id
 */
const getMovimientoCajaById = async (id) => {
    try {
        const queryString = `
            SELECT 
                movimiento_id, fecha_hora_movimiento, tipo_movimiento, 
                descripcion, monto, metodo_pago_afectado, arqueo_id
            FROM MOVIMIENTOS_CAJA
            WHERE movimiento_id = @id;`;
        const { recordset } = await db.query(queryString, { id: { type: sql.Int, value: id } });
        return recordset[0];
    } catch (error) {
        console.error(`Error al obtener movimiento de caja con ID ${id}:`, error);
        throw error;
    }
};

// Podrías añadir funciones de update y delete si el frontend las requiere.

module.exports = {
    createMovimientoCaja,
    getAllMovimientosCaja,
    getMovimientoCajaById,
    TIPOS_MOVIMIENTO_VALIDOS
};