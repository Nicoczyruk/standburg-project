// server/db/queries/gasto.queries.js
const db = require('../connection');
const sql = require('mssql');

const TIPOS_GASTO_VALIDOS = ['fijo', 'variable', 'cuenta corriente']; // Para validación

/**
 * Obtiene todos los gastos, opcionalmente filtrados.
 */
const getAllGastos = async (filters = {}) => {
    try {
        let queryString = `
            SELECT
                g.gasto_id,
                g.tipo_gasto,
                g.concepto,
                g.monto,
                g.fecha_gasto
                -- Si añades FKs en GASTOS para turno_id o admin_id_registro, puedes descomentar:
                -- t.turno_id AS gasto_turno_id, t.fecha_hora_apertura AS turno_fecha_apertura,
                -- a.admin_id AS gasto_admin_id_registro, a.nombre_usuario AS admin_nombre_registro
            FROM GASTOS g
            -- Los siguientes JOINs solo serán útiles si GASTOS tiene las FKs correspondientes.
            -- LEFT JOIN TURNOS t ON g.turno_id = t.turno_id  -- Asumiendo que GASTOS tuviera turno_id
            -- LEFT JOIN ADMIN a ON g.admin_id_registro = a.admin_id -- Asumiendo que GASTOS tuviera admin_id_registro
            WHERE 1=1`;
        const params = {};

        if (filters.tipo_gasto && TIPOS_GASTO_VALIDOS.includes(filters.tipo_gasto)) {
            queryString += ' AND g.tipo_gasto = @tipo_gasto';
            params.tipo_gasto = { type: sql.NVarChar(50), value: filters.tipo_gasto };
        }
        if (filters.fechaInicio) {
            queryString += ' AND g.fecha_gasto >= @fechaInicio';
            params.fechaInicio = { type: sql.DateTime2, value: filters.fechaInicio };
        }
        if (filters.fechaFin) {
            queryString += ' AND g.fecha_gasto <= @fechaFin';
            params.fechaFin = { type: sql.DateTime2, value: filters.fechaFin };
        }
        // Puedes añadir más filtros según necesites

        queryString += ' ORDER BY g.fecha_gasto DESC, g.gasto_id DESC;';

        const { recordset } = await db.query(queryString, params);
        return recordset;
    } catch (error) {
        console.error('Error al obtener todos los gastos:', error);
        throw error;
    }
};

/**
 * Obtiene un gasto específico por su ID.
 */
const getGastoById = async (id) => {
    try {
        const queryString = `
            SELECT
                g.gasto_id,
                g.tipo_gasto,
                g.concepto,
                g.monto,
                g.fecha_gasto
                -- Ver notas en getAllGastos sobre JOINs y columnas opcionales
            FROM GASTOS g
            WHERE g.gasto_id = @id;`;
        const { recordset } = await db.query(queryString, { id: { type: sql.Int, value: id } });
        return recordset[0];
    } catch (error) {
        console.error(`Error al obtener el gasto con ID ${id}:`, error);
        throw error;
    }
};

/**
 * Crea un nuevo gasto.
 * 
 * 
 * @param {object} gastoData - Datos del gasto { tipo_gasto, concepto, monto }.
 */
const createGasto = async ({ tipo_gasto, concepto, monto }) => {
    try {
        // La fecha_gasto usará el DEFAULT GETDATE()
        const result = await db.query(
            `INSERT INTO GASTOS (tipo_gasto, concepto, monto)
             OUTPUT INSERTED.* VALUES (@tipo_gasto, @concepto, @monto);`,
            {
                tipo_gasto: { type: sql.NVarChar(50), value: tipo_gasto },
                concepto: { type: sql.NVarChar(255), value: concepto },
                monto: { type: sql.Decimal(12, 2), value: monto }
            }
        );
        const nuevoGasto = result.recordset[0];
        if (nuevoGasto) {
            
            return await getGastoById(nuevoGasto.gasto_id);
        }
        return null;
    } catch (error) {
        console.error('Error al crear el gasto:', error);
        if (error.number === 547) { // Error de FK o CHECK
            if (error.message.includes('CK_GASTOS_TipoGasto')) {
                throw new Error(`Tipo de gasto '${tipo_gasto}' inválido. Permitidos: ${TIPOS_GASTO_VALIDOS.join(', ')}`);
            }
             if (error.message.includes('CK_GASTOS_MontoPositivo')) {
                throw new Error(`El monto del gasto debe ser positivo.`);
            }
        }
        throw error;
    }
};

/**
 * Actualiza un gasto existente.
 
 * @param {number} id - ID del gasto a actualizar.
 * @param {object} gastoData - Datos a actualizar { tipo_gasto, concepto, monto }.
 */
const updateGasto = async (id, { tipo_gasto, concepto, monto }) => {
    try {
        const result = await db.query(
            `UPDATE GASTOS SET
                tipo_gasto = @tipo_gasto,
                concepto = @concepto,
                monto = @monto
                -- No actualizamos fecha_gasto usualmente, a menos que sea un campo editable
             OUTPUT INSERTED.*
             WHERE gasto_id = @id;`,
            {
                id: { type: sql.Int, value: id },
                tipo_gasto: { type: sql.NVarChar(50), value: tipo_gasto },
                concepto: { type: sql.NVarChar(255), value: concepto },
                monto: { type: sql.Decimal(12, 2), value: monto }
            }
        );
        if (result.recordset && result.recordset.length > 0) {
            return await getGastoById(id);
        }
        return null; // No se encontró para actualizar
    } catch (error) {
        console.error(`Error al actualizar el gasto con ID ${id}:`, error);
         if (error.number === 547) { // Error de FK o CHECK
            if (error.message.includes('CK_GASTOS_TipoGasto')) {
                throw new Error(`Tipo de gasto '${tipo_gasto}' inválido. Permitidos: ${TIPOS_GASTO_VALIDOS.join(', ')}`);
            }
             if (error.message.includes('CK_GASTOS_MontoPositivo')) {
                throw new Error(`El monto del gasto debe ser positivo.`);
            }
        }
        throw error;
    }
};

/**
 * Elimina un gasto.
 * @param {number} id - ID del gasto a eliminar.
 */
const deleteGasto = async (id) => {
    try {
        const result = await db.query(
            'DELETE FROM GASTOS OUTPUT DELETED.gasto_id WHERE gasto_id = @id;',
            { id: { type: sql.Int, value: id } }
        );
        return result.rowsAffected[0] > 0;
    } catch (error) {
        console.error(`Error al eliminar el gasto con ID ${id}:`, error);
        throw error;
    }
};

module.exports = {
    TIPOS_GASTO_VALIDOS,
    getAllGastos,
    getGastoById,
    createGasto,
    updateGasto,
    deleteGasto,
};