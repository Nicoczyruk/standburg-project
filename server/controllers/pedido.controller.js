// server/controllers/pedido.controller.js
const pedidoQueries = require('../db/queries/pedido.queries');

const ESTADOS_PEDIDO_VALIDOS = ['PENDIENTE', 'en preparacion', 'listo', 'entregado', 'pagado', 'cancelado', 'A CONFIRMAR'];

// Mantén esta lista o ajústala a tus tipos válidos
const TIPOS_PEDIDO_VALIDOS = ['mostrador', 'mesa', 'delivery'];

const ESTADOS_PEDIDO_VALIDOS_PARA_CREACION = ['PENDIENTE', 'A CONFIRMAR'];

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
    // admin_id es opcional aquí, dependerá de quién crea el pedido
    const { mesa_id, admin_id, items, tipo, cliente_nombre, cliente_telefono, cliente_direccion, notas } = req.body;

    // --- Validación ---
    if (!tipo || !TIPOS_PEDIDO_VALIDOS.includes(tipo)) {
         return res.status(400).json({ message: `El campo "tipo" es obligatorio y válido.` });
    }
    // ... (otras validaciones para mesa_id, items, etc. se mantienen)

    // Determinar el estado inicial basado en si viene un admin_id (temporal)
    // Si viene admin_id, es un pedido del staff -> 'PENDIENTE'
    // Si no viene admin_id, es un pedido del cliente -> 'A CONFIRMAR'
    const estadoInicial = admin_id ? 'PENDIENTE' : 'A CONFIRMAR';

    if (!ESTADOS_PEDIDO_VALIDOS_PARA_CREACION.includes(estadoInicial)) {
        // Esto no debería pasar si la lógica anterior es correcta, pero por seguridad.
        return res.status(400).json({ message: "Estado inicial para creación no válido." });
    }

    const pedidoData = {
        mesa_id: tipo === 'mesa' ? parseInt(mesa_id) : null,
        // admin_id: admin_id ? parseInt(admin_id) : null, // Si decides pasarlo, la query debe manejarlo
        cliente_nombre: cliente_nombre || null,
        cliente_telefono: cliente_telefono || null,
        cliente_direccion: cliente_direccion || null,
        notas: notas || null,
        tipo: tipo,
        items: items.map(item => ({
            producto_id: parseInt(item.producto_id), 
            cantidad: parseInt(item.cantidad)       
        })),
        estadoInicial: estadoInicial // <--- Pasar el estado determinado a la query
    };

    try {
        const nuevoPedido = await pedidoQueries.createPedidoTransaction(pedidoData);
        res.status(201).json(nuevoPedido);
    } catch (error) {
        // ... (manejo de errores) ...
        next(error);
    }
};

// Actualizar el estado de un pedido
const actualizarEstadoPedido = async (req, res, next) => {
    const { id } = req.params;
    const { estado } = req.body; // Este 'estado' viene del frontend
    const pedidoIdInt = parseInt(id);

    if (!Number.isInteger(pedidoIdInt) || pedidoIdInt <= 0) {
        return res.status(400).json({ message: 'ID de pedido inválido.' });
    }

    // Validar contra la lista corregida
    if (!estado || !ESTADOS_PEDIDO_VALIDOS.includes(estado)) { // La validación ahora usará la lista actualizada
         return res.status(400).json({ message: `Estado inválido. Valores permitidos: ${ESTADOS_PEDIDO_VALIDOS.join(', ')}` });
    }

    try {
        const pedidoActualizado = await pedidoQueries.updatePedidoEstado(pedidoIdInt, estado);
        if (!pedidoActualizado) {
            return res.status(404).json({ message: `Pedido con ID ${id} no encontrado o no se pudo actualizar.` });
        }
        const pedidoCompleto = await pedidoQueries.getPedidoById(pedidoIdInt); // Obtener el pedido completo actualizado
        res.json(pedidoCompleto);
    } catch (error) {
        // Si el error viene de la query por CHECK constraint (si lo tuvieras y no coincidiera)
        if (error.message.includes('CK_PEDIDOS_Estado') || error.message.includes('no es válido')) { // Ajusta si el nombre del constraint es diferente
             return res.status(400).json({ message: `El estado '${estado}' no es válido según la base de datos.` });
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