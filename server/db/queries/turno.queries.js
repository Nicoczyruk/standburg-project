// server/db/queries/turno.queries.js
const db = require('../connection');
const sql = require('mssql');

/**
 * Obtiene el turno activo actualmente (aquel sin fecha de cierre).
 * 
 */
const getTurnoActivo = async () => {
    try {
        const queryString = `
            SELECT
                t.turno_id, t.admin_id_apertura, admin_ap.nombre_usuario AS admin_apertura_nombre,
                t.fecha_hora_apertura, t.monto_inicial
            FROM TURNOS t
            LEFT JOIN ADMIN admin_ap ON t.admin_id_apertura = admin_ap.admin_id
            WHERE t.fecha_hora_cierre IS NULL;`;
        const { recordset } = await db.query(queryString);
        return recordset[0]; // Devuelve el turno activo o undefined si no hay ninguno
    } catch (error) {
        console.error('Error al obtener el turno activo:', error);
        throw error;
    }
};

/**
 * Obtiene todos los turnos (historial), incluyendo nombres de admin.
 * @param {object} filters - Objeto con filtros (ej. fechaInicio, fechaFin). TODO: Implementar filtros.
 */
const getAllTurnos = async (filters = {}) => {
    try {
        const queryString = `
            SELECT
                t.turno_id, t.admin_id_apertura, admin_ap.nombre_usuario AS admin_apertura_nombre,
                t.admin_id_cierre, admin_ci.nombre_usuario AS admin_cierre_nombre,
                t.fecha_hora_apertura, t.fecha_hora_cierre,
                t.monto_inicial, t.monto_final_estimado, t.monto_final_real, t.diferencia
            FROM TURNOS t
            LEFT JOIN ADMIN admin_ap ON t.admin_id_apertura = admin_ap.admin_id
            LEFT JOIN ADMIN admin_ci ON t.admin_id_cierre = admin_ci.admin_id
            ORDER BY t.fecha_hora_apertura DESC;`;
        const { recordset } = await db.query(queryString);
        return recordset;
    } catch (error) {
        console.error('Error al obtener todos los turnos:', error);
        throw error;
    }
};

/**
 * Obtiene un turno específico por su ID.
 * @param {number} id - El ID del turno.
 */
const getTurnoById = async (id) => {
    try {
         const queryString = `
            SELECT
                t.turno_id, t.admin_id_apertura, admin_ap.nombre_usuario AS admin_apertura_nombre,
                t.admin_id_cierre, admin_ci.nombre_usuario AS admin_cierre_nombre,
                t.fecha_hora_apertura, t.fecha_hora_cierre,
                t.monto_inicial, t.monto_final_estimado, t.monto_final_real, t.diferencia
            FROM TURNOS t
            LEFT JOIN ADMIN admin_ap ON t.admin_id_apertura = admin_ap.admin_id
            LEFT JOIN ADMIN admin_ci ON t.admin_id_cierre = admin_ci.admin_id
            WHERE t.turno_id = @id;`;
        const { recordset } = await db.query(queryString, { id: { type: sql.Int, value: id } });
        
        return recordset[0];
    } catch (error) {
        console.error(`Error al obtener el turno con ID ${id}:`, error);
        throw error;
    }
};


/**
 * Abre un nuevo turno. Verifica primero si ya existe uno activo.
 * @param {number} admin_id_apertura - ID del admin que abre.
 * @param {number} monto_inicial - Monto inicial en caja.
 */
const abrirTurno = async (admin_id_apertura, monto_inicial) => {
    try {
        // 1. Verificar si ya hay un turno activo
        const turnoActivo = await getTurnoActivo();
        if (turnoActivo) {
            throw new Error(`Ya existe un turno activo (ID: ${turnoActivo.turno_id}) abierto el ${turnoActivo.fecha_hora_apertura}. Ciérrelo antes de abrir uno nuevo.`);
        }

        // 2. Insertar el nuevo turno (estado 'abierto' por defecto al no tener fecha_cierre)
        const result = await db.query(
            `INSERT INTO TURNOS (admin_id_apertura, fecha_hora_apertura, monto_inicial)
             OUTPUT INSERTED.*
             VALUES (@admin_id_apertura, GETDATE(), @monto_inicial);`,
            {
                admin_id_apertura: { type: sql.Int, value: admin_id_apertura },
                monto_inicial: { type: sql.Decimal(10, 2), value: monto_inicial }
            }
        );
        // Devolver el turno recién creado (puede necesitar join para nombre de admin si se quiere completo)
        const turnoCreado = await getTurnoById(result.recordset[0].turno_id);
        return turnoCreado;

    } catch (error) {
        console.error('Error al abrir turno:', error.message);
        if (error.number === 547 && error.message.includes('FK_TURNOS_AdminApertura')) {
            throw new Error(`El admin con ID ${admin_id_apertura} no existe.`);
        }
        throw error; // Relanzar otros errores o el específico
    }
};


/**
 * Cierra un turno activo, calculando totales y diferencia.
 * @param {number} turno_id - ID del turno a cerrar (debe ser el activo).
 * @param {number} admin_id_cierre - ID del admin que cierra.
 * @param {number} monto_final_real - Monto real contado en caja.
 */
const cerrarTurnoTransaction = async (turno_id, admin_id_cierre, monto_final_real) => {
    let transaction;
    try {
        transaction = await db.getTransaction();

        // 1. Validar que el turno_id corresponde al turno activo y obtener monto inicial
        const turnoActivoResult = await db.query(
            'SELECT turno_id, monto_inicial FROM TURNOS WHERE turno_id = @turno_id AND fecha_hora_cierre IS NULL;',
            { turno_id: { type: sql.Int, value: turno_id } },
            transaction
        );
        const turnoActivo = turnoActivoResult.recordset[0];

        if (!turnoActivo) {
            throw new Error(`El turno con ID ${turno_id} no está activo o no existe.`);
        }
        const monto_inicial = turnoActivo.monto_inicial;

        // 2. Calcular el total de ventas (suma de montos de pagos asociados a este turno)
        const pagosResult = await db.query(
            'SELECT SUM(monto) AS total_ventas FROM PAGOS WHERE turno_id = @turno_id;',
            { turno_id: { type: sql.Int, value: turno_id } },
            transaction
        );
        // SUM puede devolver NULL si no hay pagos, convertir a 0 en ese caso
        const total_ventas = pagosResult.recordset[0]?.total_ventas || 0;

        // 3. Calcular montos finales
        const monto_final_estimado = Number(monto_inicial) + Number(total_ventas);
        const diferencia = Number(monto_final_real) - Number(monto_final_estimado);

        // 4. Actualizar el turno para cerrarlo
        const updateResult = await db.query(
            `UPDATE TURNOS SET
                admin_id_cierre = @admin_id_cierre,
                fecha_hora_cierre = GETDATE(),
                monto_final_estimado = @monto_final_estimado,
                monto_final_real = @monto_final_real,
                diferencia = @diferencia
             OUTPUT INSERTED.*
             WHERE turno_id = @turno_id AND fecha_hora_cierre IS NULL;`, // Doble check por si acaso
            {
                turno_id: { type: sql.Int, value: turno_id },
                admin_id_cierre: { type: sql.Int, value: admin_id_cierre },
                monto_final_estimado: { type: sql.Decimal(10, 2), value: monto_final_estimado },
                monto_final_real: { type: sql.Decimal(10, 2), value: monto_final_real },
                diferencia: { type: sql.Decimal(10, 2), value: diferencia }
            },
            transaction
        );

        if (updateResult.rowsAffected[0] === 0) {
            // Podría ocurrir si justo se cerró en otra petición
             throw new Error(`No se pudo cerrar el turno ID ${turno_id} (posiblemente ya estaba cerrado o no existe).`);
        }

        // 5. Confirmar transacción
        await db.commitTransaction(transaction);

        // 6. Devolver el turno cerrado completo
        const turnoCerrado = await getTurnoById(turno_id);
        return turnoCerrado;

    } catch (error) {
        console.error(`Error al cerrar el turno ID ${turno_id} (transacción):`, error.message);
        if (transaction) {
            await db.rollbackTransaction(transaction);
        }
         // Manejar error de FK si admin_id_cierre no existe
        if (error.number === 547 && error.message.includes('FK_TURNOS_AdminCierre')) {
            throw new Error(`El admin con ID ${admin_id_cierre} no existe.`);
        }
        throw new Error(error.message || `No se pudo cerrar el turno ID ${turno_id}.`);
    }
};

module.exports = {
    getAllTurnos,
    getTurnoActivo,
    getTurnoById,
    abrirTurno,
    cerrarTurnoTransaction,
};