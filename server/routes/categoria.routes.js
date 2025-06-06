// server/routes/categoria.routes.js
const express = require('express');
const categoriaController = require('../controllers/categoria.controller');
const productoController = require('../controllers/producto.controller');
// const authMiddleware = require('../middleware/auth.middleware'); 

const router = express.Router();

// --- Rutas Públicas ---
// GET /api/categorias -> Obtener todas las categorías
router.get('/', categoriaController.obtenerTodasLasCategorias);

// --- Ruta Opcional: Obtener productos de una categoría específica ---
router.get('/:categoria_id/productos', productoController.obtenerProductosPorCategoria);

// GET /api/categorias/:id -> Obtener una categoría por ID
router.get('/:id', categoriaController.obtenerCategoriaPorId);


// --- Rutas Protegidas (requerirán autenticación/autorización de Admin) ---
// POST /api/categorias -> Crear una nueva categoría
router.post('/', /* authMiddleware.isAdmin, */ categoriaController.crearCategoria);

// PUT /api/categorias/:id -> Actualizar una categoría existente
router.put('/:id', /* authMiddleware.isAdmin, */ categoriaController.actualizarCategoria);

// DELETE /api/categorias/:id -> Eliminar una categoría existente
router.delete('/:id', /* authMiddleware.isAdmin, */ categoriaController.eliminarCategoria);


module.exports = router;