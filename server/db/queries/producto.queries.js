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
        c.nombre AS categoria_nombre,
        p.imagen_url
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
const getProductoById = async (id) => { //
    try {
        const query = `
            SELECT
                p.producto_id, p.nombre, p.descripcion, p.precio,
                p.imagen_url,
                p.categoria_id, c.nombre AS categoria_nombre,
                p.disponible      -- Aseguramos que se seleccione 'disponible'
            FROM PRODUCTOS p
            JOIN CATEGORIA c ON p.categoria_id = c.categoria_id
            WHERE p.producto_id = @id;
        `;
        const { recordset } = await db.query(query, { id: { type: sql.Int, value: id } }); //
        return recordset[0]; //
    } catch (error) {
        console.error(`Error al obtener el producto con ID ${id}:`, error); //
        throw error; //
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
// Modificar createProducto para no incluir costo y sí imagen_url
const createProducto = async (productoData) => { //
    const { nombre, descripcion, precio, categoria_id, imagen_url } = productoData;

    // Validación (disponible no se espera de productoData, se confía en default de BD)
    if (!nombre || precio === undefined || categoria_id === undefined ) {
        throw new Error('Nombre, precio y categoría son requeridos para crear un producto.');
    }

    try {
        // INSERT sin 'disponible' (confiando en default de BD), OUTPUT solo producto_id
        const resultInsert = await db.query(
            `INSERT INTO PRODUCTOS (nombre, descripcion, precio, categoria_id, imagen_url)
             OUTPUT INSERTED.producto_id
             VALUES (@nombre, @descripcion, @precio, @categoria_id, @imagen_url);`,
            {
                nombre: { type: sql.NVarChar, value: nombre },
                descripcion: { type: sql.NVarChar, value: descripcion },
                precio: { type: sql.Decimal(10, 2), value: precio },
                categoria_id: { type: sql.Int, value: categoria_id },
                imagen_url: { type: sql.NVarChar, value: imagen_url }
            }
        );

        if (resultInsert.recordset && resultInsert.recordset.length > 0) {
            const nuevoProductoId = resultInsert.recordset[0].producto_id;
            // Llamar a getProductoById para obtener el producto completo con categoria_nombre y disponible
            return await getProductoById(nuevoProductoId);
        }
        return null; // O manejar error si no se pudo obtener el ID
    } catch (error) {
        console.error('Error al crear el producto:', error); //
        if (error.number === 547) { // Error de FK constraint para categoria_id
            throw new Error(`La categoría con ID ${categoria_id} no existe o hay otro problema de FK.`);
        }
        // Si hay un error porque 'disponible' es NOT NULL y no tiene default en la BD,
        // se manifestará aquí como un error de SQL Server (ej: error 515).
        throw error; //
    }
};

/**
 * Actualiza un producto existente por su ID.
 * @param {number} id - El ID del producto a actualizar.
 * @param {object} productoData - Datos del producto { nombre, descripcion, precio, categoria_id }.
 */
const updateProducto = async (id, productoData) => { //
    const { nombre, descripcion, precio, categoria_id, imagen_url } = productoData;

    
    if (!nombre || precio === undefined || categoria_id === undefined) {
        throw new Error('Nombre, precio y categoría son requeridos para actualizar un producto.');
    }

    try {
        const result = await db.query(
            `UPDATE PRODUCTOS
             SET nombre = @nombre, descripcion = @descripcion, precio = @precio,
                 categoria_id = @categoria_id, imagen_url = @imagen_url
             OUTPUT INSERTED.producto_id
             WHERE producto_id = @id;`,
            {
                id: { type: sql.Int, value: id },
                nombre: { type: sql.NVarChar, value: nombre },
                descripcion: { type: sql.NVarChar, value: descripcion },
                precio: { type: sql.Decimal(10, 2), value: precio },
                categoria_id: { type: sql.Int, value: categoria_id },
                imagen_url: { type: sql.NVarChar, value: imagen_url }
                
            }
        );

        if (result.recordset && result.recordset.length > 0) { //
            return await getProductoById(id); // Llama a getProductoById para devolver el producto actualizado
        }
        return null; //
    } catch (error) {
        console.error(`Error al actualizar el producto con ID ${id}:`, error); //
        if (error.number === 547) { //
             throw new Error(`La categoría con ID ${categoria_id} no existe.`); //
        }
        throw error; //
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