// server/routes/pedido.routes.js
const express = require('express');
const pedidoController = require('../controllers/pedido.controller');
// const authMiddleware = require('../middleware/auth.middleware'); // Descomentar cuando se implemente

const router = express.Router();

// --- Rutas  ---

// GET /api/pedidos -> Listar pedidos (con filtros opcionales)
// TODO: Proteger esta ruta
router.get('/', /* authMiddleware.isLoggedIn, */ pedidoController.obtenerTodosLosPedidos);

// GET /api/pedidos/:id -> Obtener un pedido específico con detalles
// TODO: Proteger esta ruta
router.get('/:id', /* authMiddleware.isLoggedIn, */ pedidoController.obtenerPedidoPorId);

// POST /api/pedidos -> Crear un nuevo pedido
// TODO: Proteger esta ruta
router.post('/', /* authMiddleware.isLoggedIn, */ pedidoController.crearPedido);

// PUT /api/pedidos/:id/estado -> Actualizar el estado de un pedido
// TODO: Proteger esta ruta 
router.put('/:id/estado', /* authMiddleware.isLoggedIn, */ pedidoController.actualizarEstadoPedido);

module.exports = router;