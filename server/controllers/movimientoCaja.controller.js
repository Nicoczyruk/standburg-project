// server/controllers/movimientoCaja.controller.js
const movimientoQueries = require('../db/queries/movimientoCaja.queries');
const arqueoQueries = require('../db/queries/arqueo.queries'); // Para obtener arqueo_id activo

const crear = async (req, res, next) => {
    const { tipo_movimiento, descripcion, monto, fecha, metodo_pago_afectado } = req.body;
   
    if (!tipo_movimiento || !movimientoQueries.TIPOS_MOVIMIENTO_VALIDOS.includes(tipo_movimiento)) {
        return res.status(400).json({ message: `El campo "tipo_movimiento" es obligatorio y debe ser: ${movimientoQueries.TIPOS_MOVIMIENTO_VALIDOS.join(', ')}.` });
    }
    if (!descripcion || typeof descripcion !== 'string' || descripcion.trim() === '') {
        return res.status(400).json({ message: 'El campo "descripcion" es obligatorio.' });
    }
    if (monto === undefined || typeof parseFloat(monto) !== 'number' || parseFloat(monto) <= 0) {
        return res.status(400).json({ message: 'El campo "monto" es obligatorio y debe ser un número positivo.' });
    }
    let fecha_hora_movimiento_iso;
    if (fecha) {
        const parsedDate = new Date(fecha);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: 'La fecha proporcionada no es válida.' });
        }
        fecha_hora_movimiento_iso = parsedDate.toISOString();
    } else {
        fecha_hora_movimiento_iso = new Date().toISOString(); // Usar fecha actual si no se provee
    }

    try {
        
        const arqueoActivo = await arqueoQueries.getArqueoActivo();
        const arqueo_id_actual = arqueoActivo ? arqueoActivo.arqueo_id : null;

        const movimientoData = {
            fecha_hora_movimiento: fecha_hora_movimiento_iso,
            tipo_movimiento,
            descripcion: descripcion.trim(),
            monto: parseFloat(monto),
            metodo_pago_afectado: metodo_pago_afectado || null,
            arqueo_id: arqueo_id_actual
            
        };

        const nuevoMovimiento = await movimientoQueries.createMovimientoCaja(movimientoData);
        res.status(201).json(nuevoMovimiento);
    } catch (error) {
        if (error.message.includes('inválido') || error.message.includes('debe ser positivo') || error.message.includes('no existe')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

const obtenerTodos = async (req, res, next) => {
    const { fecha, tipo_movimiento } = req.query; // El frontend filtra por 'fecha'
    const filters = {};

    if (fecha) {
        // Asumimos que el frontend envía la fecha en un formato que new Date() puede parsear a YYYY-MM-DD
        // Para filtrar por un día completo:
        const dateObj = new Date(fecha);
        if (!isNaN(dateObj.getTime())) {
            filters.fecha_desde = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0).toISOString();
            filters.fecha_hasta = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999).toISOString();
        } else {
            return res.status(400).json({ message: "Formato de fecha para filtro inválido."});
        }
    }
    if (tipo_movimiento) {
        filters.tipo_movimiento = tipo_movimiento;
    }

    try {
        const movimientos = await movimientoQueries.getAllMovimientosCaja(filters);
        res.json(movimientos || []);
    } catch (error) {
        next(error);
    }
};

const obtenerPorId = async (req, res, next) => {
    const { id } = req.params;
    const movimientoIdInt = parseInt(id);
    if (isNaN(movimientoIdInt) || movimientoIdInt <= 0) {
        return res.status(400).json({ message: 'ID de movimiento inválido.' });
    }
    try {
        const movimiento = await movimientoQueries.getMovimientoCajaById(movimientoIdInt);
        if (!movimiento) {
            return res.status(404).json({ message: `Movimiento de caja con ID ${id} no encontrado.` });
        }
        res.json(movimiento);
    } catch (error) {
        next(error);
    }
};

const actualizar = async (req, res, next) => {
    const { id } = req.params;
    const movimientoIdInt = parseInt(id);
    if (isNaN(movimientoIdInt) || movimientoIdInt <= 0) {
        return res.status(400).json({ message: 'ID de movimiento inválido.' });
    }

    const { tipo_movimiento, descripcion, monto, fecha, metodo_pago_afectado } = req.body;

    if (!tipo_movimiento || !movimientoQueries.TIPOS_MOVIMIENTO_VALIDOS.includes(tipo_movimiento)) {
        return res.status(400).json({ message: `El campo "tipo_movimiento" es obligatorio y debe ser: ${movimientoQueries.TIPOS_MOVIMIENTO_VALIDOS.join(', ')}.` });
    }
    if (!descripcion || typeof descripcion !== 'string' || descripcion.trim() === '') {
        return res.status(400).json({ message: 'El campo "descripcion" es obligatorio.' });
    }
    if (monto === undefined || typeof parseFloat(monto) !== 'number' || parseFloat(monto) <= 0) {
        return res.status(400).json({ message: 'El campo "monto" es obligatorio y debe ser un número positivo.' });
    }
    
    let fecha_hora_movimiento_iso;
    if (fecha) {
        const parsedDate = new Date(fecha);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: 'La fecha proporcionada no es válida para la actualización.' });
        }
        // Mantener la hora original si es posible, o ajustar si solo se cambia la fecha
        const movimientoExistente = await movimientoQueries.getMovimientoCajaById(movimientoIdInt);
        if (!movimientoExistente) {
            return res.status(404).json({ message: `Movimiento con ID ${id} no encontrado para actualizar.` });
        }
        const fechaOriginal = new Date(movimientoExistente.fecha_hora_movimiento);
        parsedDate.setHours(fechaOriginal.getHours(), fechaOriginal.getMinutes(), fechaOriginal.getSeconds(), fechaOriginal.getMilliseconds());
        fecha_hora_movimiento_iso = parsedDate.toISOString();

    } else {
        // Si no se provee fecha, se mantiene la existente. Esto requiere buscarla primero.
        const movimientoExistente = await movimientoQueries.getMovimientoCajaById(movimientoIdInt);
        if (!movimientoExistente) {
            return res.status(404).json({ message: `Movimiento con ID ${id} no encontrado para actualizar.` });
        }
        fecha_hora_movimiento_iso = movimientoExistente.fecha_hora_movimiento;
    }


    const movimientoData = {
        tipo_movimiento,
        descripcion: descripcion.trim(),
        monto: parseFloat(monto),
        fecha_hora_movimiento: fecha_hora_movimiento_iso,
        metodo_pago_afectado: metodo_pago_afectado || null
    };

    try {
        const movimientoActualizado = await movimientoQueries.updateMovimientoCaja(movimientoIdInt, movimientoData);
        if (!movimientoActualizado) {
            return res.status(404).json({ message: `Movimiento con ID ${id} no encontrado.` });
        }
        res.json(movimientoActualizado);
    } catch (error) {
        next(error);
    }
};

const eliminar = async (req, res, next) => {
    const { id } = req.params;
    const movimientoIdInt = parseInt(id);

    if (isNaN(movimientoIdInt) || movimientoIdInt <= 0) {
        return res.status(400).json({ message: 'ID de movimiento inválido.' });
    }

    try {
        const movimientoEliminado = await movimientoQueries.deleteMovimientoCaja(movimientoIdInt);
        if (!movimientoEliminado) {
            return res.status(404).json({ message: `Movimiento con ID ${id} no encontrado.` });
        }
        // res.status(204).send(); // 204 No Content es común para DELETE exitoso
        res.json({ message: 'Movimiento eliminado exitosamente.', movimiento: movimientoEliminado });
    } catch (error) {
        next(error);
    }
};


module.exports = {
    crear,
    obtenerTodos,
    obtenerPorId,
    actualizar, 
    eliminar
};