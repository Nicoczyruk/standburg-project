import React from 'react';
import { Link } from 'react-router-dom'; // Importar Link
import './Header.css';
import {
  FaHamburger, FaClipboardList, FaCheckCircle, FaUserFriends,
  FaCashRegister, FaExchangeAlt, FaMoneyBillAlt, FaBox
} from 'react-icons/fa';


const Header = () => {
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
      </nav>
    </header>
  );
};

export default Header;