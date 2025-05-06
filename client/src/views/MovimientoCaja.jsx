import React, { useState } from 'react';
import './MovimientoCaja.css';

const MovimientoCaja = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [filtros, setFiltros] = useState({ fecha: '' });
  const [nuevoMovimiento, setNuevoMovimiento] = useState({ tipo: 'Ingreso', descripcion: '', monto: '', fecha: '' });

  const agregarMovimiento = () => {
    if (nuevoMovimiento.descripcion && nuevoMovimiento.monto && nuevoMovimiento.fecha) {
      setMovimientos([...movimientos, nuevoMovimiento]);
      setNuevoMovimiento({ tipo: 'Ingreso', descripcion: '', monto: '', fecha: '' });
    }
  };

  const movimientosFiltrados = movimientos.filter((mov) => {
    if (!filtros.fecha) return true;
    return mov.fecha === filtros.fecha;
  });

  const totalCaja = movimientos.reduce((acc, mov) => {
    return mov.tipo === 'Ingreso' ? acc + parseFloat(mov.monto) : acc - parseFloat(mov.monto);
  }, 0);

  return (
    <div className="movimiento-caja-container">
      <h1>Movimiento de Caja</h1>

      <div className="form-movimiento">
        <select
          value={nuevoMovimiento.tipo}
          onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, tipo: e.target.value })}
        >
          <option>Ingreso</option>
          <option>Egreso</option>
        </select>
        <input
          type="text"
          placeholder="Descripción"
          value={nuevoMovimiento.descripcion}
          onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, descripcion: e.target.value })}
        />
        <input
          type="number"
          placeholder="Monto"
          value={nuevoMovimiento.monto}
          onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, monto: e.target.value })}
        />
        <input
          type="date"
          value={nuevoMovimiento.fecha}
          onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, fecha: e.target.value })}
        />
        <button onClick={agregarMovimiento}>Agregar</button>
      </div>

      <div className="filtros">
        <input
          type="date"
          placeholder="Filtrar por fecha"
          value={filtros.fecha}
          onChange={(e) => setFiltros({ ...filtros, fecha: e.target.value })}
        />
      </div>

      <table className="tabla-movimientos">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Descripción</th>
            <th>Monto</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {movimientosFiltrados.map((m, index) => (
            <tr key={index}>
              <td>{m.tipo}</td>
              <td>{m.descripcion}</td>
              <td>${m.monto}</td>
              <td>{m.fecha}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="total-caja">Total en Caja: ${totalCaja.toFixed(2)}</h2>
    </div>
  );
};

export default MovimientoCaja;
