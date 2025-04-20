// server/routes/categoria.routes.js
const express = require('express');
const categoriaController = require('../controllers/categoria.controller');
const productoController = require('../controllers/producto.controller');
// const authMiddleware = require('../middleware/auth.middleware'); // Descomentar cuando se implemente autenticación

const router = express.Router();

// --- Rutas Públicas (o que podrían serlo) ---
// GET /api/categorias -> Obtener todas las categorías
router.get('/', categoriaController.obtenerTodasLasCategorias);

// --- Ruta Opcional: Obtener productos de una categoría específica ---
router.get('/:categoria_id/productos', productoController.obtenerProductosPorCategoria);

// GET /api/categorias/:id -> Obtener una categoría por ID
router.get('/:id', categoriaController.obtenerCategoriaPorId);


// --- Rutas Protegidas (requerirán autenticación/autorización de Admin) ---
// POST /api/categorias -> Crear una nueva categoría
// TODO: Proteger esta ruta con authMiddleware
router.post('/', /* authMiddleware.isAdmin, */ categoriaController.crearCategoria);

// PUT /api/categorias/:id -> Actualizar una categoría existente
// TODO: Proteger esta ruta con authMiddleware
router.put('/:id', /* authMiddleware.isAdmin, */ categoriaController.actualizarCategoria);

// DELETE /api/categorias/:id -> Eliminar una categoría existente
// TODO: Proteger esta ruta con authMiddleware
router.delete('/:id', /* authMiddleware.isAdmin, */ categoriaController.eliminarCategoria);


module.exports = router;