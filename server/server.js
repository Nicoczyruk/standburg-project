// server/server.js
require('dotenv').config(); // Carga las variables de .env PRIMERO
const express = require('express');
const cors = require('cors');
const db = require('./db/connection'); // Importa el módulo de conexión

const app = express();
const port = process.env.PORT || 5000;

// --- Middlewares básicos (puedes mantenerlos) ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Ruta de prueba básica (para saber que Express funciona) ---
app.get('/', (req, res) => {
    res.json({ message: 'API Standburg - Servidor funcionando!' });
});

// --- AQUÍ irán las rutas más adelante ---
// 
//

// --- Middleware de Manejo de Errores (dejarlo para el futuro) ---
app.use((err, req, res, next) => {
    console.error('Error no controlado:', err);
    const statusCode = err.status || 500;
    const message = process.env.NODE_ENV === 'production' ? 'Ocurrió un error interno.' : err.message;
    res.status(statusCode).json({ message: message, stack: process.env.NODE_ENV === 'production' ? '🔒' : err.stack });
});

// --- Función para Iniciar Servidor y Conexión BD ---
const startServer = async () => {
    try {
        // 1. Establecer la conexión a la BD
        await db.connect(); // Llama a la función connect que exportamos
        console.log('Conexión a SQL Server establecida exitosamente.');

        // 2. Iniciar el servidor Express SOLO SI la conexión a BD fue exitosa
        app.listen(port, () => {
            console.log(`Servidor Standburg listo en http://localhost:${port}`);
            console.log('El servidor está listo para recibir peticiones.');
            console.log('El pool de conexiones está activo y esperando consultas.');
        });

    } catch (err) {
        // Si db.connect() falla, el error se captura aquí
        console.error('FALLO CRÍTICO: No se pudo conectar a la base de datos al iniciar.', err);
        process.exit(1); // Detiene la aplicación si no hay BD
    }
};

// --- Manejo de Cierre Limpio ---
const shutdown = async (signal) => {
    console.log(`\n${signal} recibido. Cerrando servidor y conexiones...`);
    try {
        // Puedes añadir aquí el cierre del servidor Express si lo deseas (server.close())
        await db.close(); // Llama a la función close que exportamos
        console.log('Pool de conexión SQL Server cerrado.');
        process.exit(0);
    } catch (err) {
        console.error('Error durante el cierre:', err);
        process.exit(1);
    }
};

process.on('SIGTERM', () => shutdown('SIGTERM')); // Señal de terminación estándar
process.on('SIGINT', () => shutdown('SIGINT'));   // Señal de interrupción (Ctrl+C)

// --- Ejecutar Inicio ---
startServer();