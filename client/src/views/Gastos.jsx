import React, { useState, useEffect } from 'react';
import './Gastos.css';

const Gastos = () => {
  const [gastos, setGastos] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('todos'); // 'todos', 'fijo', 'variable'
  const [nuevoGasto, setNuevoGasto] = useState({ tipo_gasto: 'fijo', concepto: '', monto: '' });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Para errores de carga
  const [submitError, setSubmitError] = useState(null); // Para errores de envío de formulario
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar gastos desde la API
  const fetchGastos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/gastos');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Error al cargar gastos' }));
        throw new Error(errData.message || `Error ${response.status}`);
      }
      const data = await response.json();
      setGastos(data || []);
    } catch (err) {
      console.error("Error fetching gastos:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // useEffect para cargar gastos al montar el componente
  useEffect(() => {
    fetchGastos();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNuevoGasto(prev => ({ ...prev, [name]: value }));
  };

  const agregarGasto = async () => {
    if (!nuevoGasto.concepto.trim() || !nuevoGasto.monto.trim()) {
      setSubmitError('Concepto y Monto son obligatorios.');
      return;
    }
    const montoFloat = parseFloat(nuevoGasto.monto);
    if (isNaN(montoFloat) || montoFloat <= 0) {
      setSubmitError('El monto debe ser un número positivo.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    const payload = {
      tipo_gasto: nuevoGasto.tipo_gasto, // 'fijo' o 'variable'
      concepto: nuevoGasto.concepto.trim(),
      monto: montoFloat,
      // turno_id: null, // Opcional: obtener de contexto/estado si está disponible
      // admin_id_registro: 1, // Opcional: Placeholder o obtener de contexto de autenticación
      // notas_adicionales: null, // Opcional: Añadir un campo en el formulario si es necesario
    };

    try {
      const response = await fetch('/api/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error al agregar gasto' }));
        throw new Error(errorData.message || `Error ${response.status}`);
      }
      
      await fetchGastos(); // Actualizar la lista de gastos
      setNuevoGasto({ tipo_gasto: 'fijo', concepto: '', monto: '' }); // Limpiar formulario
      alert('Gasto agregado exitosamente!');

    } catch (err) {
      console.error("Error al agregar gasto:", err);
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const gastosFiltrados = gastos.filter((g) => {
    if (!filtroTipo || filtroTipo === 'todos') return true;
    return g.tipo_gasto === filtroTipo;
  });

  if (loading && gastos.length === 0) {
    return <div className="gastos-container"><h1>Gastos</h1><p>Cargando gastos...</p></div>;
  }

  return (
    <div className="gastos-container">
      <h1>Gastos</h1>
      {error && <p style={{ color: 'red' }}>Error al cargar datos: {error}</p>}

      <div className="form-gasto">
        <select
          name="tipo_gasto"
          value={nuevoGasto.tipo_gasto}
          onChange={handleInputChange}
          disabled={isSubmitting}
        >
          <option value="fijo">Fijo</option>
          <option value="variable">Variable</option>
        </select>
        <input
          type="text"
          name="concepto"
          placeholder="Concepto"
          value={nuevoGasto.concepto}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />
        <input
          type="number"
          name="monto"
          placeholder="Monto"
          step="0.01"
          value={nuevoGasto.monto}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />
        <button onClick={agregarGasto} disabled={isSubmitting}>
          {isSubmitting ? 'Agregando...' : 'Agregar Gasto'}
        </button>
      </div>
      {submitError && <p style={{ color: 'red', marginTop: '10px' }}>{submitError}</p>}

      <div className="filtros">
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="fijo">Fijo</option>
          <option value="variable">Variable</option>
        </select>
      </div>

      {loading && gastos.length > 0 && <p>Actualizando lista...</p>}
      <ul className="lista-gastos">
        {gastosFiltrados.length > 0 ? (
          gastosFiltrados.map((g) => (
            <li key={g.gasto_id}>
              [{g.tipo_gasto}] {g.concepto}: ${typeof g.monto === 'number' ? g.monto.toFixed(2) : parseFloat(g.monto).toFixed(2)}
              
              {g.fecha_gasto ? ` - ${new Date(g.fecha_gasto).toLocaleDateString()}` : ''}
            </li>
          ))
        ) : (
          <li>No hay gastos para mostrar con el filtro actual.</li>
        )}
      </ul>
    </div>
  );
};

export default Gastos;