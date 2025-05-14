// server/routes/turno.routes.js
const express = require('express');
const turnoController = require('../controllers/turno.controller');
// const authMiddleware = require('../middleware/auth.middleware'); // Descomentar cuando se implemente

const router = express.Router();

// --- Rutas (requieren diferentes niveles de protección) ---

// GET /api/turnos -> Listar historial de turnos
router.get('/', /* authMiddleware.isAdmin, */ turnoController.obtenerTodosLosTurnos);

// GET /api/turnos/activo -> Obtener el turno activo actual
router.get('/activo', /* authMiddleware.isLoggedIn, */ turnoController.obtenerTurnoActivo);

// GET /api/turnos/:id -> Obtener un turno específico por ID
router.get('/:id', /* authMiddleware.isAdmin, */ turnoController.obtenerTurnoPorId);

// POST /api/turnos/abrir -> Abrir un nuevo turno
router.post('/abrir', /* authMiddleware.isAdmin, */ turnoController.abrirNuevoTurno);

// PUT /api/turnos/:id/cerrar -> Cerrar el turno activo con ID :id
router.put('/:id/cerrar', /* authMiddleware.isAdmin, */ turnoController.cerrarTurnoActivo);

module.exports = router;