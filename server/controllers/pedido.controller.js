// server/controllers/pedido.controller.js
const pedidoQueries = require('../db/queries/pedido.queries');
const { getTransaction } = require('../db/connection');
// Importar los métodos de pago válidos del módulo de queries de pago
const { METODOS_PAGO_VALIDOS } = require('../db/queries/pago.queries');


const ESTADOS_PEDIDO_VALIDOS = ['PENDIENTE', 'en preparacion', 'listo', 'entregado', 'pagado', 'cancelado', 'A CONFIRMAR'];
const TIPOS_PEDIDO_VALIDOS = ['mostrador', 'mesa', 'delivery'];
const ESTADOS_PEDIDO_VALIDOS_PARA_CREACION_BASE = ['PENDIENTE', 'A CONFIRMAR']; // Estado antes de ser pagado

// Obtener todos los pedidos (sin cambios)
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
    try {
        const pedidos = await pedidoQueries.getAllPedidos(filters);
        res.json(pedidos || []);
    } catch (error) {
        next(error);
    }
};

// Obtener un pedido por ID (sin cambios)
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
    const {
        mesa_id,
        admin_id, 
        items,
        tipo,
        cliente_nombre,
        cliente_telefono,
        cliente_direccion,
        notas,
        metodo_pago 
    } = req.body;

    // --- Validación ---
    if (!tipo || !TIPOS_PEDIDO_VALIDOS.includes(tipo)) {
         return res.status(400).json({ message: `El campo "tipo" es obligatorio y debe ser uno de: ${TIPOS_PEDIDO_VALIDOS.join(', ')}.` });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'El pedido debe contener al menos un item.' });
    }
    // Validar cada item
    for (const item of items) {
        if (item.producto_id == null || isNaN(parseInt(item.producto_id)) || parseInt(item.producto_id) <= 0) {
            return res.status(400).json({ message: 'Cada item debe tener un "producto_id" válido.' });
        }
        if (item.cantidad == null || isNaN(parseInt(item.cantidad)) || parseInt(item.cantidad) <= 0) {
            return res.status(400).json({ message: `Cantidad inválida para el producto ID ${item.producto_id}.` });
        }
    }

    // NUEVO: Validar metodo_pago
    if (!metodo_pago || !METODOS_PAGO_VALIDOS.includes(metodo_pago)) {
        return res.status(400).json({ message: `El campo "metodo_pago" es obligatorio y debe ser uno de: ${METODOS_PAGO_VALIDOS.join(', ')}.` });
    }

    if (tipo === 'mesa') {
        const mesaIdInt = parseInt(mesa_id);
        if (isNaN(mesaIdInt) || mesaIdInt <= 0) {
            return res.status(400).json({ message: 'Para pedidos de tipo "mesa", se requiere un "mesa_id" válido.' });
        }
    }
    if (tipo === 'delivery' && !cliente_direccion) {
        return res.status(400).json({ message: 'Para pedidos de tipo "delivery", se requiere "cliente_direccion".' });
    }
    if (!cliente_nombre) { // Nombre del cliente siempre requerido
         return res.status(400).json({ message: 'El campo "cliente_nombre" es obligatorio.' });
    }

    const estadoOriginal = admin_id ? 'PENDIENTE' : 'A CONFIRMAR'; // O la lógica que tengas para esto

    if (!ESTADOS_PEDIDO_VALIDOS_PARA_CREACION_BASE.includes(estadoOriginal)) {
        return res.status(400).json({ message: "Estado original para creación no válido." });
    }

    const pedidoData = {
        mesa_id: tipo === 'mesa' ? parseInt(mesa_id) : null,
        cliente_nombre: cliente_nombre || null,
        cliente_telefono: cliente_telefono || null,
        cliente_direccion: cliente_direccion || null,
        notas: notas || null,
        tipo: tipo,
        items: items.map(item => ({ 
            producto_id: parseInt(item.producto_id),
            cantidad: parseInt(item.cantidad)
        })),
        metodo_pago: metodo_pago, // Pasar el método de pago
        estadoOriginal: estadoOriginal // Pasar el estado base
    };

    try {
        // Usar la nueva función de query
        const nuevoPedidoConPago = await pedidoQueries.createPedidoConPagoTransaction(pedidoData);
        res.status(201).json(nuevoPedidoConPago); // Devuelve el pedido ya con estado 'pagado' y los detalles del pago implícitos
    } catch (error) {
        console.error("Error en controlador crearPedido:", error.message);
        // Errores específicos de la transacción (producto no existe, etc.)
        if (error.message.includes('no encontrado') || error.message.includes('inválido') || error.message.includes('Método de pago')) {
            return res.status(400).json({ message: error.message });
        }
        // Error genérico si la query lanza uno
        if (error.message.includes('No se pudo crear el pedido y registrar el pago')) {
             return res.status(500).json({ message: error.message });
        }
        next(error); // Otros errores al middleware de errores
    }
};

// Actualizar el estado de un pedido (sin cambios)
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
            return res.status(404).json({ message: `Pedido con ID ${id} no encontrado o no se pudo actualizar.` });
        }
        const pedidoCompleto = await pedidoQueries.getPedidoById(pedidoIdInt);
        res.json(pedidoCompleto);
    } catch (error) {
        if (error.message.includes('CK_PEDIDOS_Estado') || error.message.includes('no es válido')) {
             return res.status(400).json({ message: `El estado '${estado}' no es válido.` });
        }
        next(error);
    }
};

const obtenerPedidosParaGestion = async (req, res, next) => {
    const { estado } = req.query;

    if (!estado) {
        return res.status(400).json({ message: 'El parámetro de consulta "estado" es requerido para esta vista.' });
    }
    if (!ESTADOS_PEDIDO_VALIDOS.includes(estado)) {
        return res.status(400).json({ message: `Estado de filtro inválido: ${estado}. Valores permitidos: ${ESTADOS_PEDIDO_VALIDOS.join(', ')}` });
    }

    try {
        // Llama a la nueva función de consulta
        const pedidosConDetalles = await pedidoQueries.getPedidosParaGestionConDetalles(estado);
        res.json(pedidosConDetalles || []);
    } catch (error) {
        console.error(`Error en obtenerPedidosParaGestion con estado ${estado}:`, error);
        next(error);
    }
};

const eliminarPedido = async (req, res, next) => {
    const { id } = req.params;
    const pedidoIdInt = parseInt(id, 10);

    let transaction;
    try {
        // 1. Obtener la transacción 
        transaction = await getTransaction();
        
        // 2. Llamar a la función que ejecuta la consulta
        await pedidoQueries.eliminarPedidoCompleto(pedidoIdInt, transaction);

        // 3. Si todo va bien, confirmar los cambios.
        await transaction.commit();

        res.status(200).json({ message: `Pedido #${pedidoIdInt} y todos sus datos asociados han sido eliminados.` });

    } catch (error) {
        // 4. Si algo falla, revertir todo.
        if (transaction) await transaction.rollback();
        next(error); 
    }
};

module.exports = {
    obtenerTodosLosPedidos,
    obtenerPedidoPorId,
    crearPedido, 
    actualizarEstadoPedido,
    obtenerPedidosParaGestion,
    eliminarPedido,
};