// server/routes/pago.routes.js
const express = require('express');
const pagoController = require('../controllers/pago.controller');


const router = express.Router();

// --- Rutas  ---

// GET /api/pagos -> Listar pagos 

router.get('/', /* authMiddleware.isAdmin, */ pagoController.obtenerTodosLosPagos);

// GET /api/pagos/:id -> Obtener un pago específico

router.get('/:id', /* authMiddleware.isAdmin, */ pagoController.obtenerPagoPorId);

// POST /api/pagos -> Registrar un nuevo pago

router.post('/', /* authMiddleware.isLoggedIn, */ pagoController.crearPago);

// DELETE /api/pagos/:id -> Anular (eliminar) un pago existente

router.delete('/:id', /* authMiddleware.isAdmin, */ pagoController.eliminarPago);

module.exports = router;