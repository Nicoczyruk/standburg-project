// server/controllers/arqueo.controller.js
const arqueoQueries = require('../db/queries/arqueo.queries');

const abrirArqueo = async (req, res, next) => {
    const { monto_inicial } = req.body;
    if (monto_inicial === undefined || isNaN(parseFloat(monto_inicial)) || parseFloat(monto_inicial) < 0) {
        return res.status(400).json({ message: 'El monto inicial es obligatorio y debe ser un número válido.' });
    }

    try {
        const arqueoActivoExistente = await arqueoQueries.getArqueoActivo();
        if (arqueoActivoExistente) {
            return res.status(409).json({ message: 'Ya existe un arqueo de caja activo. Debe cerrarlo antes de abrir uno nuevo.' });
        }

        const nuevoArqueo = await arqueoQueries.abrirArqueo(parseFloat(monto_inicial));
        res.status(201).json({ message: 'Arqueo de caja abierto exitosamente.', arqueo: nuevoArqueo });
    } catch (error) {
        next(error);
    }
};

const obtenerDetallesArqueoActivo = async (req, res, next) => {
    try {
        const arqueoActivo = await arqueoQueries.getArqueoActivo();
        if (!arqueoActivo) { return res.json(null); }
        
        
        const calculos = await arqueoQueries.getCalculosParaPeriodoActivo(
            arqueoActivo.arqueo_id,
            arqueoActivo.fecha_hora_apertura
        );
        
        
        const arqueoConDetalles = {
            ...arqueoActivo,
            calculos: calculos 
        };
        
        res.json(arqueoConDetalles);
    } catch (error) { next(error); }
};

const cerrarArqueo = async (req, res, next) => {
    
    const { monto_cierre_efectivo_real, notas } = req.body;

    if (monto_cierre_efectivo_real === undefined || isNaN(parseFloat(monto_cierre_efectivo_real))) {
        return res.status(400).json({ message: 'El monto de cierre en efectivo es obligatorio.' });
    }
    try {
        const arqueoActivo = await arqueoQueries.getArqueoActivo();
        if (!arqueoActivo) { return res.status(404).json({ message: 'No se encontró un arqueo activo.' }); }
        
        const calculos = await arqueoQueries.getCalculosParaPeriodoActivo(arqueoActivo.arqueo_id, arqueoActivo.fecha_hora_apertura);
        
        const montoInicial = parseFloat(arqueoActivo.monto_inicial);
        const montoEsperadoEfectivo = montoInicial + parseFloat(calculos.ventas_efectivo_calculado) + parseFloat(calculos.movimientos_ingreso_calculado) - parseFloat(calculos.movimientos_egreso_calculado) - parseFloat(calculos.gastos_calculado);
        
        const montoRealEfectivo = parseFloat(monto_cierre_efectivo_real);
        
        const datosCierre = {
            ...calculos,
            monto_final_esperado_efectivo: montoEsperadoEfectivo,
            monto_cierre_efectivo_real: montoRealEfectivo,
            monto_cierre_tarjeta_real: parseFloat(calculos.ventas_tarjeta_calculado),
            monto_cierre_transferencia_real: parseFloat(calculos.ventas_transferencia_calculado),
            diferencia_efectivo: montoRealEfectivo - montoEsperadoEfectivo,
            diferencia_tarjeta: 0,
            diferencia_transferencia: 0, 
            notas_cierre: notas || null 
        };

        const arqueoCerrado = await arqueoQueries.cerrarArqueo(arqueoActivo.arqueo_id, datosCierre);
        res.json({ message: 'Arqueo de caja cerrado exitosamente.', arqueo: arqueoCerrado });
    } catch (error) { next(error); }
};

// Las funciones de historial y obtener por ID no necesitan cambios
const obtenerHistorialArqueos = async (req, res, next) => {
    try {
        const historial = await arqueoQueries.getHistorialArqueos();
        res.json(historial || []);
    } catch (error) {
        next(error);
    }
};

const getArqueoDetalladoById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const arqueo = await arqueoQueries.getArqueoById(parseInt(id));
        if (!arqueo) {
            return res.status(404).json({ message: 'Arqueo no encontrado.' });
        }
        res.json(arqueo);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    abrirArqueo,
    obtenerDetallesArqueoActivo,
    cerrarArqueo, 
    obtenerHistorialArqueos,
    getArqueoDetalladoById
};