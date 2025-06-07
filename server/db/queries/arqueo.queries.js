const db = require('../connection');
const sql = require('mssql');

const getArqueoActivo = async () => {
    try {
        const queryString = `
            SELECT TOP 1
                arqueo_id,
                fecha_hora_apertura,
                monto_inicial
            FROM ARQUEOS_CAJA
            WHERE fecha_hora_cierre IS NULL
            ORDER BY fecha_hora_apertura DESC;`;
        const { recordset } = await db.query(queryString);
        return recordset[0];
    } catch (error) {
        console.error('Error al obtener el arqueo activo:', error);
        throw error;
    }
};

const abrirArqueo = async (monto_inicial) => {
    try {
        const queryString = `
            INSERT INTO ARQUEOS_CAJA (fecha_hora_apertura, monto_inicial)
            OUTPUT INSERTED.*
            VALUES (GETDATE(), @monto_inicial);
        `;
        const result = await db.query(queryString, {
            monto_inicial: { type: sql.Decimal(12, 2), value: monto_inicial }
        });
        return result.recordset[0];
    } catch (error) {
        console.error('Error al abrir arqueo de caja:', error);
        throw error;
    }
};

const getCalculosParaPeriodoActivo = async (arqueo_id, fecha_hora_apertura) => {
    try {
        
        const queryString = `
            SELECT 
                ISNULL((SELECT SUM(monto) FROM PAGOS WHERE metodo = 'efectivo' AND fecha_pago >= @fecha_hora_apertura AND fecha_pago <= GETDATE()), 0) as ventas_efectivo_calculado,
                ISNULL((SELECT SUM(monto) FROM PAGOS WHERE metodo IN ('tarjeta_credito', 'tarjeta_debito') AND fecha_pago >= @fecha_hora_apertura AND fecha_pago <= GETDATE()), 0) as ventas_tarjeta_calculado,
                ISNULL((SELECT SUM(monto) FROM PAGOS WHERE metodo = 'transferencia' AND fecha_pago >= @fecha_hora_apertura AND fecha_pago <= GETDATE()), 0) as ventas_transferencia_calculado,
                ISNULL((SELECT SUM(monto) FROM GASTOS WHERE fecha_gasto >= @fecha_hora_apertura AND fecha_gasto <= GETDATE() AND tipo_gasto IN ('fijo', 'variable')), 0) as gastos_calculado,
                ISNULL((SELECT SUM(monto) FROM MOVIMIENTOS_CAJA WHERE arqueo_id = @arqueo_id AND tipo_movimiento = 'INGRESO'), 0) as movimientos_ingreso_calculado,
                ISNULL((SELECT SUM(monto) FROM MOVIMIENTOS_CAJA WHERE arqueo_id = @arqueo_id AND tipo_movimiento = 'EGRESO'), 0) as movimientos_egreso_calculado;
        `;
        
        const { recordset } = await db.query(queryString, { 
            fecha_hora_apertura: { type: sql.DateTime2, value: fecha_hora_apertura },
            arqueo_id: { type: sql.Int, value: arqueo_id }
        });
        
        return recordset[0];
    } catch (error) {
        console.error('Error al calcular los totales del periodo:', error);
        throw error;
    }
};


const cerrarArqueo = async (arqueo_id, datosCierre) => {
    let transaction;
    try {
        transaction = await db.getTransaction();
        
        
        const updateResult = await db.query(
            `UPDATE ARQUEOS_CAJA SET
                fecha_hora_cierre = GETDATE(),
                ventas_efectivo_calculado = @ventas_efectivo_calculado,
                ventas_tarjeta_calculado = @ventas_tarjeta_calculado,
                ventas_transferencia_calculado = @ventas_transferencia_calculado,
                gastos_calculado = @gastos_calculado,
                monto_final_esperado_efectivo = @monto_final_esperado_efectivo,
                monto_cierre_efectivo_real = @monto_cierre_efectivo_real,
                monto_cierre_tarjeta_real = @monto_cierre_tarjeta_real,
                monto_cierre_transferencia_real = @monto_cierre_transferencia_real,
                diferencia_efectivo = @diferencia_efectivo,
                diferencia_tarjeta = @diferencia_tarjeta,
                diferencia_transferencia = @diferencia_transferencia,
                notas_cierre = @notas_cierre
            OUTPUT INSERTED.*
            WHERE arqueo_id = @arqueo_id;`,
            {
                arqueo_id: { type: sql.Int, value: arqueo_id },
                ventas_efectivo_calculado: { type: sql.Decimal(12, 2), value: datosCierre.ventas_efectivo_calculado },
                ventas_tarjeta_calculado: { type: sql.Decimal(12, 2), value: datosCierre.ventas_tarjeta_calculado },
                ventas_transferencia_calculado: { type: sql.Decimal(12, 2), value: datosCierre.ventas_transferencia_calculado },
                gastos_calculado: { type: sql.Decimal(12, 2), value: datosCierre.gastos_calculado },
                monto_final_esperado_efectivo: { type: sql.Decimal(12, 2), value: datosCierre.monto_final_esperado_efectivo },
                monto_cierre_efectivo_real: { type: sql.Decimal(12, 2), value: datosCierre.monto_cierre_efectivo_real },
                monto_cierre_tarjeta_real: { type: sql.Decimal(12, 2), value: datosCierre.monto_cierre_tarjeta_real },
                monto_cierre_transferencia_real: { type: sql.Decimal(12, 2), value: datosCierre.monto_cierre_transferencia_real },
                diferencia_efectivo: { type: sql.Decimal(12, 2), value: datosCierre.diferencia_efectivo },
                diferencia_tarjeta: { type: sql.Decimal(12, 2), value: datosCierre.diferencia_tarjeta },
                diferencia_transferencia: { type: sql.Decimal(12, 2), value: datosCierre.diferencia_transferencia },
                notas_cierre: { type: sql.NVarChar(sql.MAX), value: datosCierre.notas_cierre }
            },
            transaction
        );
        
        await db.commitTransaction(transaction);
        return updateResult.recordset[0];

    } catch (error) {
        console.error(`Error en cerrarArqueo (ID: ${arqueo_id}):`, error);
        if (transaction) {
            try { await db.rollbackTransaction(transaction); } catch (rbErr) { console.error("Error durante el rollback:", rbErr); }
        }
        throw error;
    }
};


const getHistorialArqueos = async () => {
    try {
        const queryString = `
            SELECT * FROM ARQUEOS_CAJA
            WHERE fecha_hora_cierre IS NOT NULL
            ORDER BY arqueo_id DESC;`;
        const { recordset } = await db.query(queryString);
        return recordset;
    } catch (error) {
        console.error('Error al obtener historial de arqueos:', error);
        throw error;
    }
};

const getArqueoById = async (id) => {
    try {
        const queryString = `SELECT * FROM ARQUEOS_CAJA WHERE arqueo_id = @id;`;
        const { recordset } = await db.query(queryString, { id: { type: sql.Int, value: id } });
        return recordset[0];
    } catch (error) {
        console.error(`Error al obtener el arqueo con ID ${id}:`, error);
        throw error;
    }
};

module.exports = {
    getArqueoActivo,
    abrirArqueo,
    getCalculosParaPeriodoActivo,
    cerrarArqueo,
    getHistorialArqueos,
    getArqueoById
};