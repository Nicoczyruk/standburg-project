// server/db/connection.js
const sql = require('mssql');

const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '1433', 10),
    pool: {
        max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        min: parseInt(process.env.DB_POOL_MIN || '0', 10),
        idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10)
    },
    options: {
        // Lee DB_ENCRYPT de .env, por defecto 'true' si no se especifica para mantener compatibilidad Azure
        encrypt: process.env.DB_ENCRYPT ? process.env.DB_ENCRYPT === 'true' : true,
        // Lee DB_TRUST_CERT de .env; si no está, usa NODE_ENV como antes
        trustServerCertificate: process.env.DB_TRUST_CERT
            ? process.env.DB_TRUST_CERT === 'true'
            : process.env.NODE_ENV === 'development'
    }
};

let pool = null; // Variable para guardar el pool de conexión

/**
 * Establece el pool de conexión global.
 * Llama a esta función una vez al iniciar el servidor.
 */
const connect = async () => {
    if (pool) return pool; // Si ya existe, no crea uno nuevo
    try {
        console.log(`Intentando conectar a SQL Server en ${dbConfig.server}...`);
        pool = await sql.connect(dbConfig);
        console.log('Pool de conexión SQL Server establecido exitosamente.');
        pool.on('error', err => {
            console.error('Error en el pool de conexión SQL Server:', err);
            // Aquí podrías añadir lógica para intentar reconectar si es necesario
        });
        return pool;
    } catch (err) {
        console.error('Error al conectar con SQL Server:', err);
        pool = null; // Resetea el pool si falla la conexión
        throw err; // Propaga el error para detener el inicio si es crítico
    }
};

/**
 * Cierra el pool de conexión global.
 * Llama a esta función cuando el servidor se apague.
 */
const close = async () => {
    if (pool) {
        try {
            await pool.close();
            pool = null;
            console.log('Pool de conexión SQL Server cerrado.');
        } catch (err) {
            console.error('Error cerrando el pool de conexión SQL Server:', err);
            pool = null;
        }
    }
};

/**
 * Obtiene el pool de conexión. Lanza un error si no está inicializado.
 * Las funciones de query usarán esto.
 */
const getPool = () => {
    if (!pool) {
        throw new Error('Pool de conexión no inicializado. Asegúrate de llamar a connect() al inicio.');
    }
    return pool;
};

/**
 * Función helper para ejecutar queries de forma segura usando el pool.
 * @param {string} queryText - La consulta SQL con parámetros (@paramName).
 * @param {object} [params={}] - Objeto con los parámetros { paramName: value }.
 * @returns {Promise<sql.IResult<any>>} El resultado de la consulta.
 */
const query = async (queryText, params = {}) => {
    const currentPool = getPool(); // Obtiene el pool (o lanza error si no existe)
    try {
        const request = currentPool.request();
        // Añadir parámetros de forma segura
        for (const key in params) {
            if (Object.hasOwnProperty.call(params, key)) {
                // Intenta detectar el tipo 
                let sqlType;
                const value = params[key];
                if (typeof value === 'number' && Number.isInteger(value)) sqlType = sql.Int;
                else if (typeof value === 'number') sqlType = sql.Float;
                else if (typeof value === 'boolean') sqlType = sql.Bit;
                else if (value instanceof Date) sqlType = sql.DateTime;
                else sqlType = sql.NVarChar; // Por defecto para strings y otros

                request.input(key, sqlType, value);
            }
        }
        // Ejecuta la query
        const result = await request.query(queryText);
        return result; // Contiene .recordset, .rowsAffected, etc.
    } catch (err) {
        console.error('Error ejecutando query:', { queryText });
        console.error(err);
        throw err; // Relanza el error para manejo superior
    }
};

// Exportamos las funciones necesarias
module.exports = {
    connect, // Para iniciar la conexión desde server.js
    close,   // Para cerrar la conexión desde server.js
    getPool, // Para obtener el pool si se necesita directamente (ej. transacciones)
    query,   // Helper para ejecutar queries desde los archivos *.queries.js
    sql      // Para acceder a los tipos de datos (sql.Int, etc.) en los archivos *.queries.js
};