import React, { useState, useEffect } from 'react'; // Importar useState y useEffect
import { Routes, Route, Outlet, Navigate, useNavigate } from 'react-router-dom';
import './App.css';

import Header from './components/Header';
import Footer from './components/Footer';

// Vistas
import TomaPedidos from './views/TomaPedidos';
import ConfirmarPedidosClientes from './views/ConfirmarPedidosClientes';
import Productos from './views/Productos';
import Arqueo from './views/Arqueo';
import MovimientoCaja from './views/MovimientoCaja';
import Gastos from './views/Gastos';
import PedidoCliente from './views/PedidoCliente';
import PedidosConfirmados from './views/PedidosConfirmados';
import Login from './views/Login';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ClientLayout = () => (
  <div className="client-view">
    <main style={{ minHeight: 'calc(100vh - 80px)', padding: '20px' }}>
      <Outlet />
    </main>
    <Footer />
  </div>
);

// Componente para Rutas Protegidas de Admin
const ProtectedAdminRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AdminLayout = () => (
  <div className="admin-view">
    <Header />
    <main style={{ minHeight: 'calc(100vh - 160px)', padding: '20px' }}>
      <Outlet />
    </main>
    <Footer />
  </div>
);

function App() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    // Revisa si ya hay un token o señal de autenticación al cargar la app
    const token = localStorage.getItem('adminToken');
    return !!token; // Devuelve true si el token existe, false si no
  });

  
  useEffect(() => {
    if (!isAdminAuthenticated) {
      localStorage.removeItem('adminToken');
    }
  }, [isAdminAuthenticated]);

  return (
    <>
      <Routes>
        {/* Rutas Públicas / Cliente */}
        <Route element={<ClientLayout />}>
          <Route path="/" element={<PedidoCliente />} />
        </Route>

        {/* Ruta de Login para Administrador */}
        <Route
          path="/login"
          element={
            isAdminAuthenticated ? (
              <Navigate to="/admin" replace /> // Si ya está logueado, lo lleva a /admin
            ) : (
              <Login setAdminAuthenticated={setIsAdminAuthenticated} />
            )
          }
        />

        {/* Rutas de Administración Protegidas */}
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute isAuthenticated={isAdminAuthenticated}>
              <AdminLayout />
            </ProtectedAdminRoute>
          }
        >
          <Route index element={<Navigate to="toma-pedidos" replace />} />
          <Route path="toma-pedidos" element={<TomaPedidos />} />
          <Route path="confirmar-pedidos" element={<ConfirmarPedidosClientes />} />
          <Route path="pedidos-confirmados" element={<PedidosConfirmados />} />
          <Route path="productos" element={<Productos />} />
          <Route path="arqueo" element={<Arqueo />} />
          <Route path="movimientos" element={<MovimientoCaja />} />
          <Route path="gastos" element={<Gastos />} />
        </Route>
        
      </Routes>
      <ToastContainer  />
    </>
  );
}

export default App;