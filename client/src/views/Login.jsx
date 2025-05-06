import React from 'react';
import './login.css'; 

const Login = () => {
  return (
    <div className="login-container">
      <img src="/logo192.png" alt="Logo" className="logo" />
      <h2>Iniciar Sesión</h2>
      <form className="login-form">
        <input type="email" placeholder="Correo electrónico" required />
        <input type="password" placeholder="Contraseña" required />
        <button type="submit">Ingresar</button>
      </form>
    </div>
  );
};

export default Login;
