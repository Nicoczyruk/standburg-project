// server/controllers/pago.controller.js
const pagoQueries = require('../db/queries/pago.queries');

// Obtener todos los pagos con filtros
const obtenerTodosLosPagos = async (req, res, next) => {
    const { pedido_id, turno_id, metodo_pago } = req.query;
    const filters = {};

    // Validar filtros si existen
    if (pedido_id) {
        const pedidoIdInt = parseInt(pedido_id);
        if (!Number.isInteger(pedidoIdInt) || pedidoIdInt <= 0) {
             return res.status(400).json({ message: 'ID de pedido inválido en el filtro.' });
        }
        filters.pedido_id = pedidoIdInt;
    }
    if (turno_id) {
         const turnoIdInt = parseInt(turno_id);
        if (!Number.isInteger(turnoIdInt) || turnoIdInt <= 0) {
             return res.status(400).json({ message: 'ID de turno inválido en el filtro.' });
        }
        filters.turno_id = turnoIdInt;
    }
    if (metodo_pago) {
        if (!pagoQueries.METODOS_PAGO_VALIDOS.includes(metodo_pago)) {
            return res.status(400).json({ message: `Método de pago inválido en el filtro. Válidos: ${pagoQueries.METODOS_PAGO_VALIDOS.join(', ')}` });
        }
        filters.metodo_pago = metodo_pago;
    }

    try {
        const pagos = await pagoQueries.getAllPagos(filters);
        res.json(pagos || []);
    } catch (error) {
        next(error);
    }
};

// Obtener un pago por ID
const obtenerPagoPorId = async (req, res, next) => {
    const { id } = req.params;
    const pagoIdInt = parseInt(id);

    if (!Number.isInteger(pagoIdInt) || pagoIdInt <= 0) {
        return res.status(400).json({ message: 'ID de pago inválido.' });
    }

    try {
        const pago = await pagoQueries.getPagoById(pagoIdInt);
        if (!pago) {
            return res.status(404).json({ message: `Pago con ID ${id} no encontrado.` });
        }
        res.json(pago);
    } catch (error) {
        next(error);
    }
};

// Crear un nuevo pago
const crearPago = async (req, res, next) => {
    const { pedido_id, turno_id, metodo_pago, monto } = req.body;

    // Validación de entrada
    // TODO: Usar express-validator
    if (!pedido_id || !Number.isInteger(parseInt(pedido_id)) || parseInt(pedido_id) <= 0) {
         return res.status(400).json({ message: 'El campo "pedido_id" es obligatorio y debe ser un ID válido.' });
    }
    if (turno_id !== undefined && turno_id !== null && (!Number.isInteger(parseInt(turno_id)) || parseInt(turno_id) <= 0)) {
         return res.status(400).json({ message: 'El campo "turno_id" debe ser un ID válido si se proporciona.' });
    }
     if (!metodo_pago || !pagoQueries.METODOS_PAGO_VALIDOS.includes(metodo_pago)) {
         return res.status(400).json({ message: `El campo "metodo_pago" es obligatorio y debe ser uno de: ${pagoQueries.METODOS_PAGO_VALIDOS.join(', ')}.` });
    }
     if (monto === undefined || typeof parseFloat(monto) !== 'number' || parseFloat(monto) <= 0) {
         return res.status(400).json({ message: 'El campo "monto" es obligatorio y debe ser un número positivo.' });
    }

    const pagoData = {
        pedido_id: parseInt(pedido_id),
        turno_id: (turno_id === undefined || turno_id === null) ? null : parseInt(turno_id),
        metodo_pago: metodo_pago,
        monto: parseFloat(monto)
    };

    try {
        const nuevoPago = await pagoQueries.createPagoTransaction(pagoData);
        res.status(201).json(nuevoPago);
    } catch (error) {
        // Errores específicos de la transacción (pedido no existe, monto incorrecto, etc.)
        if (error.message.includes('pedido con ID') || error.message.includes('monto del pago') || error.message.includes('Método de pago') || error.message.includes('ya se encuentra pagado') || error.message.includes('pedido cancelado')) {
            return res.status(400).json({ message: error.message }); // 400 Bad Request
        }
        if (error.message.includes('No se pudo registrar el pago')) {
             return res.status(500).json({ message: error.message }); // Podría ser un error interno
        }
        next(error); // Otros errores
    }
};

// Eliminar (Anular) un pago
const eliminarPago = async (req, res, next) => {
    const { id } = req.params;
    const pagoIdInt = parseInt(id);

    if (!Number.isInteger(pagoIdInt) || pagoIdInt <= 0) {
        return res.status(400).json({ message: 'ID de pago inválido.' });
    }

    try {
        const fueEliminado = await pagoQueries.deletePagoTransaction(pagoIdInt);
        if (!fueEliminado) {
             // Esto no debería ocurrir si la transacción maneja el error de "no encontrado"
            return res.status(404).json({ message: `Pago con ID ${id} no encontrado.` });
        }
        res.status(204).send(); // 204 No Content
    } catch (error) {
        if (error.message.includes('no encontrado')) {
             return res.status(404).json({ message: error.message });
        }
         if (error.message.includes('No se pudo anular el pago')) {
             return res.status(500).json({ message: error.message });
        }
        next(error);
    }
};


module.exports = {
    obtenerTodosLosPagos,
    obtenerPagoPorId,
    crearPago,
    eliminarPago,
};