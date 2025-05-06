import React, { useState } from 'react';
import './Gastos.css';

const Gastos = () => {
  const [gastos, setGastos] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [nuevoGasto, setNuevoGasto] = useState({ tipo: 'Fijo', concepto: '', monto: '' });

  const agregarGasto = () => {
    if (nuevoGasto.concepto && nuevoGasto.monto) {
      setGastos([...gastos, nuevoGasto]);
      setNuevoGasto({ tipo: 'Fijo', concepto: '', monto: '' });
    }
  };

  const gastosFiltrados = gastos.filter((g) => {
    if (!filtroTipo) return true;
    return g.tipo === filtroTipo;
  });

  return (
    <div className="gastos-container">
      <h1>Gastos</h1>

      <div className="form-gasto">
        <select
          value={nuevoGasto.tipo}
          onChange={(e) => setNuevoGasto({ ...nuevoGasto, tipo: e.target.value })}
        >
          <option>Fijo</option>
          <option>Variable</option>
        </select>
        <input
          type="text"
          placeholder="Concepto"
          value={nuevoGasto.concepto}
          onChange={(e) => setNuevoGasto({ ...nuevoGasto, concepto: e.target.value })}
        />
        <input
          type="number"
          placeholder="Monto"
          value={nuevoGasto.monto}
          onChange={(e) => setNuevoGasto({ ...nuevoGasto, monto: e.target.value })}
        />
        <button onClick={agregarGasto}>Agregar Gasto</button>
      </div>

      <div className="filtros">
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">Todos</option>
          <option value="Fijo">Fijo</option>
          <option value="Variable">Variable</option>
        </select>
      </div>

      <ul className="lista-gastos">
        {gastosFiltrados.map((g, index) => (
          <li key={index}>
            [{g.tipo}] {g.concepto}: ${g.monto}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Gastos;
