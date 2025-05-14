// server/routes/movimientoCaja.routes.js
const express = require('express');
const movimientoCajaController = require('../controllers/movimientoCaja.controller');


const router = express.Router();

// GET /api/movimientos-caja -> Listar todos los movimientos (con filtros opcionales)

router.get('/', movimientoCajaController.obtenerTodos);

// POST /api/movimientos-caja -> Crear un nuevo movimiento

router.post('/', movimientoCajaController.crear);

// GET /api/movimientos-caja/:id -> Obtener un movimiento por ID

router.get('/:id', movimientoCajaController.obtenerPorId);

module.exports = router;