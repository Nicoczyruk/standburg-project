// server/controllers/mesa.controller.js
const mesaQueries = require('../db/queries/mesa.queries');

const ESTADOS_VALIDOS = ['libre', 'ocupada', 'reservada'];

// Obtener todas las mesas
const obtenerTodasLasMesas = async (req, res, next) => {
    try {
        const mesas = await mesaQueries.getAllMesas();
        res.json(mesas || []);
    } catch (error) {
        next(error);
    }
};

// Obtener una mesa por ID
const obtenerMesaPorId = async (req, res, next) => {
    const { id } = req.params;
    const mesaIdInt = parseInt(id);

    if (!Number.isInteger(mesaIdInt) || mesaIdInt <= 0) {
        return res.status(400).json({ message: 'ID de mesa inválido.' });
    }

    try {
        const mesa = await mesaQueries.getMesaById(mesaIdInt);
        if (!mesa) {
            return res.status(404).json({ message: `Mesa con ID ${id} no encontrada.` });
        }
        res.json(mesa);
    } catch (error) {
        next(error);
    }
};

// Crear una nueva mesa
const crearMesa = async (req, res, next) => {
    const { numero_mesa, capacidad, estado } = req.body;

    // Validación básica
    // TODO: Usar express-validator
    if (numero_mesa === undefined || !Number.isInteger(parseInt(numero_mesa)) || parseInt(numero_mesa) <= 0) {
         return res.status(400).json({ message: 'El campo "numero_mesa" es obligatorio y debe ser un número entero positivo.' });
    }
     if (capacidad !== undefined && (!Number.isInteger(parseInt(capacidad)) || parseInt(capacidad) <= 0)) {
         return res.status(400).json({ message: 'El campo "capacidad" debe ser un número entero positivo.' });
    }
    if (estado !== undefined && !ESTADOS_VALIDOS.includes(estado)) {
         return res.status(400).json({ message: `El campo "estado" debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}.` });
    }

    const mesaData = {
        numero_mesa: parseInt(numero_mesa),
        // Incluir capacidad y estado solo si fueron proporcionados, para usar defaults de DB
        ...(capacidad !== undefined && { capacidad: parseInt(capacidad) }),
        ...(estado !== undefined && { estado: estado })
    };

    try {
        const nuevaMesa = await mesaQueries.createMesa(mesaData);
        res.status(201).json(nuevaMesa);
    } catch (error) {
        // Si el error viene de la query por UNIQUE constraint
        if (error.message.includes('ya existe')) {
            return res.status(409).json({ message: error.message }); // 409 Conflict
        }
        // Si el error viene de la query por CHECK constraint 
        if (error.message.includes('no es válido')) {
             return res.status(400).json({ message: error.message }); // 400 Bad Request
        }
        next(error);
    }
};

// Actualizar una mesa existente
const actualizarMesa = async (req, res, next) => {
    const { id } = req.params;
    const { numero_mesa, capacidad, estado } = req.body;
    const mesaIdInt = parseInt(id);

    if (!Number.isInteger(mesaIdInt) || mesaIdInt <= 0) {
        return res.status(400).json({ message: 'ID de mesa inválido.' });
    }

    // Validación de datos de entrada
    // TODO: Usar express-validator
    if (numero_mesa === undefined || !Number.isInteger(parseInt(numero_mesa)) || parseInt(numero_mesa) <= 0) {
         return res.status(400).json({ message: 'El campo "numero_mesa" es obligatorio y debe ser un número entero positivo.' });
    }
     if (capacidad === undefined || !Number.isInteger(parseInt(capacidad)) || parseInt(capacidad) <= 0) {
         return res.status(400).json({ message: 'El campo "capacidad" es obligatorio y debe ser un número entero positivo.' });
    }
    if (estado === undefined || !ESTADOS_VALIDOS.includes(estado)) {
         return res.status(400).json({ message: `El campo "estado" es obligatorio y debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}.` });
    }

     const mesaData = {
        numero_mesa: parseInt(numero_mesa),
        capacidad: parseInt(capacidad),
        estado: estado
    };

    try {
        // POR VER: verificar si la mesa existe antes de intentar actualizar
        // const mesaExistente = await mesaQueries.getMesaById(mesaIdInt);
        // if (!mesaExistente) {
        //     return res.status(404).json({ message: `Mesa con ID ${id} no encontrada.` });
        // }

        const mesaActualizada = await mesaQueries.updateMesa(mesaIdInt, mesaData);
        if (!mesaActualizada) {
            // Si la query no devolvió nada, es que el ID no existía
             return res.status(404).json({ message: `Mesa con ID ${id} no encontrada.` });
        }
        res.json(mesaActualizada);
    } catch (error) {
        // Si el error viene de la query por UNIQUE constraint
        if (error.message.includes('ya existe')) {
            return res.status(409).json({ message: error.message }); // 409 Conflict
        }
         // Si el error viene de la query por CHECK constraint 
        if (error.message.includes('no es válido')) {
             return res.status(400).json({ message: error.message }); // 400 Bad Request
        }
        next(error);
    }
};

// Eliminar una mesa
const eliminarMesa = async (req, res, next) => {
    const { id } = req.params;
    const mesaIdInt = parseInt(id);

     if (!Number.isInteger(mesaIdInt) || mesaIdInt <= 0) {
        return res.status(400).json({ message: 'ID de mesa inválido.' });
    }

    try {
        const fueEliminada = await mesaQueries.deleteMesa(mesaIdInt);
        if (!fueEliminada) {
            return res.status(404).json({ message: `Mesa con ID ${id} no encontrada.` });
        }
        res.status(204).send(); // 204 No Content
    } catch (error) {
        next(error);
    }
};

module.exports = {
    obtenerTodasLasMesas,
    obtenerMesaPorId,
    crearMesa,
    actualizarMesa,
    eliminarMesa,
};