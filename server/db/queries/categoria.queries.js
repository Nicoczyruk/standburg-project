// server/db/queries/categoria.queries.js
const db = require('../connection'); // Importa el helper de conexión y query
const sql = require('mssql'); // Necesario para tipos de datos (VARCHAR, INT, etc.)

/**
 * Obtiene todas las categorías de la base de datos.
 */
const getAllCategorias = async () => {
    try {
        const { recordset } = await db.query('SELECT * FROM CATEGORIA ORDER BY nombre;');
        return recordset;
    } catch (error) {
        console.error('Error al obtener todas las categorías:', error);
        throw error; // Relanzamos para manejo en el controlador
    }
};

/**
 * Obtiene una categoría específica por su ID.
 * @param {number} id El ID de la categoría a buscar.
 */
const getCategoriaById = async (id) => {
    try {
        // Usamos parámetros para seguridad
        const { recordset } = await db.query('SELECT * FROM CATEGORIA WHERE categoria_id = @id;', { id: { type: sql.Int, value: id } });
        return recordset[0]; // Devuelve el primer (y único) resultado o undefined
    } catch (error) {
        console.error(`Error al obtener la categoría con ID ${id}:`, error);
        throw error;
    }
};

/**
 * Crea una nueva categoría en la base de datos.
 * @param {string} nombre El nombre de la nueva categoría.
 * @param {string|null} descripcion La descripción opcional de la categoría.
 */
const createCategoria = async (nombre, descripcion) => {
    try {
        const result = await db.query(
            'INSERT INTO CATEGORIA (nombre, descripcion) OUTPUT INSERTED.categoria_id, INSERTED.nombre, INSERTED.descripcion VALUES (@nombre, @descripcion);',
            {
                nombre: { type: sql.VarChar(50), value: nombre },
                descripcion: { type: sql.VarChar(255), value: descripcion }
            }
        );
        return result.recordset[0]; // Devuelve la categoría recién creada
    } catch (error) {
        console.error('Error al crear la categoría:', error);
        throw error;
    }
};

/**
 * Actualiza una categoría existente por su ID.
 * @param {number} id El ID de la categoría a actualizar.
 * @param {string} nombre El nuevo nombre de la categoría.
 * @param {string|null} descripcion La nueva descripción opcional.
 */
const updateCategoria = async (id, nombre, descripcion) => {
    try {
        const result = await db.query(
            'UPDATE CATEGORIA SET nombre = @nombre, descripcion = @descripcion OUTPUT INSERTED.categoria_id, INSERTED.nombre, INSERTED.descripcion WHERE categoria_id = @id;',
            {
                id: { type: sql.Int, value: id },
                nombre: { type: sql.VarChar(50), value: nombre },
                descripcion: { type: sql.VarChar(255), value: descripcion }
            }
        );
        // OUTPUT INSERTED devuelve la fila actualizada si la actualización fue exitosa
        return result.recordset[0];
    } catch (error) {
        console.error(`Error al actualizar la categoría con ID ${id}:`, error);
        throw error;
    }
};

/**
 * Elimina una categoría por su ID.
 * @param {number} id El ID de la categoría a eliminar.
 */
const deleteCategoria = async (id) => {
    try {
        // OUTPUT DELETED devuelve la fila eliminada si la eliminación fue exitosa
        const result = await db.query('DELETE FROM CATEGORIA OUTPUT DELETED.categoria_id WHERE categoria_id = @id;', { id: { type: sql.Int, value: id } });
        // rowsAffected indica cuántas filas se eliminaron
        return result.rowsAffected[0] > 0; // Devuelve true si se eliminó algo, false si no
    } catch (error) {
        console.error(`Error al eliminar la categoría con ID ${id}:`, error);
        // Manejar errores específicos de FK constraint si es necesario
        if (error.number === 547) { // Código de error típico para FK constraint violation en SQL Server
            throw new Error('No se puede eliminar la categoría porque tiene productos asociados.');
        }
        throw error;
    }
};

module.exports = {
    getAllCategorias,
    getCategoriaById,
    createCategoria,
    updateCategoria,
    deleteCategoria,
};