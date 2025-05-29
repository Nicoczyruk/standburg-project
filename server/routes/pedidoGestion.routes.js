// server/routes/pedidoGestion.routes.js
const express = require('express');
const router = express.Router();

// Asegúrate de que la ruta al controlador sea correcta
// y que pedido.controller.js exporte 'obtenerPedidosParaGestion'
const pedidoController = require('../controllers/pedido.controller');

// Esta ruta manejará GET /api/pedidos-gestion?estado=...
// El path aquí es '/' porque la base '/api/pedidos-gestion' se definirá en server.js
router.get('/', pedidoController.obtenerPedidosParaGestion);

module.exports = router;