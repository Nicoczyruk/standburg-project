// server/db/queries/arqueo.queries.js
const db = require('../connection');
const sql = require('mssql');

// --- getArqueoActivo, abrirArqueo, getHistorialArqueos, getArqueoById se mantienen igual que en la respuesta anterior ---
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
        const activo = await getArqueoActivo();
        if (activo) {
            throw new Error(`Ya existe un arqueo de caja activo (ID: ${activo.arqueo_id}) abierto el ${new Date(activo.fecha_hora_apertura).toLocaleString()}. Por favor, ciérrelo primero.`);
        }

        const result = await db.query(
            `INSERT INTO ARQUEOS_CAJA (fecha_hora_apertura, monto_inicial)
             OUTPUT INSERTED.arqueo_id, INSERTED.fecha_hora_apertura, INSERTED.monto_inicial
             VALUES (GETDATE(), @monto_inicial);`,
            {
                monto_inicial: { type: sql.Decimal(12, 2), value: monto_inicial }
            }
        );
        return result.recordset[0];
    } catch (error) {
        console.error('Error al abrir arqueo:', error.message);
        throw error;
    }
};

const cerrarArqueo = async (arqueo_id, monto_cierre_efectivo_real, monto_cierre_tarjeta_real, monto_cierre_transferencia_real, notas_cierre) => {
    let transaction;
    try {
        transaction = await db.getTransaction();

        const arqueoActualResult = await db.query(
            'SELECT arqueo_id, fecha_hora_apertura, monto_inicial FROM ARQUEOS_CAJA WHERE arqueo_id = @arqueo_id AND fecha_hora_cierre IS NULL;',
            { arqueo_id: { type: sql.Int, value: arqueo_id } },
            transaction
        );
        const arqueoActual = arqueoActualResult.recordset[0];

        if (!arqueoActual) {
            throw new Error(`Arqueo con ID ${arqueo_id} no encontrado, no está activo o ya fue cerrado.`);
        }

        const fecha_hora_apertura = arqueoActual.fecha_hora_apertura;
        const monto_inicial = parseFloat(arqueoActual.monto_inicial);
        const fecha_hora_cierre_actual = new Date();

        // 1. Ventas de PEDIDOS (solo el total, ya que no hay desglose por método en PEDIDOS)
        const ventasPedidosResult = await db.query(
            `SELECT ISNULL(SUM(total), 0) AS total_ventas_pedidos
             FROM PEDIDOS
             WHERE estado IN ('entregado', 'pagado') 
               AND fecha_hora >= @fecha_hora_apertura 
               AND fecha_hora <= @fecha_hora_cierre_actual;`,
            {
                fecha_hora_apertura: { type: sql.DateTime2, value: fecha_hora_apertura },
                fecha_hora_cierre_actual: { type: sql.DateTime2, value: fecha_hora_cierre_actual }
            },
            transaction
        );
        const total_ventas_pedidos_calculado = parseFloat(ventasPedidosResult.recordset[0].total_ventas_pedidos);
        
        // Para ARQUEOS_CAJA, las ventas "calculadas" por método serán 0,
        // ya que el desglose real vendrá del conteo manual.
        // El 'total_ventas_pedidos_calculado' se considera para el efectivo esperado.
        const ventas_efectivo_calculado = total_ventas_pedidos_calculado; // Asumimos que todo afecta efectivo
        const ventas_tarjeta_calculado = 0;
        const ventas_transferencia_calculado = 0;
        
        // 2. Gastos
        const gastosResult = await db.query(
            'SELECT ISNULL(SUM(monto), 0) AS total FROM GASTOS WHERE fecha_gasto >= @fecha_hora_apertura AND fecha_gasto <= @fecha_hora_cierre_actual;',
            {
                fecha_hora_apertura: { type: sql.DateTime2, value: fecha_hora_apertura },
                fecha_hora_cierre_actual: { type: sql.DateTime2, value: fecha_hora_cierre_actual }
            },
            transaction
        );
        const gastos_calculado = parseFloat(gastosResult.recordset[0].total);

        // 3. Ingresos manuales de efectivo desde MOVIMIENTOS_CAJA
        const ingresosManualesResult = await db.query(
            `SELECT ISNULL(SUM(monto), 0) AS total 
             FROM MOVIMIENTOS_CAJA 
             WHERE tipo_movimiento = 'INGRESO' 
               AND (metodo_pago_afectado = 'efectivo' OR metodo_pago_afectado IS NULL) -- O cómo identifiques que afecta efectivo
               AND fecha_hora_movimiento >= @fecha_hora_apertura 
               AND fecha_hora_movimiento <= @fecha_hora_cierre_actual;`,
            {
                fecha_hora_apertura: { type: sql.DateTime2, value: fecha_hora_apertura },
                fecha_hora_cierre_actual: { type: sql.DateTime2, value: fecha_hora_cierre_actual }
            },
            transaction
        );
        const ingresos_manuales_efectivo = parseFloat(ingresosManualesResult.recordset[0].total);

        // 4. Egresos manuales de efectivo desde MOVIMIENTOS_CAJA
        const egresosManualesResult = await db.query(
            `SELECT ISNULL(SUM(monto), 0) AS total 
             FROM MOVIMIENTOS_CAJA 
             WHERE tipo_movimiento = 'EGRESO' 
               AND (metodo_pago_afectado = 'efectivo' OR metodo_pago_afectado IS NULL) -- O cómo identifiques que afecta efectivo
               AND fecha_hora_movimiento >= @fecha_hora_apertura 
               AND fecha_hora_movimiento <= @fecha_hora_cierre_actual;`,
            {
                fecha_hora_apertura: { type: sql.DateTime2, value: fecha_hora_apertura },
                fecha_hora_cierre_actual: { type: sql.DateTime2, value: fecha_hora_cierre_actual }
            },
            transaction
        );
        const egresos_manuales_efectivo = parseFloat(egresosManualesResult.recordset[0].total);

        // 5. Calcular montos finales y diferencias
        const monto_final_esperado_efectivo = monto_inicial 
                                            + total_ventas_pedidos_calculado // Se suma el total de pedidos
                                            + ingresos_manuales_efectivo
                                            - egresos_manuales_efectivo
                                            - gastos_calculado;
        
        const diferencia_efectivo = parseFloat(monto_cierre_efectivo_real) - monto_final_esperado_efectivo;
        // Las diferencias de tarjeta y transferencia serán el monto contado, ya que el "calculado" por ventas de pedidos es 0.
        // Si tienes movimientos manuales de tarjeta/transferencia en MOVIMIENTOS_CAJA, deberías sumarlos/restarlos también aquí.
        const diferencia_tarjeta = parseFloat(monto_cierre_tarjeta_real) - 0; // Asumiendo 0 ventas de pedidos por tarjeta
        const diferencia_transferencia = parseFloat(monto_cierre_transferencia_real) - 0; // Asumiendo 0 ventas de pedidos por transf.

        // 6. Actualizar el arqueo
        const updateResult = await db.query(
            `UPDATE ARQUEOS_CAJA SET
                fecha_hora_cierre = @fecha_hora_cierre_actual,
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
                fecha_hora_cierre_actual: { type: sql.DateTime2, value: fecha_hora_cierre_actual },
                ventas_efectivo_calculado: { type: sql.Decimal(12,2), value: ventas_efectivo_calculado}, // Total de pedidos
                ventas_tarjeta_calculado: { type: sql.Decimal(12,2), value: ventas_tarjeta_calculado}, // 0
                ventas_transferencia_calculado: { type: sql.Decimal(12,2), value: ventas_transferencia_calculado}, // 0
                gastos_calculado: { type: sql.Decimal(12,2), value: gastos_calculado},
                monto_final_esperado_efectivo: { type: sql.Decimal(12,2), value: monto_final_esperado_efectivo},
                monto_cierre_efectivo_real: { type: sql.Decimal(12,2), value: parseFloat(monto_cierre_efectivo_real)},
                monto_cierre_tarjeta_real: { type: sql.Decimal(12,2), value: parseFloat(monto_cierre_tarjeta_real)},
                monto_cierre_transferencia_real: { type: sql.Decimal(12,2), value: parseFloat(monto_cierre_transferencia_real)},
                diferencia_efectivo: { type: sql.Decimal(12,2), value: diferencia_efectivo},
                diferencia_tarjeta: { type: sql.Decimal(12,2), value: diferencia_tarjeta},
                diferencia_transferencia: { type: sql.Decimal(12,2), value: diferencia_transferencia},
                notas_cierre: { type: sql.NVarChar(sql.MAX), value: notas_cierre }
            },
            transaction
        );

        if (updateResult.rowsAffected[0] === 0) {
            throw new Error(`No se pudo cerrar el arqueo ID ${arqueo_id}.`);
        }

        await db.commitTransaction(transaction);
        return await getArqueoById(arqueo_id); // Devolver el arqueo completo actualizado

    } catch (error) {
        console.error(`Error al cerrar el arqueo ID ${arqueo_id} (transacción):`, error.message);
        if (transaction && transaction._aborted === false && transaction._completed === false ) {
            try { await db.rollbackTransaction(transaction); } catch (rbErr) { console.error("Error durante el rollback:", rbErr); }
        }
        throw error;
    }
};

const getHistorialArqueos = async (filters = {}) => {
    try {
        let queryString = `
            SELECT arqueo_id, fecha_hora_apertura, monto_inicial, 
                   fecha_hora_cierre, ventas_efectivo_calculado, ventas_tarjeta_calculado, ventas_transferencia_calculado,
                   gastos_calculado, monto_final_esperado_efectivo, monto_cierre_efectivo_real,
                   monto_cierre_tarjeta_real, monto_cierre_transferencia_real,
                   diferencia_efectivo, diferencia_tarjeta, diferencia_transferencia, notas_cierre
            FROM ARQUEOS_CAJA
            WHERE fecha_hora_cierre IS NOT NULL`; 

        const params = {};
        if (filters.fecha_desde) {
            queryString += ' AND fecha_hora_apertura >= @fecha_desde';
            params.fecha_desde = { type: sql.DateTime2, value: filters.fecha_desde };
        }
        if (filters.fecha_hasta) {
            queryString += ' AND fecha_hora_apertura <= @fecha_hasta'; // O fecha_hora_cierre, según necesidad
            params.fecha_hasta = { type: sql.DateTime2, value: filters.fecha_hasta };
        }

        queryString += ' ORDER BY fecha_hora_cierre DESC;';

        const { recordset } = await db.query(queryString, params);
        return recordset;
    } catch (error) {
        console.error('Error al obtener historial de arqueos:', error);
        throw error;
    }
};

const getArqueoById = async (id) => {
    try {
        const queryString = `
            SELECT arqueo_id, fecha_hora_apertura, monto_inicial, 
                   fecha_hora_cierre, ventas_efectivo_calculado, ventas_tarjeta_calculado, ventas_transferencia_calculado,
                   gastos_calculado, monto_final_esperado_efectivo, monto_cierre_efectivo_real,
                   monto_cierre_tarjeta_real, monto_cierre_transferencia_real,
                   diferencia_efectivo, diferencia_tarjeta, diferencia_transferencia, notas_cierre
            FROM ARQUEOS_CAJA
            WHERE arqueo_id = @id;`;
        const { recordset } = await db.query(queryString, { id: { type: sql.Int, value: id } });
        return recordset[0];
    } catch (error) {
        console.error(`Error al obtener el arqueo con ID ${id}:`, error);
        throw error;
    }
};


module.exports = {
    abrirArqueo,
    cerrarArqueo,
    getArqueoActivo,
    getHistorialArqueos,
    getArqueoById
};