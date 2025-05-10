// server/routes/arqueo.routes.js
const express = require('express');
const arqueoController = require('../controllers/arqueo.controller');
// const authMiddleware = require('../middleware/auth.middleware'); // Descomentar cuando se implemente

const router = express.Router();

// Abrir un nuevo arqueo
// POST /api/arqueos/abrir
router.post('/abrir', /* authMiddleware.isLoggedIn, */ arqueoController.abrirNuevoArqueo);

// Cerrar el arqueo activo
// PUT /api/arqueos/cerrar (el ID se obtiene del arqueo activo)
router.put('/cerrar', /* authMiddleware.isLoggedIn, */ arqueoController.cerrarArqueoActivo);

// Obtener el arqueo activo
// GET /api/arqueos/activo
router.get('/activo', /* authMiddleware.isLoggedIn, */ arqueoController.obtenerArqueoActivoActual);

// Obtener historial de arqueos cerrados
// GET /api/arqueos
router.get('/', /* authMiddleware.isLoggedIn, */ arqueoController.obtenerHistorial);

// Obtener un arqueo específico por ID (para ver detalles de un arqueo pasado)
// GET /api/arqueos/:id
router.get('/:id', /* authMiddleware.isLoggedIn, */ arqueoController.obtenerArqueoPorIdDetallado);


module.exports = router;