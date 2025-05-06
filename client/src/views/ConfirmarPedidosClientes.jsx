import React, { useState } from 'react';
import './ConfirmarPedidosClientes.css';

const pedidosMock = [
  { id: 1, cliente: 'Juan Perez', telefono: '123456789', direccion: 'Calle Falsa 123', productos: ['Hamburguesa', 'Papas'], tipo: 'delivery' },
  { id: 2, cliente: 'Ana García', telefono: '', direccion: '', productos: ['Pizza'], tipo: 'mostrador' },
];

const ConfirmarPedidosClientes = () => {
  const [pedidos, setPedidos] = useState(pedidosMock);

  const confirmarPedido = (id) => {
    setPedidos(pedidos.filter(p => p.id !== id));
    alert('Pedido confirmado!');
  };

  return (
    <div className="confirmar-pedidos-container">
      <h1>Pedidos Pendientes</h1>

      {pedidos.length === 0 ? (
        <p>No hay pedidos para confirmar.</p>
      ) : (
        pedidos.map((pedido) => (
          <div key={pedido.id} className="pedido-card">
            <h2>{pedido.cliente}</h2>
            <p><strong>Tipo:</strong> {pedido.tipo}</p>
            {pedido.telefono && <p><strong>Teléfono:</strong> {pedido.telefono}</p>}
            {pedido.direccion && <p><strong>Dirección:</strong> {pedido.direccion}</p>}
            <p><strong>Productos:</strong> {pedido.productos.join(', ')}</p>
            <button onClick={() => confirmarPedido(pedido.id)}>Confirmar Pedido</button>
          </div>
        ))
      )}
    </div>
  );
};

export default ConfirmarPedidosClientes;
