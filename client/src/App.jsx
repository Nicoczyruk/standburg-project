import React, { useState } from 'react';
import './App.css';

import Header from './components/Header';
import Footer from './components/Footer';

import TomaPedidos from './views/TomaPedidos';
import ConfirmarPedidosClientes from './views/ConfirmarPedidosClientes';
import Productos from './views/Productos';
import Arqueo from './views/Arqueo';
import MovimientoCaja from './views/MovimientoCaja';
import Gastos from './views/Gastos';
import PedidoCliente from './views/PedidoCliente';
import PedidosConfirmados from './views/PedidosConfirmados';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [vista, setVista] = useState('clientePedido'); // <-- Cambiado para que inicie en PedidoCliente

  const renderVista = () => {
    switch (vista) {
      case 'productos':
        return <Productos />;
      case 'clientePedido':
        return <PedidoCliente />;
      case 'arqueoCaja':
        return <Arqueo />;
      case 'movimientoCaja':
        return <MovimientoCaja />;
      case 'gastos':
        return <Gastos />;
      case 'confirmarPedido':
        return <ConfirmarPedidosClientes />;
      case 'pedidosConfirmados':
        return <PedidosConfirmados />;
      case 'tomarPedido':
      default:
        return <TomaPedidos />;
    }
  };

   return (
    <div className="App">
      <Header cambiarVista={setVista} />

      <main style={{ minHeight: 'calc(100vh - 160px)', padding: '20px' }}>
        {renderVista()}
      </main>

      <Footer />

      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

export default App;
