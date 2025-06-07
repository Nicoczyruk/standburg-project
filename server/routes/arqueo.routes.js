// server/routes/arqueo.routes.js
const express = require('express');
const { 
    abrirArqueo, 
    obtenerDetallesArqueoActivo, 
    cerrarArqueo, // Nombre corregido
    obtenerHistorialArqueos, 
    getArqueoDetalladoById 
} = require('../controllers/arqueo.controller');

const router = express.Router();

// Ruta para obtener el arqueo activo con sus detalles calculados
router.get('/activo', obtenerDetallesArqueoActivo);

// Ruta para iniciar un nuevo arqueo de caja
router.post('/abrir', abrirArqueo);

// CORRECCIÓN 2: La ruta ahora apunta a la función 'cerrarArqueo' que sí existe
router.put('/cerrar', cerrarArqueo);

// Ruta para obtener el historial de arqueos cerrados
router.get('/historial', obtenerHistorialArqueos);

// Ruta para obtener un arqueo específico por su ID
router.get('/:id', getArqueoDetalladoById);


module.exports = router;