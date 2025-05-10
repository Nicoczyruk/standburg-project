// server/routes/gasto.routes.js
const express = require('express');
const gastoController = require('../controllers/gasto.controller');
// const authMiddleware = require('../middleware/auth.middleware'); // Para proteger rutas

const router = express.Router();

// GET /api/gastos -> Obtener todos los gastos (con filtros opcionales)
// TODO: Proteger (ej. authMiddleware.isLoggedIn)
router.get('/', gastoController.obtenerTodos);

// POST /api/gastos -> Crear un nuevo gasto
// TODO: Proteger (ej. authMiddleware.isLoggedIn o authMiddleware.isAdmin)
router.post('/', gastoController.crear);

// GET /api/gastos/:id -> Obtener un gasto por ID
// TODO: Proteger
router.get('/:id', gastoController.obtenerPorId);

// PUT /api/gastos/:id -> Actualizar un gasto
// TODO: Proteger
router.put('/:id', gastoController.actualizar);

// DELETE /api/gastos/:id -> Eliminar un gasto
// TODO: Proteger
router.delete('/:id', gastoController.eliminar);

module.exports = router;