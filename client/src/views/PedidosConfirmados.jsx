// PedidosConfirmados.js
import React, { useState } from 'react';

const pedidosIniciales = [
  {
    id: 1,
    cliente: { nombre: 'Ana', telefono: '099123456', direccion: 'Calle Falsa 123' },
    tipo: 'delivery',
    productos: [
      { nombre: 'Standburg', precio: 3200 },
      { nombre: 'Papas CB', precio: 1300 }
    ],
    costoEnvio: 200,
    entregado: false,
  },
  {
    id: 2,
    cliente: { nombre: 'Luis', telefono: '', direccion: '' },
    tipo: 'mostrador',
    productos: [
      { nombre: 'Broadway', precio: 2800 }
    ],
    costoEnvio: 0,
    entregado: false,
  }
];

const PedidosConfirmados = () => {
  const [pedidos, setPedidos] = useState(pedidosIniciales);

  const marcarEntregado = (id) => {
    setPedidos(pedidos.map(p => p.id === id ? { ...p, entregado: true } : p));
  };

  return (
    <div className="pedidos-confirmados">
      <h1>Pedidos Confirmados</h1>
      {pedidos.map(p => (
        <div key={p.id} style={{ border: '1px solid #ccc', padding: 12, marginBottom: 12 }}>
          <h2>Pedido #{p.id}</h2>
          <p><strong>Cliente:</strong> {p.cliente.nombre}</p>
          <p><strong>Teléfono:</strong> {p.cliente.telefono}</p>
          <p><strong>Dirección:</strong> {p.cliente.direccion}</p>
          <p><strong>Tipo:</strong> {p.tipo}</p>
          <ul>
            {p.productos.map((prod, i) => (
              <li key={i}>{prod.nombre} - ${prod.precio}</li>
            ))}
          </ul>
          <p><strong>Envío:</strong> ${p.costoEnvio}</p>
          <p><strong>Total:</strong> ${p.productos.reduce((s, p) => s + p.precio, 0) + p.costoEnvio}</p>
          <p><strong>Estado:</strong> {p.entregado ? 'Entregado' : 'En proceso'}</p>
          {!p.entregado && (
            <button onClick={() => marcarEntregado(p.id)}>Marcar como Entregado</button>
          )}
        </div>
      ))}
    </div>
  );
};

export default PedidosConfirmados;
