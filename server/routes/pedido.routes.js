// server/routes/pedido.routes.js
const express = require('express');
const pedidoController = require('../controllers/pedido.controller');


const router = express.Router();

// --- Rutas  ---

// GET /api/pedidos -> Listar pedidos (con filtros opcionales)

router.get('/', /* authMiddleware.isLoggedIn, */ pedidoController.obtenerTodosLosPedidos);

// GET /api/pedidos/:id -> Obtener un pedido específico con detalles

router.get('/:id', /* authMiddleware.isLoggedIn, */ pedidoController.obtenerPedidoPorId);

// POST /api/pedidos -> Crear un nuevo pedido

router.post('/', /* authMiddleware.isLoggedIn, */ pedidoController.crearPedido);

// PUT /api/pedidos/:id/estado -> Actualizar el estado de un pedido

router.put('/:id/estado', /* authMiddleware.isLoggedIn, */ pedidoController.actualizarEstadoPedido);

// DELETE /api/pedidos/:id -> Eliminar un pedido

router.delete('/:id', /* authMiddleware.isLoggedIn, */ pedidoController.eliminarPedido);

module.exports = router;