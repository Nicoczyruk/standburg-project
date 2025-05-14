// server/routes/gasto.routes.js
const express = require('express');
const gastoController = require('../controllers/gasto.controller');


const router = express.Router();

// GET /api/gastos -> Obtener todos los gastos (con filtros opcionales)

router.get('/', gastoController.obtenerTodos);

// POST /api/gastos -> Crear un nuevo gasto

router.post('/', gastoController.crear);

// GET /api/gastos/:id -> Obtener un gasto por ID

router.get('/:id', gastoController.obtenerPorId);

// PUT /api/gastos/:id -> Actualizar un gasto

router.put('/:id', gastoController.actualizar);

// DELETE /api/gastos/:id -> Eliminar un gasto

router.delete('/:id', gastoController.eliminar);

module.exports = router;