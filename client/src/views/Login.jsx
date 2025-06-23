import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './login.css'; // 1. Asegúrate que esta línea esté importando tu CSS

// Recibe setAdminAuthenticated como prop
const Login = ({ setAdminAuthenticated }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      
      const response = await fetch('/api/auth/login', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('adminToken', data.token); // Guarda el token JWT
        setAdminAuthenticated(true); // Actualiza el estado en App.jsx
        navigate('/admin'); // Redirige al dashboard de admin
      } else {
        setError(data.message || 'Error al iniciar sesión. Verifica tus credenciales.');
      }
    } catch (err) {
      console.error("Error en el login:", err);
      setError('No se pudo conectar al servidor. Intenta más tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    
    <div className="login-container">
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <h2>Login de Administrador</h2>
          
          <form onSubmit={handleLogin} className="login-form" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' }}>
            <div>
              <label htmlFor="username">Usuario:</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
            <div>
              <label htmlFor="password">Contraseña:</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <button type="submit" style={{ padding: '10px', cursor: 'pointer' }} disabled={isLoading}>
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
    </div>
  );
};

export default Login;