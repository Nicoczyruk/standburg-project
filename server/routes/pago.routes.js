// server/routes/pago.routes.js
const express = require('express');
const pagoController = require('../controllers/pago.controller');
// const authMiddleware = require('../middleware/auth.middleware'); // Descomentar cuando se implemente

const router = express.Router();

// --- Rutas  ---

// GET /api/pagos -> Listar pagos 
// TODO: Proteger esta ruta (Admin?)
router.get('/', /* authMiddleware.isAdmin, */ pagoController.obtenerTodosLosPagos);

// GET /api/pagos/:id -> Obtener un pago específico
// TODO: Proteger esta ruta (Admin?)
router.get('/:id', /* authMiddleware.isAdmin, */ pagoController.obtenerPagoPorId);

// POST /api/pagos -> Registrar un nuevo pago
// TODO: Proteger esta ruta (Cajero/Admin?)
router.post('/', /* authMiddleware.isLoggedIn, */ pagoController.crearPago);

// DELETE /api/pagos/:id -> Anular (eliminar) un pago existente
// TODO: Proteger esta ruta (Admin?)
router.delete('/:id', /* authMiddleware.isAdmin, */ pagoController.eliminarPago);

module.exports = router;