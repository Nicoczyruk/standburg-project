import React from 'react';
import './Header.css';

const Header = ({ cambiarVista }) => {
  return (
    <header className="main-header">
      <div className="logo">
        <img src="./Logo Blanco y Negro.png" alt="Standburg Logo" className="logo-img" />
        <span></span>
      </div>
      <nav className="nav-menu">
        <div className="dropdown">
          <span>Pedidos ▾</span>
          <div className="dropdown-content">
            <span onClick={() => cambiarVista('tomarPedido')}>Tomar Pedido</span>
            <span onClick={() => cambiarVista('confirmarPedido')}>Confirmar Pedido</span>
            <span onClick={() => cambiarVista('pedidosConfirmados')}>Pedidos Confirmados</span>
            <span onClick={() => cambiarVista('clientePedido')}>Prueba pedidos clientes</span>
          </div>
        </div>
        <div className="dropdown">
          <span>Caja ▾</span>
          <div className="dropdown-content">
            <span onClick={() => cambiarVista('arqueoCaja')}>Arqueo de Caja</span>
            <span onClick={() => cambiarVista('movimientoCaja')}>Movimiento de Caja</span>
            <span onClick={() => cambiarVista('gastos')}>Gastos</span>
          </div>
        </div>
        <span onClick={() => cambiarVista('productos')}>Productos</span>
      </nav>
    </header>
  );
};

export default Header;
