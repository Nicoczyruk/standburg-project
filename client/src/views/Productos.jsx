import React, { useState } from 'react';
import './Productos.css';

const Productos = () => {
  const [productos, setProductos] = useState([]);
  const [nuevoProducto, setNuevoProducto] = useState({ nombre: '', precio: '', costo: '' });

  const agregarProducto = () => {
    if (nuevoProducto.nombre && nuevoProducto.precio) {
      setProductos([...productos, nuevoProducto]);
      setNuevoProducto({ nombre: '', precio: '', costo: '' });
    }
  };

  return (
    <div className="productos-container">
      <h1>Productos</h1>
      <div className="form-producto">
        <input
          type="text"
          placeholder="Nombre"
          value={nuevoProducto.nombre}
          onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
        />
        <input
          type="number"
          placeholder="Precio"
          value={nuevoProducto.precio}
          onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio: e.target.value })}
        />
        <input
          type="number"
          placeholder="Costo"
          value={nuevoProducto.costo}
          onChange={(e) => setNuevoProducto({ ...nuevoProducto, costo: e.target.value })}
        />
        <button onClick={agregarProducto}>Agregar Producto</button>
      </div>

      <table className="tabla-productos">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Precio</th>
            <th>Costo</th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p, index) => (
            <tr key={index}>
              <td>{p.nombre}</td>
              <td>${p.precio}</td>
              <td>${p.costo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Productos;
