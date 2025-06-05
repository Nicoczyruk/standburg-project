// server/routes/producto.routes.js
const express = require('express');
const productoController = require('../controllers/producto.controller');


const router = express.Router();

// --- Rutas Públicas ---
// GET /api/productos -> Obtener todos los productos (puede filtrar con ?categoria_id=X)
router.get('/', productoController.obtenerTodosLosProductos);

// GET /api/productos/:id -> Obtener un producto por ID
router.get('/:id', productoController.obtenerProductoPorId);


// POST /api/productos -> Crear un nuevo producto
router.post('/', /* authMiddleware.isAdmin, */ productoController.crearProducto);

// PUT /api/productos/:id -> Actualizar un producto existente
router.put('/:id', /* authMiddleware.isAdmin, */ productoController.actualizarProducto);

// DELETE /api/productos/:id -> Eliminar un producto existente
router.delete('/:id', /* authMiddleware.isAdmin, */ productoController.eliminarProducto);

module.exports = router;