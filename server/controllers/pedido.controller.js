// server/controllers/pedido.controller.js
const pedidoQueries = require('../db/queries/pedido.queries');

const ESTADOS_PEDIDO_VALIDOS = ['pendiente', 'en preparacion', 'listo', 'entregado', 'pagado', 'cancelado'];

// Mantén esta lista o ajústala a tus tipos válidos
const TIPOS_PEDIDO_VALIDOS = ['mostrador', 'mesa', 'delivery'];


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

const crearPedido = async (req, res, next) => {
    // Extraer datos del cliente y tipo del body, ya no esperamos admin_id
    const { mesa_id, items, tipo, cliente_nombre, cliente_telefono, cliente_direccion, notas, costo_envio } = req.body;

    // --- Validación ---
    if (!tipo || !TIPOS_PEDIDO_VALIDOS.includes(tipo)) {
         return res.status(400).json({ message: `El campo "tipo" es obligatorio y válido.` });
    }
    if (tipo === 'mesa' && (mesa_id === undefined || !Number.isInteger(parseInt(mesa_id)) || parseInt(mesa_id) <= 0)) {
        return res.status(400).json({ message: 'Se requiere un "mesa_id" válido para tipo "mesa".' });
    }
    if (tipo === 'delivery' && !cliente_direccion) { // Ejemplo validación delivery
        return res.status(400).json({ message: 'Se requiere "cliente_direccion" para tipo "delivery".' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Se requiere al menos un item.' });
    }
    for (const item of items) { // Validación de items se mantiene
        if (!item.producto_id || !Number.isInteger(parseInt(item.producto_id)) || parseInt(item.producto_id) <= 0) {
             return res.status(400).json({ message: 'Item con "producto_id" inválido.' });
        }
        if (!item.cantidad || !Number.isInteger(parseInt(item.cantidad)) || parseInt(item.cantidad) <= 0) {
            return res.status(400).json({ message: `Cantidad inválida para producto ID ${item.producto_id}.` });
        }
    }
    // --- Fin Validación ---

    // Preparar datos para la query, sin admin_id, con datos del cliente
    const pedidoData = {
        mesa_id: tipo === 'mesa' ? parseInt(mesa_id) : null,
        cliente_nombre: cliente_nombre || null, // Usa null si no viene
        cliente_telefono: cliente_telefono || null,
        cliente_direccion: cliente_direccion || null,
        notas: notas || null,
        tipo: tipo,
        items: items.map(item => ({
            producto_id: parseInt(item.producto_id),
            cantidad: parseInt(item.cantidad)
        }))
        // NOTA: costo_envio no se pasa directamente a la query actual,
        // la query calcula el total basado solo en productos.
        // Si necesitas incluir costo_envio en el total guardado,
        // deberías ajustar la query `createPedidoTransaction`.
    };

    try {
        const nuevoPedido = await pedidoQueries.createPedidoTransaction(pedidoData);
        res.status(201).json(nuevoPedido);
    } catch (error) {
        // Manejar errores específicos conocidos de la query
        if (error.message.includes('Producto con ID') || error.message.includes('mesa con ID')) {
            return res.status(400).json({ message: error.message });
        }
        // Si tienes un CHECK constraint para el tipo
        if (error.message.includes('CK_PEDIDOS_Tipo')) { // Ajusta nombre
             return res.status(400).json({ message: `Tipo de pedido '${tipo}' inválido.` });
        }
        // Otros errores
        next(error);
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
        // O simplemente devolver el estado actualizado PARA TESTEAR:
        // res.json(pedidoActualizado);
    } catch (error) {
        // Si el error viene de la query por CHECK constraint 
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