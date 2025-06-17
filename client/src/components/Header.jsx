import React from 'react';
import { Link } from 'react-router-dom'; // Importar Link
import { useNavigate } from 'react-router-dom';
import './Header.css';
import {
  FaHamburger, FaClipboardList, FaCheckCircle, FaUserFriends,
  FaCashRegister, FaExchangeAlt, FaMoneyBillAlt, FaBox, FaSignOutAlt
} from 'react-icons/fa';


const Header = () => {


  const handleLogout = (event) => {
    event.preventDefault();

    // 1. Usa la clave correcta para borrar el token
    localStorage.removeItem('adminToken');

    // 2. Redirige y recarga la aplicación a la página de login.
    // Esto asegura que el estado de autenticación en App.jsx se reinicie.
    window.location.href = '/login';
};
  return (
    <header className="main-header">
      <div className="logo">
        
        <Link to="/admin"> 
          <img src="/Logo Blanco y Negro.png" alt="Standburg Logo" className="logo-img" />
        </Link>
      </div>

      <nav className="card-menu">
        
        <Link to="/admin/toma-pedidos" className="card">
          <FaHamburger className="icon" /><span>Tomar Pedido</span>
        </Link>
        <Link to="/admin/confirmar-pedidos" className="card">
          <FaClipboardList className="icon" /><span>Confirmar Pedido</span>
        </Link>
        <Link to="/admin/pedidos-confirmados" className="card">
          <FaCheckCircle className="icon" /><span>Confirmados</span>
        </Link>
        
        <Link to="/admin/arqueo" className="card">
          <FaCashRegister className="icon" /><span>Arqueo</span>
        </Link>
        <Link to="/admin/movimientos" className="card">
          <FaExchangeAlt className="icon" /><span>Movimientos</span>
        </Link>
        <Link to="/admin/gastos" className="card">
          <FaMoneyBillAlt className="icon" /><span>Gastos</span>
        </Link>
        <Link to="/admin/productos" className="card">
          <FaBox className="icon" /><span>Productos</span>
        </Link>
        <button onClick={handleLogout} className="card logout-card">
          <FaSignOutAlt className="icon" /><span>Cerrar Sesión</span>
        </button>
      </nav>
    </header>
  );
};

export default Header;