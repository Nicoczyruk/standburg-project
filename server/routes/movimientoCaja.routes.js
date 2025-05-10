// server/routes/movimientoCaja.routes.js
const express = require('express');
const movimientoCajaController = require('../controllers/movimientoCaja.controller');
// const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/movimientos-caja -> Listar todos los movimientos (con filtros opcionales)
// TODO: Proteger (ej. authMiddleware.isLoggedIn)
router.get('/', movimientoCajaController.obtenerTodos);

// POST /api/movimientos-caja -> Crear un nuevo movimiento
// TODO: Proteger (ej. authMiddleware.isLoggedIn)
router.post('/', movimientoCajaController.crear);

// GET /api/movimientos-caja/:id -> Obtener un movimiento por ID
// TODO: Proteger
router.get('/:id', movimientoCajaController.obtenerPorId);

// PUT y DELETE pueden añadirse si son necesarios para el frontend

module.exports = router;