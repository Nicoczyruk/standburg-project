// server/controllers/producto.controller.js
const productoQueries = require('../db/queries/producto.queries');

// Obtener todos los productos 
const obtenerTodosLosProductos = async (req, res, next) => {
    const { categoria_id } = req.query; // Obtener el filtro de la query string ?categoria_id=X
    let categoriaIdInt = null;

    if (categoria_id) {
        categoriaIdInt = parseInt(categoria_id);
        if (!Number.isInteger(categoriaIdInt) || categoriaIdInt <= 0) {
             return res.status(400).json({ message: 'ID de categoría inválido en el filtro.' });
        }
    }

    try {
        const productos = await productoQueries.getAllProductos(categoriaIdInt);
        res.json(productos || []);
    } catch (error) {
        next(error);
    }
};

// Obtener un producto por ID de parámetro de ruta
const obtenerProductoPorId = async (req, res, next) => {
    const { id } = req.params;
    const productoIdInt = parseInt(id);

    if (!Number.isInteger(productoIdInt) || productoIdInt <= 0) {
        return res.status(400).json({ message: 'ID de producto inválido.' });
    }

    try {
        const producto = await productoQueries.getProductoById(productoIdInt);
        if (!producto) {
            return res.status(404).json({ message: `Producto con ID ${id} no encontrado.` });
        }
        res.json(producto);
    } catch (error) {
        next(error);
    }
};

// Obtener productos por ID de categoría (para la ruta /api/categorias/:categoria_id/productos)
const obtenerProductosPorCategoria = async (req, res, next) => {
    const { categoria_id } = req.params; // Obtener el ID de los parámetros de la ruta
    const categoriaIdInt = parseInt(categoria_id);

    if (!Number.isInteger(categoriaIdInt) || categoriaIdInt <= 0) {
         return res.status(400).json({ message: 'ID de categoría inválido.' });
    }

    try {
        const productos = await productoQueries.getProductosByCategoriaId(categoriaIdInt);
        // Es normal que una categoría no tenga productos, devolver array vacío como respuesta MANEJAR
        res.json(productos || []);
    } catch (error) {
        next(error);
    }
};


const crearProducto = async (req, res, next) => {
    // 'costo' eliminado. 'disponible' no se gestiona aquí según tu última directiva.
    const { nombre, descripcion, precio, categoria_id, imagen_url } = req.body; //

    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') { //
        return res.status(400).json({ message: 'El campo "nombre" es obligatorio.' }); //
    }
    if (precio === undefined || isNaN(parseFloat(precio)) || parseFloat(precio) < 0) { //
        return res.status(400).json({ message: 'El campo "precio" es obligatorio y debe ser un número no negativo.' }); //
    }
    if (!categoria_id || isNaN(parseInt(categoria_id)) || parseInt(categoria_id) <= 0) { //
        return res.status(400).json({ message: 'El campo "categoria_id" es obligatorio y debe ser un ID válido.' }); //
    }

    const productoData = {
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null, //
        precio: parseFloat(precio),
        categoria_id: parseInt(categoria_id),
        imagen_url: imagen_url ? imagen_url.trim() : null,
        // 'disponible' no se envía desde el frontend aquí; la BD debe tener un default o el backend manejarlo.
    };

    try {
        const nuevoProducto = await productoQueries.createProducto(productoData); //
        if (!nuevoProducto) { //
            return res.status(400).json({ message: 'No se pudo crear el producto, verifique los datos (ej. categoría ID podría no existir).' });
        }
        res.status(201).json(nuevoProducto); //
    } catch (error) {
        if (error.message.includes('categoría con ID') && error.message.includes('no existe')) { //
            return res.status(400).json({ message: error.message }); //
        }
        console.error('Error en crearProducto controller:', error);
        next(error); //
    }
};

const actualizarProducto = async (req, res, next) => {
    const { id } = req.params; //
    // 'costo' eliminado. 'disponible' no se gestiona aquí.
    const { nombre, descripcion, precio, categoria_id, imagen_url } = req.body; //
    const productoIdInt = parseInt(id); //

    if (!Number.isInteger(productoIdInt) || productoIdInt <= 0) { //
        return res.status(400).json({ message: 'ID de producto inválido.' }); //
    }
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') { //
        return res.status(400).json({ message: 'El campo "nombre" es obligatorio.' }); //
    }
    if (precio === undefined || isNaN(parseFloat(precio)) || parseFloat(precio) < 0) { //
        return res.status(400).json({ message: 'El campo "precio" es obligatorio y debe ser un número no negativo.' }); //
    }
    if (!categoria_id || isNaN(parseInt(categoria_id)) || parseInt(categoria_id) <= 0) { //
        return res.status(400).json({ message: 'El campo "categoria_id" es obligatorio y debe ser un ID válido.' }); //
    }

    const productoData = {
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null, //
        precio: parseFloat(precio),
        categoria_id: parseInt(categoria_id),
        imagen_url: imagen_url ? imagen_url.trim() : null,
        // 'disponible' no se actualiza desde aquí.
    };

    try {
        const productoActualizado = await productoQueries.updateProducto(productoIdInt, productoData); //
        if (!productoActualizado) { //
            return res.status(404).json({ message: `Producto con ID ${id} no encontrado o datos inválidos.` }); //
        }
        res.json(productoActualizado); //
    } catch (error) {
        if (error.message.includes('categoría con ID') && error.message.includes('no existe')) { //
            return res.status(400).json({ message: error.message }); //
        }
        console.error('Error en actualizarProducto controller:', error);
        next(error); //
    }
};

// Eliminar un producto
const eliminarProducto = async (req, res, next) => {
    const { id } = req.params;
    const productoIdInt = parseInt(id);

     if (!Number.isInteger(productoIdInt) || productoIdInt <= 0) {
        return res.status(400).json({ message: 'ID de producto inválido.' });
    }

    try {
        const fueEliminado = await productoQueries.deleteProducto(productoIdInt);
        if (!fueEliminado) {
            return res.status(404).json({ message: `Producto con ID ${id} no encontrado.` });
        }
        res.status(204).send(); // 204 No Content
    } catch (error) {
        // Si el error viene de la query por FK constraint (producto en pedidos)
        if (error.message.includes('pedidos existentes')) {
             return res.status(409).json({ message: error.message }); // 409 Conflict
        }
        next(error);
    }
};

module.exports = {
    obtenerTodosLosProductos,
    obtenerProductoPorId,
    obtenerProductosPorCategoria, 
    crearProducto,
    actualizarProducto,
    eliminarProducto,
};