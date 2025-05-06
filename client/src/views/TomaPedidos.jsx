import React, { useState } from 'react';
import './TomaPedidos.css';

const productosDisponibles = [
  { nombre: 'Central Park', precio: 3000 },
  { nombre: 'Central Park (simple)', precio: 2500 },
  { nombre: 'Broadway', precio: 2800 },
  { nombre: 'Brooklyn', precio: 2500 },
  { nombre: 'Harlem', precio: 2700 },
  { nombre: 'Green Point Avenue', precio: 2600 },
  { nombre: 'Standburg', precio: 3200 },
  { nombre: 'Wall Street', precio: 3100 },
  { nombre: 'York Street', precio: 2550 },
  { nombre: 'Time Square', precio: 2900 },
  { nombre: 'Papas Simples', precio: 1000 },
  { nombre: 'Papas CB', precio: 1300 },
  { nombre: 'Fried Chicken Crispy', precio: 1500 },
  { nombre: 'Ensalada Cesar', precio: 1200 },
  { nombre: 'Pepsi', precio: 800 },
  { nombre: 'Pepsi Black', precio: 800 },
  { nombre: 'Mirinda', precio: 800 },
  { nombre: 'Seven-Up', precio: 800 },
  { nombre: 'Paso de los Toros', precio: 800 },
  { nombre: 'Stella Artois', precio: 1500 },
  { nombre: 'Agua Mineral', precio: 700 }
];

const TomaPedidos = ({ cambiarVista }) => {
  const [tipoPedido, setTipoPedido] = useState('');
  const [cliente, setCliente] = useState({ nombre: '', telefono: '', direccion: '', costoEnvio: '' });
  const [productos, setProductos] = useState([]);

  const agregarProducto = (producto) => {
    setProductos([...productos, producto]);
  };

  const handleChangeCliente = (e) => {
    const { name, value } = e.target;
    setCliente({ ...cliente, [name]: value });
  };

  const confirmarPedido = () => {
    // Aquí normalmente enviarías a un backend o contexto
    console.log({ tipoPedido, cliente, productos });
    cambiarVista('confirmarPedido');
  };

  const subtotal = productos.reduce((acc, prod) => acc + prod.precio, 0);
  const total = subtotal + (parseFloat(cliente.costoEnvio) || 0);

  return (
    <div className="toma-pedidos-container">
      <h1>Tomar Pedido</h1>

      <select value={tipoPedido} onChange={(e) => setTipoPedido(e.target.value)}>
        <option value="">Seleccionar Tipo</option>
        <option value="mostrador">Mostrador</option>
        <option value="mesa">Mesa</option>
        <option value="delivery">Delivery</option>
      </select>

      {(tipoPedido === 'mostrador' || tipoPedido === 'mesa' || tipoPedido === 'delivery') && (
        <div className="form-cliente">
          <input
            type="text"
            name="nombre"
            placeholder="Nombre Cliente"
            value={cliente.nombre}
            onChange={handleChangeCliente}
          />
          {(tipoPedido === 'mostrador' || tipoPedido === 'delivery') && (
            <input
              type="text"
              name="telefono"
              placeholder="Teléfono (opcional en mostrador)"
              value={cliente.telefono}
              onChange={handleChangeCliente}
            />
          )}
          {tipoPedido === 'delivery' && (
            <>
              <input
                type="text"
                name="direccion"
                placeholder="Dirección"
                value={cliente.direccion}
                onChange={handleChangeCliente}
              />
              <input
                type="number"
                name="costoEnvio"
                placeholder="Costo de Envío"
                value={cliente.costoEnvio}
                onChange={handleChangeCliente}
              />
            </>
          )}
        </div>
      )}

      <div className="productos-rapidos">
        {productosDisponibles.map((prod, index) => (
          <button key={index} onClick={() => agregarProducto(prod)}>
            {prod.nombre} - ${prod.precio}
          </button>
        ))}
      </div>

      <ul className="lista-productos">
        {productos.map((prod, index) => (
          <li key={index}>{prod.nombre} - ${prod.precio}</li>
        ))}
      </ul>

      <div className="totales">
        <p>Subtotal: ${subtotal}</p>
        {cliente.costoEnvio && <p>Envío: ${cliente.costoEnvio}</p>}
        <h3>Total: ${total}</h3>
        <button onClick={confirmarPedido}>Confirmar Pedido</button>
      </div>
    </div>
  );
};

export default TomaPedidos;
