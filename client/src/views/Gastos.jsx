import React, { useState, useEffect } from 'react';
import './Gastos.css';

const Gastos = () => {
  const [gastos, setGastos] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [nuevoGasto, setNuevoGasto] = useState({ tipo_gasto: 'fijo', concepto: '', monto: '', fecha_gasto: '' });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editandoId, setEditandoId] = useState(null);
  const [gastoEditado, setGastoEditado] = useState({ concepto: '', monto: '', fecha_gasto: '', tipo_gasto: '' });

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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGastos();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNuevoGasto(prev => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setGastoEditado(prev => ({ ...prev, [name]: value }));
  };

  const agregarGasto = async () => {
    if (!nuevoGasto.concepto.trim() || !nuevoGasto.monto.trim() || !nuevoGasto.fecha_gasto) {
      setSubmitError('Concepto, Monto y Fecha son obligatorios.');
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
      tipo_gasto: nuevoGasto.tipo_gasto,
      concepto: nuevoGasto.concepto.trim(),
      monto: montoFloat,
      fecha_gasto: nuevoGasto.fecha_gasto
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

      await fetchGastos();
      setNuevoGasto({ tipo_gasto: 'fijo', concepto: '', monto: '', fecha_gasto: '' });
      alert('Gasto agregado exitosamente!');
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const editarGasto = (gasto) => {
    setEditandoId(gasto.gasto_id);
    setGastoEditado({
      concepto: gasto.concepto,
      monto: gasto.monto,
      fecha_gasto: gasto.fecha_gasto?.substring(0, 10) || '',
      tipo_gasto: gasto.tipo_gasto
    });
  };

  const guardarEdicion = async (id) => {
    const payload = {
      ...gastoEditado,
      monto: parseFloat(gastoEditado.monto)
    };

    try {
      const response = await fetch(`/api/gastos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error al editar gasto' }));
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      await fetchGastos();
      setEditandoId(null);
    } catch (err) {
      alert('Error al editar gasto: ' + err.message);
    }
  };

  const eliminarGasto = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este gasto?')) return;

    try {
      const response = await fetch(`/api/gastos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar gasto');
      }

      await fetchGastos();
    } catch (err) {
      alert('Error al eliminar gasto: ' + err.message);
    }
  };

  const gastosFiltrados = gastos.filter((g) => {
    const cumpleTipo = filtroTipo === 'todos' || g.tipo_gasto === filtroTipo;
    const cumpleFecha = !filtroFecha || g.fecha_gasto?.startsWith(filtroFecha);
    return cumpleTipo && cumpleFecha;
  });

  return (
    <div className="gastos-container">
      <h1>Gastos</h1>
      {error && <p style={{ color: 'red' }}>Error al cargar datos: {error}</p>}

      <div className="form-gasto">
        <select name="tipo_gasto" value={nuevoGasto.tipo_gasto} onChange={handleInputChange} disabled={isSubmitting}>
          <option value="fijo">Fijo</option>
          <option value="variable">Variable</option>
        </select>
        <input type="text" name="concepto" placeholder="Concepto" value={nuevoGasto.concepto} onChange={handleInputChange} disabled={isSubmitting} />
        <input type="number" name="monto" placeholder="Monto" step="0.01" value={nuevoGasto.monto} onChange={handleInputChange} disabled={isSubmitting} />
        <input type="date" name="fecha_gasto" value={nuevoGasto.fecha_gasto} onChange={handleInputChange} disabled={isSubmitting} />
        <button onClick={agregarGasto} disabled={isSubmitting}>
          {isSubmitting ? 'Agregando...' : 'Agregar Gasto'}
        </button>
      </div>
      {submitError && <p style={{ color: 'red' }}>{submitError}</p>}

      <div className="filtros">
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="fijo">Fijo</option>
          <option value="variable">Variable</option>
        </select>
        <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} />
      </div>

      {loading && gastos.length > 0 && <p>Actualizando lista...</p>}

      <ul className="lista-gastos">
        {gastosFiltrados.length > 0 ? (
          gastosFiltrados.map((g) => (
            <li key={g.gasto_id}>
              {editandoId === g.gasto_id ? (
                <>
                  <select name="tipo_gasto" value={gastoEditado.tipo_gasto} onChange={handleEditChange}>
                    <option value="fijo">Fijo</option>
                    <option value="variable">Variable</option>
                  </select>
                  <input name="concepto" value={gastoEditado.concepto} onChange={handleEditChange} />
                  <input name="monto" type="number" value={gastoEditado.monto} onChange={handleEditChange} />
                  <input name="fecha_gasto" type="date" value={gastoEditado.fecha_gasto} onChange={handleEditChange} />
                  <button onClick={() => guardarEdicion(g.gasto_id)}>Guardar</button>
                  <button onClick={() => setEditandoId(null)}>Cancelar</button>
                </>
              ) : (
                <>
                  [{g.tipo_gasto}] {g.concepto}: ${parseFloat(g.monto).toFixed(2)}
                  {g.fecha_gasto ? ` - ${new Date(g.fecha_gasto).toLocaleDateString()}` : ''}
                  <div style={{ marginTop: '5px' }}>
                    <button onClick={() => editarGasto(g)}>Editar</button>
                    <button onClick={() => eliminarGasto(g.gasto_id)} style={{ backgroundColor: '#999' }}>Eliminar</button>
                  </div>
                </>
              )}
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
