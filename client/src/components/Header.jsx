import React from 'react';
import './Header.css';
import {
  FaHamburger, FaClipboardList, FaCheckCircle, FaUserFriends,
  FaCashRegister, FaExchangeAlt, FaMoneyBillAlt, FaBox
} from 'react-icons/fa';

const Header = ({ cambiarVista }) => {
  return (
    <header className="main-header">
      <div className="logo">
        <img src="/Logo Blanco y Negro.png" alt="Standburg Logo" className="logo-img" />
      </div>

      <nav className="card-menu">
        <div className="card" onClick={() => cambiarVista('tomarPedido')}><FaHamburger className="icon" /><span>Tomar Pedido</span></div>
        <div className="card" onClick={() => cambiarVista('confirmarPedido')}><FaClipboardList className="icon" /><span>Confirmar Pedido</span></div>
        <div className="card" onClick={() => cambiarVista('pedidosConfirmados')}><FaCheckCircle className="icon" /><span>Confirmados</span></div>
        <div className="card" onClick={() => cambiarVista('clientePedido')}><FaUserFriends className="icon" /><span>Clientes</span></div>
        <div className="card" onClick={() => cambiarVista('arqueoCaja')}><FaCashRegister className="icon" /><span>Arqueo</span></div>
        <div className="card" onClick={() => cambiarVista('movimientoCaja')}><FaExchangeAlt className="icon" /><span>Movimientos</span></div>
        <div className="card" onClick={() => cambiarVista('gastos')}><FaMoneyBillAlt className="icon" /><span>Gastos</span></div>
        <div className="card" onClick={() => cambiarVista('productos')}><FaBox className="icon" /><span>Productos</span></div>
      </nav>
    </header>
  );
};

export default Header;
