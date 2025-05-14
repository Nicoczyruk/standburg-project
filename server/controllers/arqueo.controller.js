// server/controllers/arqueo.controller.js
const arqueoQueries = require('../db/queries/arqueo.queries');

const abrirNuevoArqueo = async (req, res, next) => {
    const { monto_inicial } = req.body;

    if (monto_inicial === undefined || typeof parseFloat(monto_inicial) !== 'number' || parseFloat(monto_inicial) < 0) {
        return res.status(400).json({ message: 'El campo "monto_inicial" es obligatorio y debe ser un número no negativo.' });
    }

    try {
        const nuevoArqueo = await arqueoQueries.abrirArqueo(parseFloat(monto_inicial));
        res.status(201).json(nuevoArqueo);
    } catch (error) {
        if (error.message.includes('Ya existe un arqueo de caja activo')) {
            return res.status(409).json({ message: error.message }); // 409 Conflict
        }
        next(error);
    }
};

const cerrarArqueoActivo = async (req, res, next) => {
    const { monto_cierre_efectivo_real, monto_cierre_tarjeta_real, monto_cierre_transferencia_real, notas_cierre } = req.body;

    // Validaciones de los montos reales
    if (monto_cierre_efectivo_real === undefined || isNaN(parseFloat(monto_cierre_efectivo_real))) {
        return res.status(400).json({ message: 'Monto de cierre en efectivo real es requerido y debe ser un número.' });
    }
    if (monto_cierre_tarjeta_real === undefined || isNaN(parseFloat(monto_cierre_tarjeta_real))) {
        return res.status(400).json({ message: 'Monto de cierre de tarjeta real es requerido y debe ser un número.' });
    }
    if (monto_cierre_transferencia_real === undefined || isNaN(parseFloat(monto_cierre_transferencia_real))) {
        return res.status(400).json({ message: 'Monto de cierre de transferencia real es requerido y debe ser un número.' });
    }
    
    try {
        const arqueoActivo = await arqueoQueries.getArqueoActivo();
        if (!arqueoActivo) {
            return res.status(404).json({ message: 'No hay ningún arqueo de caja activo para cerrar.' });
        }

        const arqueoCerrado = await arqueoQueries.cerrarArqueo(
            arqueoActivo.arqueo_id,
            parseFloat(monto_cierre_efectivo_real),
            parseFloat(monto_cierre_tarjeta_real),
            parseFloat(monto_cierre_transferencia_real),
            notas_cierre || null
        );
        res.json(arqueoCerrado);
    } catch (error) {
        if (error.message.includes('no encontrado') || error.message.includes('No hay ningún arqueo')) {
            return res.status(404).json({ message: error.message });
        }
        if (error.message.includes('no pudo cerrar el arqueo')) {
             return res.status(500).json({ message: error.message });
        }
        next(error);
    }
};

const obtenerArqueoActivoActual = async (req, res, next) => {
    try {
        const arqueo = await arqueoQueries.getArqueoActivo();
        // Si no hay arqueo activo, es válido devolver null o un objeto indicándolo
        res.json(arqueo || { message: "No hay arqueo activo actualmente." });
    } catch (error) {
        next(error);
    }
};

const obtenerHistorial = async (req, res, next) => {
    try {
        const historial = await arqueoQueries.getHistorialArqueos(/* filters */);
        res.json(historial || []);
    } catch (error) {
        next(error);
    }
};

const obtenerArqueoPorIdDetallado = async (req, res, next) => {
    const { id } = req.params;
    const arqueoIdInt = parseInt(id);

    if (isNaN(arqueoIdInt) || arqueoIdInt <= 0) {
        return res.status(400).json({ message: 'ID de arqueo inválido.' });
    }

    try {
        const arqueo = await arqueoQueries.getArqueoById(arqueoIdInt);
        if (!arqueo) {
            return res.status(404).json({ message: `Arqueo con ID ${id} no encontrado.` });
        }
        res.json(arqueo);
    } catch (error) {
        next(error);
    }
};


module.exports = {
    abrirNuevoArqueo,
    cerrarArqueoActivo,
    obtenerArqueoActivoActual,
    obtenerHistorial,
    obtenerArqueoPorIdDetallado
};