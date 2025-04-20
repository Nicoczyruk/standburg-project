// server/controllers/pedido.controller.js
const pedidoQueries = require('../db/queries/pedido.queries');

const ESTADOS_PEDIDO_VALIDOS = ['pendiente', 'en preparacion', 'listo', 'entregado', 'pagado', 'cancelado'];

// Obtener todos los pedidos con filtros
const obtenerTodosLosPedidos = async (req, res, next) => {
    const { estado, mesa_id } = req.query;
    const filters = {};

    if (estado) {
        if (!ESTADOS_PEDIDO_VALIDOS.includes(estado)) {
             return res.status(400).json({ message: `Estado de filtro inválido. Valores permitidos: ${ESTADOS_PEDIDO_VALIDOS.join(', ')}` });
        }
        filters.estado = estado;
    }
    if (mesa_id) {
        const mesaIdInt = parseInt(mesa_id);
        if (!Number.isInteger(mesaIdInt) || mesaIdInt <= 0) {
             return res.status(400).json({ message: 'ID de mesa inválido en el filtro.' });
        }
        filters.mesa_id = mesaIdInt;
    }
    // TODO: Añadir filtros de fecha si se implementan en la query

    try {
        const pedidos = await pedidoQueries.getAllPedidos(filters);
        res.json(pedidos || []);
    } catch (error) {
        next(error);
    }
};

// Obtener un pedido por ID
const obtenerPedidoPorId = async (req, res, next) => {
    const { id } = req.params;
    const pedidoIdInt = parseInt(id);

    if (!Number.isInteger(pedidoIdInt) || pedidoIdInt <= 0) {
        return res.status(400).json({ message: 'ID de pedido inválido.' });
    }

    try {
        const pedido = await pedidoQueries.getPedidoById(pedidoIdInt);
        if (!pedido) {
            return res.status(404).json({ message: `Pedido con ID ${id} no encontrado.` });
        }
        res.json(pedido);
    } catch (error) {
        next(error);
    }
};

// Crear un nuevo pedido
const crearPedido = async (req, res, next) => {
    // Asumimos que admin_id vendrá del usuario autenticado (req.user.admin_id)
    // Por ahora, lo tomamos del body o lo dejamos null si no viene
    const { mesa_id, admin_id, items } = req.body;

    // Validación básica de entrada
    // TODO: Usar express-validator
    if (mesa_id !== null && mesa_id !== undefined && (!Number.isInteger(parseInt(mesa_id)) || parseInt(mesa_id) <= 0)) {
         return res.status(400).json({ message: 'ID de mesa inválido.' });
    }
     if (admin_id !== null && admin_id !== undefined && (!Number.isInteger(parseInt(admin_id)) || parseInt(admin_id) <= 0)) {
         return res.status(400).json({ message: 'ID de admin inválido.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Se requiere al menos un item en el pedido.' });
    }
    // Validar cada item
    for (const item of items) {
        if (!item.producto_id || !Number.isInteger(parseInt(item.producto_id)) || parseInt(item.producto_id) <= 0) {
             return res.status(400).json({ message: 'Cada item debe tener un "producto_id" válido.' });
        }
        if (!item.cantidad || !Number.isInteger(parseInt(item.cantidad)) || parseInt(item.cantidad) <= 0) {
            return res.status(400).json({ message: `Cantidad inválida para el producto ID ${item.producto_id}.` });
        }
    }

    const pedidoData = {
        // Convertir a null si es undefined o null explícitamente
        mesa_id: mesa_id === undefined ? null : parseInt(mesa_id) || null,
        admin_id: admin_id === undefined ? null : parseInt(admin_id) || null, // TODO: Reemplazar con req.user.admin_id
        items: items.map(item => ({
            producto_id: parseInt(item.producto_id),
            cantidad: parseInt(item.cantidad)
        }))
    };

    try {
        const nuevoPedido = await pedidoQueries.createPedidoTransaction(pedidoData);
        res.status(201).json(nuevoPedido);
    } catch (error) {
         // Manejar errores específicos de la transacción (ej. producto no encontrado)
        if (error.message.includes('Producto con ID') || error.message.includes('No se pudo crear el pedido')) {
            return res.status(400).json({ message: error.message }); // 400 Bad Request
        }
        next(error); // Otros errores al manejador global
    }
};

// Actualizar el estado de un pedido
const actualizarEstadoPedido = async (req, res, next) => {
    const { id } = req.params;
    const { estado } = req.body;
    const pedidoIdInt = parseInt(id);

    if (!Number.isInteger(pedidoIdInt) || pedidoIdInt <= 0) {
        return res.status(400).json({ message: 'ID de pedido inválido.' });
    }
    if (!estado || !ESTADOS_PEDIDO_VALIDOS.includes(estado)) {
         return res.status(400).json({ message: `Estado inválido. Valores permitidos: ${ESTADOS_PEDIDO_VALIDOS.join(', ')}` });
    }

    try {
        const pedidoActualizado = await pedidoQueries.updatePedidoEstado(pedidoIdInt, estado);
        if (!pedidoActualizado) {
            return res.status(404).json({ message: `Pedido con ID ${id} no encontrado.` });
        }
        // Opcionalmente, devolver el pedido completo después de actualizar el estado
        const pedidoCompleto = await pedidoQueries.getPedidoById(pedidoIdInt);
        res.json(pedidoCompleto);
        // O simplemente devolver el estado actualizado:
        // res.json(pedidoActualizado);
    } catch (error) {
        // Si el error viene de la query por CHECK constraint (aunque validamos antes)
        if (error.message.includes('no es válido')) {
             return res.status(400).json({ message: error.message }); // 400 Bad Request
        }
        next(error);
    }
};


module.exports = {
    obtenerTodosLosPedidos,
    obtenerPedidoPorId,
    crearPedido,
    actualizarEstadoPedido,
};