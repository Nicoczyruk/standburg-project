// server/routes/producto.routes.js
const express = require('express');
const productoController = require('../controllers/producto.controller');
// const authMiddleware = require('../middleware/auth.middleware'); // Descomentar cuando se implemente

const router = express.Router();

// --- Rutas Públicas (o que podrían serlo) ---
// GET /api/productos -> Obtener todos los productos (puede filtrar con ?categoria_id=X)
router.get('/', productoController.obtenerTodosLosProductos);

// GET /api/productos/:id -> Obtener un producto por ID
router.get('/:id', productoController.obtenerProductoPorId);

// --- Rutas Protegidas (requerirán autenticación/autorización de Admin) ---
// POST /api/productos -> Crear un nuevo producto
// TODO: Proteger esta ruta con authMiddleware
router.post('/', /* authMiddleware.isAdmin, */ productoController.crearProducto);

// PUT /api/productos/:id -> Actualizar un producto existente
// TODO: Proteger esta ruta con authMiddleware
router.put('/:id', /* authMiddleware.isAdmin, */ productoController.actualizarProducto);

// DELETE /api/productos/:id -> Eliminar un producto existente
// TODO: Proteger esta ruta con authMiddleware
router.delete('/:id', /* authMiddleware.isAdmin, */ productoController.eliminarProducto);

module.exports = router;