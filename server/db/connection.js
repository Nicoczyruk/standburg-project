// server/db/connection.js
require('dotenv').config();
const sql = require('mssql');

// Configuración de la conexión leída desde .env
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER, 
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT || '1433', 10),
    pool: {
        max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        min: parseInt(process.env.DB_POOL_MIN || '0', 10),
        idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10)
    },
    options: {
        encrypt: process.env.DB_ENCRYPT ? process.env.DB_ENCRYPT === 'true' : true, // Default true for security (Azure)
        trustServerCertificate: process.env.DB_TRUST_CERT
            ? process.env.DB_TRUST_CERT === 'true'
            : process.env.NODE_ENV === 'development',
        useUTC: false,
         
    }
};

let pool = null; // Variable para mantener el pool de conexiones

/**
 * Establece el pool de conexiones global.
 */
const connect = async () => {
    if (pool) return pool; // Si ya existe, no reconectar

    try {
        pool = await new sql.ConnectionPool(dbConfig).connect();
        console.log('Pool de conexión SQL Server establecido exitosamente.');

        pool.on('error', err => {
            console.error('Error en el Pool de SQL Server:', err);
            // Intentar reconectar o manejar el error como sea apropiado
            pool = null; // Marcar como nulo para intentar reconectar en la próxima query
        });

        return pool;
    } catch (err) {
        console.error('Error al conectar con SQL Server:', err);
        pool = null; // Asegurarse que pool sea nulo si falla la conexión inicial
        throw err; // Relanzar para manejo en startServer
    }
};

/**
 * Cierra el pool de conexiones.
 */
const close = async () => {
    if (pool) {
        await pool.close();
        pool = null;
        console.log('Pool de conexión SQL Server cerrado.');
    }
};

/**
 * Ejecuta una consulta SQL usando el pool o una transacción existente.
 * @param {string} sqlQuery La consulta SQL a ejecutar.
 * @param {object} [params={}] Parámetros para la consulta (ej. { id: { type: sql.Int, value: 1 } }).
 * @param {sql.Transaction} [transaction=null] La transacción activa, si existe.
 * @returns {Promise<sql.IResult<any>>} El resultado de la consulta.
 */
const query = async (sqlQuery, params = {}, transaction = null) => {
    if (!pool && !transaction) await connect(); // Asegurar que el pool existe si no hay transacción

    // Determinar si usar el pool o la transacción
    const requestProvider = transaction ? transaction.request() : pool.request();

    try {
        // Añadir parámetros a la solicitud
        for (const key in params) {
            if (Object.hasOwnProperty.call(params, key)) {
                // Asegurarse que el valor no sea undefined, convertir a null si es necesario
                const paramValue = params[key].value === undefined ? null : params[key].value;
                requestProvider.input(key, params[key].type, paramValue);
            }
        }
        // Ejecutar la consulta
        const result = await requestProvider.query(sqlQuery);
        return result;
    } catch (err) {
        // Log detallado del error
        console.error('Error SQL:', err.message);
        console.error('Query:', sqlQuery.substring(0, 200) + (sqlQuery.length > 200 ? '...' : ''));
        if (Object.keys(params).length > 0) {
            console.error('Params:', JSON.stringify(params));
        }
        throw err; // Relanzar el error para manejo superior
    }
};


/**
 * Inicia una nueva transacción.
 * @returns {Promise<sql.Transaction>} La transacción iniciada.
 */
const getTransaction = async () => {
    if (!pool) await connect();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    return transaction;
};

/**
 * Confirma (commit) una transacción.
 * @param {sql.Transaction} transaction La transacción a confirmar.
 */
const commitTransaction = async (transaction) => {
    try {
        await transaction.commit();
    } catch (err) {
        console.error('Error al hacer commit de la transacción:', err);
        // Intentar rollback por si acaso
        try { await transaction.rollback(); } catch (rbErr) { console.error('Error en rollback después de commit fallido:', rbErr); }
        throw err;
    }
};

/**
 * Deshace (rollback) una transacción.
 * @param {sql.Transaction} transaction La transacción a deshacer.
 */
const rollbackTransaction = async (transaction) => {
    try {
        await transaction.rollback();
    } catch (err) {
        console.error('Error al hacer rollback de la transacción:', err);
        throw err;
    }
};

module.exports = {
    connect,
    close,
    query, // Exportamos la función query general
    getTransaction,
    commitTransaction,
    rollbackTransaction,
    sql // Exportar sql para usar los tipos (sql.Int, sql.VarChar, etc.)
};