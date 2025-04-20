// server/db/queries/mesa.queries.js
const db = require('../connection');
const sql = require('mssql');

/**
 * Obtiene todas las mesas ordenadas por número.
 */
const getAllMesas = async () => {
    try {
        const { recordset } = await db.query('SELECT * FROM MESAS ORDER BY numero_mesa;');
        return recordset;
    } catch (error) {
        console.error('Error al obtener todas las mesas:', error);
        throw error;
    }
};

/**
 * Obtiene una mesa específica por su ID.
 * @param {number} id - El ID de la mesa a buscar.
 */
const getMesaById = async (id) => {
    try {
        const { recordset } = await db.query('SELECT * FROM MESAS WHERE mesa_id = @id;', {
             id: { type: sql.Int, value: id }
        });
        return recordset[0];
    } catch (error) {
        console.error(`Error al obtener la mesa con ID ${id}:`, error);
        throw error;
    }
};

/**
 * Crea una nueva mesa.
 * @param {object} mesaData - Datos de la mesa { numero_mesa, capacidad, estado }.
 */
const createMesa = async ({ numero_mesa, capacidad, estado }) => {
    try {
        // Usar valores por defecto si no se proporcionan capacidad o estado
        const cap = capacidad !== undefined ? capacidad : 4; // Default SQL es 4
        const est = estado !== undefined ? estado : 'libre'; // Default SQL es 'libre'

        const result = await db.query(
            `INSERT INTO MESAS (numero_mesa, capacidad, estado)
             OUTPUT INSERTED.mesa_id, INSERTED.numero_mesa, INSERTED.capacidad, INSERTED.estado
             VALUES (@numero_mesa, @capacidad, @estado);`,
            {
                numero_mesa: { type: sql.Int, value: numero_mesa },
                capacidad: { type: sql.Int, value: cap },
                estado: { type: sql.VarChar(20), value: est }
            }
        );
        return result.recordset[0];
    } catch (error) {
        console.error('Error al crear la mesa:', error);
        // Manejar error de constraint UNIQUE en numero_mesa
        if (error.number === 2627 || error.number === 2601) { // Códigos de error para UNIQUE constraint violation
            throw new Error(`El número de mesa ${numero_mesa} ya existe.`);
        }
         // Manejar error de CHECK constraint en estado (aunque validamos antes)
        if (error.number === 547 && error.message.includes('CK__MESAS__estado')) {
             throw new Error(`El estado '${estado}' no es válido.`);
        }
        throw error;
    }
};

/**
 * Actualiza una mesa existente por su ID.
 * @param {number} id - El ID de la mesa a actualizar.
 * @param {object} mesaData - Datos de la mesa { numero_mesa, capacidad, estado }.
 */
const updateMesa = async (id, { numero_mesa, capacidad, estado }) => {
    try {
        const result = await db.query(
            `UPDATE MESAS
             SET numero_mesa = @numero_mesa, capacidad = @capacidad, estado = @estado
             OUTPUT INSERTED.mesa_id, INSERTED.numero_mesa, INSERTED.capacidad, INSERTED.estado
             WHERE mesa_id = @id;`,
            {
                id: { type: sql.Int, value: id },
                numero_mesa: { type: sql.Int, value: numero_mesa },
                capacidad: { type: sql.Int, value: capacidad },
                estado: { type: sql.VarChar(20), value: estado }
            }
        );
        return result.recordset[0]; // Devuelve la mesa actualizada si se encontró
    } catch (error) {
        console.error(`Error al actualizar la mesa con ID ${id}:`, error);
        // Manejar error de constraint UNIQUE en numero_mesa
        if (error.number === 2627 || error.number === 2601) {
            throw new Error(`El número de mesa ${numero_mesa} ya existe.`);
        }
         // Manejar error de CHECK constraint en estado (aunque validamos antes)
        if (error.number === 547 && error.message.includes('CK__MESAS__estado')) {
             throw new Error(`El estado '${estado}' no es válido.`);
        }
        throw error;
    }
};

/**
 * Elimina una mesa por su ID.
 * Nota: La FK en PEDIDOS tiene ON DELETE SET NULL, por lo que borrar la mesa
 * dejará pedidos existentes sin mesa_id. Considerar si esto es deseable.
 * @param {number} id - El ID de la mesa a eliminar.
 */
const deleteMesa = async (id) => {
    try {
        const result = await db.query('DELETE FROM MESAS OUTPUT DELETED.mesa_id WHERE mesa_id = @id;', {
             id: { type: sql.Int, value: id }
        });
        return result.rowsAffected[0] > 0;
    } catch (error) {
        console.error(`Error al eliminar la mesa con ID ${id}:`, error);
        // Aunque la FK permite borrar, podría haber otros errores inesperados.
        throw error;
    }
};

module.exports = {
    getAllMesas,
    getMesaById,
    createMesa,
    updateMesa,
    deleteMesa,
};