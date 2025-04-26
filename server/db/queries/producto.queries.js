// server/db/queries/producto.queries.js
const db = require('../connection');
const sql = require('mssql');

const BASE_QUERY_PRODUCTOS = `
    SELECT
        p.producto_id,
        p.nombre,
        p.descripcion,
        p.precio,
        p.categoria_id,
        c.nombre AS categoria_nombre
    FROM PRODUCTOS p
    JOIN CATEGORIA c ON p.categoria_id = c.categoria_id
`;

/**
 * Obtiene todos los productos, opcionalmente filtrados por categoría.
 * Incluye el nombre de la categoría.
 * @param {number|null} categoria_id - ID de la categoría para filtrar (opcional).
 */
const getAllProductos = async (categoria_id = null) => {
    try {
        let queryString = BASE_QUERY_PRODUCTOS;
        const params = {};
        if (categoria_id) {
            queryString += ' WHERE p.categoria_id = @categoria_id';
            params.categoria_id = { type: sql.Int, value: categoria_id };
        }
        queryString += ' ORDER BY c.nombre, p.nombre;'; // Ordenar por categoría y luego producto

        const { recordset } = await db.query(queryString, params);
        return recordset;
    } catch (error) {
        console.error('Error al obtener todos los productos:', error);
        throw error;
    }
};

/**
 * Obtiene un producto específico por su ID.
 * Incluye el nombre de la categoría.
 * @param {number} id - El ID del producto a buscar.
 */
const getProductoById = async (id) => {
    try {
        const queryString = `${BASE_QUERY_PRODUCTOS} WHERE p.producto_id = @id;`;
        const { recordset } = await db.query(queryString, { id: { type: sql.Int, value: id } });
        return recordset[0];
    } catch (error) {
        console.error(`Error al obtener el producto con ID ${id}:`, error);
        throw error;
    }
};

/**
 * Obtiene todos los productos de una categoría específica por ID de categoría.
 * Incluye el nombre de la categoría.
 * @param {number} categoria_id - El ID de la categoría.
 */
const getProductosByCategoriaId = async (categoria_id) => {
    try {
        const queryString = `${BASE_QUERY_PRODUCTOS} WHERE p.categoria_id = @categoria_id ORDER BY p.nombre;`;
        const { recordset } = await db.query(queryString, { categoria_id: { type: sql.Int, value: categoria_id } });
        return recordset;
    } catch (error) {
        console.error(`Error al obtener productos para la categoría ID ${categoria_id}:`, error);
        throw error;
    }
};


/**
 * Crea un nuevo producto.
 * @param {object} productoData - Datos del producto { nombre, descripcion, precio, categoria_id }.
 */
const createProducto = async ({ nombre, descripcion, precio, categoria_id }) => {
    try {
        const result = await db.query(
            `INSERT INTO PRODUCTOS (nombre, descripcion, precio, categoria_id)
             OUTPUT INSERTED.producto_id, INSERTED.nombre, INSERTED.descripcion, INSERTED.precio, INSERTED.categoria_id
             VALUES (@nombre, @descripcion, @precio, @categoria_id);`,
            {
                nombre: { type: sql.VarChar(100), value: nombre },
                descripcion: { type: sql.VarChar(255), value: descripcion },
                precio: { type: sql.Decimal(10, 2), value: precio },
                categoria_id: { type: sql.Int, value: categoria_id }
            }
        );
        // Para devolver también el nombre de la categoría, necesitamos hacer otra consulta
        const nuevoProducto = result.recordset[0];
        if (nuevoProducto) {
             const productoCompleto = await getProductoById(nuevoProducto.producto_id);
             return productoCompleto;
        }
       return null; // O manejar el error si no se insertó nada
    } catch (error) {
        console.error('Error al crear el producto:', error);
         // Manejar error de FK si categoria_id no existe
        if (error.number === 547) {
            throw new Error(`La categoría con ID ${categoria_id} no existe.`);
        }
        throw error;
    }
};

/**
 * Actualiza un producto existente por su ID.
 * @param {number} id - El ID del producto a actualizar.
 * @param {object} productoData - Datos del producto { nombre, descripcion, precio, categoria_id }.
 */
const updateProducto = async (id, { nombre, descripcion, precio, categoria_id }) => {
    try {
        const result = await db.query(
            `UPDATE PRODUCTOS
             SET nombre = @nombre, descripcion = @descripcion, precio = @precio, categoria_id = @categoria_id
             OUTPUT INSERTED.producto_id
             WHERE producto_id = @id;`,
            {
                id: { type: sql.Int, value: id },
                nombre: { type: sql.VarChar(100), value: nombre },
                descripcion: { type: sql.VarChar(255), value: descripcion },
                precio: { type: sql.Decimal(10, 2), value: precio },
                categoria_id: { type: sql.Int, value: categoria_id }
            }
        );
         // Verificar si se actualizó algo y devolver el producto actualizado completo
        if (result.recordset && result.recordset.length > 0) {
            const productoActualizado = await getProductoById(id);
            return productoActualizado;
        }
        return null; // No se encontró el producto para actualizar
    } catch (error) {
        console.error(`Error al actualizar el producto con ID ${id}:`, error);
         // Manejar error de FK si categoria_id no existe
        if (error.number === 547) {
             throw new Error(`La categoría con ID ${categoria_id} no existe.`);
        }
        throw error;
    }
};

/**
 * Elimina un producto por su ID.
 * @param {number} id - El ID del producto a eliminar.
 */
const deleteProducto = async (id) => {
    try {
        const result = await db.query(
            'DELETE FROM PRODUCTOS OUTPUT DELETED.producto_id WHERE producto_id = @id;',
            { id: { type: sql.Int, value: id } }
        );
        return result.rowsAffected[0] > 0; // Devuelve true si se eliminó, false si no
    } catch (error) {
        console.error(`Error al eliminar el producto con ID ${id}:`, error);
        // Manejar error de FK si el producto está en DETALLE_PEDIDO
        if (error.number === 547) {
            throw new Error('No se puede eliminar el producto porque está asociado a pedidos existentes.');
        }
        throw error;
    }
};

module.exports = {
    getAllProductos,
    getProductoById,
    getProductosByCategoriaId, 
    createProducto,
    updateProducto,
    deleteProducto,
};