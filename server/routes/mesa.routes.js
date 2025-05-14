// server/routes/mesa.routes.js
const express = require('express');
const mesaController = require('../controllers/mesa.controller');


const router = express.Router();

// --- Rutas Públicas / Generales ---
// GET /api/mesas -> Obtener todas las mesas
router.get('/', mesaController.obtenerTodasLasMesas);

// GET /api/mesas/:id -> Obtener una mesa por ID
router.get('/:id', mesaController.obtenerMesaPorId);

// --- Rutas Protegidas (requerirán autenticación/autorización de Admin) ---
// POST /api/mesas -> Crear una nueva mesa

router.post('/', /* authMiddleware.isAdmin, */ mesaController.crearMesa);

// PUT /api/mesas/:id -> Actualizar una mesa existente (incluyendo estado)

router.put('/:id', /* authMiddleware.isAdmin, */ mesaController.actualizarMesa);

// DELETE /api/mesas/:id -> Eliminar una mesa existente
router.delete('/:id', /* authMiddleware.isAdmin, */ mesaController.eliminarMesa);

module.exports = router;