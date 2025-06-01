// server/controllers/auth.controller.js


const db = require('../db/connection'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_super_secreto_temporal'; 

exports.loginAdmin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });
  }

  try {

    const queryText = 'SELECT admin_id, username, password_hash, nombre FROM dbo.ADMIN WHERE username = @username_param';
    
    // Usa db.sql para los tipos de datos SQL
    const params = {
      username_param: { type: db.sql.NVarChar(50), value: username } 
    };

    const result = await db.query(queryText, params); //
    const adminUser = result.recordset[0];

    if (!adminUser) {
      return res.status(401).json({ message: 'Credenciales inválidas (usuario no encontrado).' });
    }

    const isMatch = await bcrypt.compare(password, adminUser.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas (contraseña incorrecta).' });
    }

    const payload = {
      userId: adminUser.admin_id,
      username: adminUser.username,
      nombre: adminUser.nombre
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      message: 'Login exitoso!',
      token: token,
      user: {
        id: adminUser.admin_id,
        username: adminUser.username,
        nombre: adminUser.nombre
      }
    });

  } catch (error) {
    console.error('Error en el login del admin:', error);
    res.status(500).json({ message: 'Error interno del servidor.', details: error.message });
  }
};

