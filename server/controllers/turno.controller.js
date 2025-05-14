// server/controllers/turno.controller.js
const turnoQueries = require('../db/queries/turno.queries');

// Obtener historial de turnos
const obtenerTodosLosTurnos = async (req, res, next) => {
    try {
        const turnos = await turnoQueries.getAllTurnos();
        res.json(turnos || []);
    } catch (error) {
        next(error);
    }
};

// Obtener el turno activo actualmente
const obtenerTurnoActivo = async (req, res, next) => {
    try {
        const turnoActivo = await turnoQueries.getTurnoActivo();
        // Si no hay turno activo, devolvemos null o un objeto vacío, no es un error 404
        res.json(turnoActivo || null);
    } catch (error) {
        next(error);
    }
};

// Obtener un turno específico por ID
const obtenerTurnoPorId = async (req, res, next) => {
    const { id } = req.params;
    const turnoIdInt = parseInt(id);

    if (!Number.isInteger(turnoIdInt) || turnoIdInt <= 0) {
        return res.status(400).json({ message: 'ID de turno inválido.' });
    }

    try {
        const turno = await turnoQueries.getTurnoById(turnoIdInt);
        if (!turno) {
            return res.status(404).json({ message: `Turno con ID ${id} no encontrado.` });
        }
        res.json(turno);
    } catch (error) {
        next(error);
    }
};

// Abrir un nuevo turno
const abrirNuevoTurno = async (req, res, next) => {
    const { admin_id_apertura, monto_inicial } = req.body;

    // Validación básica
    if (!admin_id_apertura || !Number.isInteger(parseInt(admin_id_apertura)) || parseInt(admin_id_apertura) <= 0) {
         return res.status(400).json({ message: 'El campo "admin_id_apertura" es obligatorio y debe ser un ID válido.' });
    }
    if (monto_inicial === undefined || typeof parseFloat(monto_inicial) !== 'number' || parseFloat(monto_inicial) < 0) {
         return res.status(400).json({ message: 'El campo "monto_inicial" es obligatorio y debe ser un número no negativo.' });
    }

    try {
        const nuevoTurno = await turnoQueries.abrirTurno(parseInt(admin_id_apertura), parseFloat(monto_inicial));
        res.status(201).json(nuevoTurno);
    } catch (error) {
        // Error si ya hay un turno activo
        if (error.message.includes('Ya existe un turno activo')) {
             return res.status(409).json({ message: error.message }); // 409 Conflict
        }
        // Error si el admin no existe (FK)
        if (error.message.includes('admin con ID') && error.message.includes('no existe')) {
             return res.status(400).json({ message: error.message }); // 400 Bad Request
        }
        next(error);
    }
};

// Cerrar el turno activo
const cerrarTurnoActivo = async (req, res, next) => {
    const { id } = req.params; // ID del turno que se intenta cerrar
    const { admin_id_cierre, monto_final_real } = req.body;
    const turnoIdInt = parseInt(id);


    // Validación básica
    if (!Number.isInteger(turnoIdInt) || turnoIdInt <= 0) {
        return res.status(400).json({ message: 'ID de turno inválido.' });
    }
     if (!admin_id_cierre || !Number.isInteger(parseInt(admin_id_cierre)) || parseInt(admin_id_cierre) <= 0) {
         return res.status(400).json({ message: 'El campo "admin_id_cierre" es obligatorio y debe ser un ID válido.' });
    }
    if (monto_final_real === undefined || typeof parseFloat(monto_final_real) !== 'number' || parseFloat(monto_final_real) < 0) {
         return res.status(400).json({ message: 'El campo "monto_final_real" es obligatorio y debe ser un número no negativo.' });
    }

    try {
        const turnoCerrado = await turnoQueries.cerrarTurnoTransaction(turnoIdInt, parseInt(admin_id_cierre), parseFloat(monto_final_real));
        res.json(turnoCerrado);
    } catch (error) {
        // Errores específicos de la transacción (no activo, no existe, admin cierre no existe)
        if (error.message.includes('no está activo o no existe') || error.message.includes('ya estaba cerrado')) {
             return res.status(404).json({ message: error.message }); // 404 Not Found o 409 Conflict?
        }
        if (error.message.includes('admin con ID') && error.message.includes('no existe')) {
             return res.status(400).json({ message: error.message }); // 400 Bad Request
        }
        if (error.message.includes('No se pudo cerrar el turno')) {
            return res.status(500).json({ message: error.message }); // Error interno
        }
        next(error);
    }
};


module.exports = {
    obtenerTodosLosTurnos,
    obtenerTurnoActivo,
    obtenerTurnoPorId,
    abrirNuevoTurno,
    cerrarTurnoActivo,
};