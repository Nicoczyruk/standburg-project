// server/controllers/categoria.controller.js
const categoriaQueries = require('../db/queries/categoria.queries');

// Obtener todas las categorías
const obtenerTodasLasCategorias = async (req, res, next) => {
    try {
        const categorias = await categoriaQueries.getAllCategorias();
        // Es normal que la lista esté vacía si no hay categorías, no es un error 404 ya lo comprobe
        res.json(categorias || []);
    } catch (error) {
        next(error); // Pasa el error al manejador global
    }
};

// Obtener una categoría por ID
const obtenerCategoriaPorId = async (req, res, next) => {
    const { id } = req.params;
    // Validación básica de ID (debería ser un número entero positivo)
    if (!Number.isInteger(parseInt(id)) || parseInt(id) <= 0) {
        return res.status(400).json({ message: 'ID de categoría inválido.' });
    }
    try {
        const categoria = await categoriaQueries.getCategoriaById(parseInt(id));
        if (!categoria) {
            // Si no se encuentra la categoría, devuelve 404
            return res.status(404).json({ message: `Categoría con ID ${id} no encontrada.` });
        }
        res.json(categoria);
    } catch (error) {
        next(error);
    }
};

// Crear una nueva categoría
const crearCategoria = async (req, res, next) => {
    const { nombre, descripcion } = req.body;

    // Validación básica (el nombre es obligatorio)
    
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
        return res.status(400).json({ message: 'El campo "nombre" es obligatorio.' });
    }

    try {
        const nuevaCategoria = await categoriaQueries.createCategoria(nombre.trim(), descripcion ? descripcion.trim() : null);
        res.status(201).json(nuevaCategoria); // 201 Created
    } catch (error) {
        next(error);
    }
};

// Actualizar una categoría existente
const actualizarCategoria = async (req, res, next) => {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    // Validación básica de ID
    if (!Number.isInteger(parseInt(id)) || parseInt(id) <= 0) {
        return res.status(400).json({ message: 'ID de categoría inválido.' });
    }
    // Validación básica de nombre
    
    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
        return res.status(400).json({ message: 'El campo "nombre" es obligatorio.' });
    }

    try {
        const categoriaActualizada = await categoriaQueries.updateCategoria(parseInt(id), nombre.trim(), descripcion ? descripcion.trim() : null);
        if (!categoriaActualizada) {
            // Si la query de update no devuelve nada, significa que el ID no existía
             return res.status(404).json({ message: `Categoría con ID ${id} no encontrada.` });
        }
        res.json(categoriaActualizada);
    } catch (error) {
        next(error);
    }
};

// Eliminar una categoría
const eliminarCategoria = async (req, res, next) => {
    const { id } = req.params;

    // Validación básica de ID
    if (!Number.isInteger(parseInt(id)) || parseInt(id) <= 0) {
        return res.status(400).json({ message: 'ID de categoría inválido.' });
    }

    try {
        const fueEliminada = await categoriaQueries.deleteCategoria(parseInt(id));
        if (!fueEliminada) {
            // Si no se eliminó nada, es porque no se encontró ese ID
            return res.status(404).json({ message: `Categoría con ID ${id} no encontrada.` });
        }
        res.status(204).send(); // 204 No Content 
    } catch (error) {
         // Si el error viene de la query por FK constraint
        if (error.message.includes('productos asociados')) {
             return res.status(409).json({ message: error.message }); // 409 Conflict
        }
        next(error); // Otros errores al manejador global
    }
};


module.exports = {
    obtenerTodasLasCategorias,
    obtenerCategoriaPorId,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
};