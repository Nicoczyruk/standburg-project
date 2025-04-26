// server/controllers/producto.controller.js
const productoQueries = require('../db/queries/producto.queries');

// Obtener todos los productos (opcionalmente filtrados por categoría vía query param, VER QUERY)
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
        // Opcional: verificar si la categoría existe antes de buscar productos
        // const categoria = await require('../db/queries/categoria.queries').getCategoriaById(categoriaIdInt);
        // if (!categoria) {
        //     return res.status(404).json({ message: `Categoría con ID ${categoria_id} no encontrada.` });
        // }

        const productos = await productoQueries.getProductosByCategoriaId(categoriaIdInt);
        // Es normal que una categoría no tenga productos, devolver array vacío como respuesta MANEJAR
        res.json(productos || []);
    } catch (error) {
        next(error);
    }
};


// Crear un nuevo producto
const crearProducto = async (req, res, next) => {
    const { nombre, descripcion, precio, categoria_id } = req.body;

    // TODO: Añadir validación más robusta (express-validator)
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
        return res.status(400).json({ message: 'El campo "nombre" es obligatorio.' });
    }
    if (precio === undefined || typeof parseFloat(precio) !== 'number' || parseFloat(precio) < 0) {
         return res.status(400).json({ message: 'El campo "precio" es obligatorio y debe ser un número no negativo.' });
    }
    if (!categoria_id || !Number.isInteger(parseInt(categoria_id)) || parseInt(categoria_id) <= 0) {
         return res.status(400).json({ message: 'El campo "categoria_id" es obligatorio y debe ser un ID válido.' });
    }

    const productoData = {
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        precio: parseFloat(precio),
        categoria_id: parseInt(categoria_id)
    };

    try {
        const nuevoProducto = await productoQueries.createProducto(productoData);
         if (!nuevoProducto) {
             // Podría ocurrir si la categoría no existe y la FK falla, aunque lo manejamos en la query
             return res.status(400).json({ message: 'No se pudo crear el producto, verifique los datos.' });
         }
        res.status(201).json(nuevoProducto);
    } catch (error) {
         // Si el error viene de la query por FK constraint (categoría inexistente)
        if (error.message.includes('categoría con ID') && error.message.includes('no existe')) {
             return res.status(400).json({ message: error.message }); // 400 Bad Request
        }
        next(error);
    }
};

// Actualizar un producto existente
const actualizarProducto = async (req, res, next) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, categoria_id } = req.body;
    const productoIdInt = parseInt(id);

    if (!Number.isInteger(productoIdInt) || productoIdInt <= 0) {
        return res.status(400).json({ message: 'ID de producto inválido.' });
    }
    // TODO: Añadir validación más robusta para el body
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
        return res.status(400).json({ message: 'El campo "nombre" es obligatorio.' });
    }
     if (precio === undefined || typeof parseFloat(precio) !== 'number' || parseFloat(precio) < 0) {
         return res.status(400).json({ message: 'El campo "precio" es obligatorio y debe ser un número no negativo.' });
    }
    if (!categoria_id || !Number.isInteger(parseInt(categoria_id)) || parseInt(categoria_id) <= 0) {
         return res.status(400).json({ message: 'El campo "categoria_id" es obligatorio y debe ser un ID válido.' });
    }

     const productoData = {
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        precio: parseFloat(precio),
        categoria_id: parseInt(categoria_id)
    };

    try {
        const productoActualizado = await productoQueries.updateProducto(productoIdInt, productoData);
        if (!productoActualizado) {
            return res.status(404).json({ message: `Producto con ID ${id} no encontrado.` });
        }
        res.json(productoActualizado);
    } catch (error) {
        // Si el error viene de la query por FK constraint (categoría inexistente)
        if (error.message.includes('categoría con ID') && error.message.includes('no existe')) {
             return res.status(400).json({ message: error.message }); // 400 Bad Request
        }
        next(error);
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