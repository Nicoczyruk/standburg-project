// server/controllers/gasto.controller.js
const gastoQueries = require('../db/queries/gasto.queries');

const obtenerTodos = async (req, res, next) => {
    const filters = {};
    if (req.query.turno_id) filters.turno_id = parseInt(req.query.turno_id);
    if (req.query.tipo_gasto) filters.tipo_gasto = req.query.tipo_gasto;

    try {
        const gastos = await gastoQueries.getAllGastos(filters);
        res.json(gastos || []);
    } catch (error) {
        next(error);
    }
};

const obtenerPorId = async (req, res, next) => {
    const { id } = req.params;
    const gastoIdInt = parseInt(id);
    if (!Number.isInteger(gastoIdInt) || gastoIdInt <= 0) {
        return res.status(400).json({ message: 'ID de gasto inválido.' });
    }
    try {
        const gasto = await gastoQueries.getGastoById(gastoIdInt);
        if (!gasto) {
            return res.status(404).json({ message: `Gasto con ID ${id} no encontrado.` });
        }
        res.json(gasto);
    } catch (error) {
        next(error);
    }
};

const crear = async (req, res, next) => {
    const { turno_id, tipo_gasto, concepto, monto, notas_adicionales, admin_id_registro = null } = req.body;

    // Validaciones
    if (!tipo_gasto || !gastoQueries.TIPOS_GASTO_VALIDOS.includes(tipo_gasto)) {
        return res.status(400).json({ message: `El campo "tipo_gasto" es obligatorio y debe ser: ${gastoQueries.TIPOS_GASTO_VALIDOS.join(', ')}.` });
    }
    if (!concepto || typeof concepto !== 'string' || concepto.trim() === '') {
        return res.status(400).json({ message: 'El campo "concepto" es obligatorio.' });
    }
    if (monto === undefined || typeof parseFloat(monto) !== 'number' || parseFloat(monto) <= 0) {
        return res.status(400).json({ message: 'El campo "monto" es obligatorio y debe ser un número positivo.' });
    }
    if (turno_id !== undefined && turno_id !== null && (isNaN(parseInt(turno_id)) || parseInt(turno_id) <=0)) {
        return res.status(400).json({ message: 'Si se provee "turno_id", debe ser un ID numérico válido.' });
    }
    

    const gastoData = {
        turno_id: turno_id ? parseInt(turno_id) : null,
        tipo_gasto,
        concepto: concepto.trim(),
        monto: parseFloat(monto),
        admin_id_registro: admin_id_registro ? parseInt(admin_id_registro) : null, // Temporal
        notas_adicionales: notas_adicionales || null
    };

    try {
        const nuevoGasto = await gastoQueries.createGasto(gastoData);
        res.status(201).json(nuevoGasto);
    } catch (error) {
        // Errores de FK o CHECK constraint son manejados en las queries
        if (error.message.includes('no existe') || error.message.includes('inválido') || error.message.includes('debe ser positivo')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

const actualizar = async (req, res, next) => {
    const { id } = req.params;
    const gastoIdInt = parseInt(id);
    if (!Number.isInteger(gastoIdInt) || gastoIdInt <= 0) {
        return res.status(400).json({ message: 'ID de gasto inválido.' });
    }

    // Similar a crear, pero para actualizar
    const { turno_id, tipo_gasto, concepto, monto, notas_adicionales, admin_id_registro = null } = req.body;

    // Validaciones 
    if (!tipo_gasto || !gastoQueries.TIPOS_GASTO_VALIDOS.includes(tipo_gasto)) { /*...*/ }
    if (!concepto || typeof concepto !== 'string' || concepto.trim() === '') { /*...*/ }
    if (monto === undefined || typeof parseFloat(monto) !== 'number' || parseFloat(monto) <= 0) { /*...*/ }

    const gastoData = {
        turno_id: turno_id ? parseInt(turno_id) : null,
        tipo_gasto,
        concepto: concepto.trim(),
        monto: parseFloat(monto),
        admin_id_registro: admin_id_registro ? parseInt(admin_id_registro) : null,
        notas_adicionales: notas_adicionales || null
    };

    try {
        const gastoActualizado = await gastoQueries.updateGasto(gastoIdInt, gastoData);
        if (!gastoActualizado) {
            return res.status(404).json({ message: `Gasto con ID ${id} no encontrado.` });
        }
        res.json(gastoActualizado);
    } catch (error) {
        if (error.message.includes('inválido') || error.message.includes('debe ser positivo')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

const eliminar = async (req, res, next) => {
    const { id } = req.params;
    const gastoIdInt = parseInt(id);
    if (!Number.isInteger(gastoIdInt) || gastoIdInt <= 0) {
        return res.status(400).json({ message: 'ID de gasto inválido.' });
    }
    try {
        const fueEliminado = await gastoQueries.deleteGasto(gastoIdInt);
        if (!fueEliminado) {
            return res.status(404).json({ message: `Gasto con ID ${id} no encontrado.` });
        }
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    obtenerTodos,
    obtenerPorId,
    crear,
    actualizar,
    eliminar,
};