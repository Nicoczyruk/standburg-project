import React, { useState, useEffect } from 'react';
import styles from './Gastos.module.css';

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

  // --- Funciones (fetchGastos, handleSubmit, etc. se mantienen igual que antes) ---
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
      setGastos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGastos();
  }, []);

  const handleInputChange = (e) => {
    setNuevoGasto({ ...nuevoGasto, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch('/api/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevoGasto,
          monto: parseFloat(nuevoGasto.monto) || 0,
          fecha_gasto: nuevoGasto.fecha_gasto || null,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Error al agregar el gasto' }));
        throw new Error(errData.message || `Error ${response.status}`);
      }
      fetchGastos();
      setNuevoGasto({ tipo_gasto: 'fijo', concepto: '', monto: '', fecha_gasto: '' });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const eliminarGasto = async (id) => {
    // Confirmación antes de eliminar (opcional pero recomendado)
    // if (!window.confirm("¿Estás seguro de que quieres eliminar este gasto?")) {
    //   return;
    // }
    try {
      const response = await fetch(`/api/gastos/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Error al eliminar el gasto' }));
        throw new Error(errData.message || `Error ${response.status}`);
      }
      fetchGastos();
    } catch (err) {
      setError(err.message); 
    }
  };

  const editarGasto = (gasto) => {
    setEditandoId(gasto.gasto_id);
    setGastoEditado({
      concepto: gasto.concepto,
      monto: gasto.monto.toString(),
      fecha_gasto: gasto.fecha_gasto ? new Date(gasto.fecha_gasto).toISOString().split('T')[0] : '',
      tipo_gasto: gasto.tipo_gasto,
    });
  };

  const handleEditChange = (e) => {
    setGastoEditado({ ...gastoEditado, [e.target.name]: e.target.value });
  };

  const guardarEdicion = async (id) => {
    setIsSubmitting(true); 
    try {
      const response = await fetch(`/api/gastos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...gastoEditado,
          monto: parseFloat(gastoEditado.monto) || 0,
          fecha_gasto: gastoEditado.fecha_gasto || null,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Error al actualizar el gasto' }));
        throw new Error(errData.message || `Error ${response.status}`);
      }
      setEditandoId(null);
      fetchGastos();
    } catch (err) {
      // Mostrar error de edición específico si se desea
      setSubmitError(`Error al guardar: ${err.message}`); // Reutilizar submitError o crear uno nuevo
    } finally {
      setIsSubmitting(false);
    }
  };

  const gastosFiltrados = gastos.filter(g => {
    const coincideTipo = filtroTipo === 'todos' || g.tipo_gasto === filtroTipo;
    const coincideFecha = !filtroFecha || (g.fecha_gasto && g.fecha_gasto.startsWith(filtroFecha));
    return coincideTipo && coincideFecha;
  });

  return (
    <div className={styles['gastos-container']}>
      <h1>Gestión de Gastos</h1>

      <form onSubmit={handleSubmit} className={styles['form-gasto']}>
        <select name="tipo_gasto" value={nuevoGasto.tipo_gasto} onChange={handleInputChange}>
          <option value="fijo">Fijo</option>
          <option value="variable">Variable</option>
        </select>
        <input name="concepto" value={nuevoGasto.concepto} onChange={handleInputChange} placeholder="Concepto" required />
        <input name="monto" type="number" value={nuevoGasto.monto} onChange={handleInputChange} placeholder="Monto" required step="0.01" />
        <input name="fecha_gasto" type="date" value={nuevoGasto.fecha_gasto} onChange={handleInputChange} />
        <button type="submit" disabled={isSubmitting} className={styles.formSubmitButton}>
            {isSubmitting ? 'Agregando...' : 'Agregar Gasto'}
        </button>
      </form>
      {submitError && <p className={styles['error-message']}>{submitError}</p>}

      <div className={styles.sectionDivider}>
        <span>Lista de gastos</span>
      </div>

      <div className={styles.filtros}>
        <select onChange={(e) => setFiltroTipo(e.target.value)} value={filtroTipo}>
          <option value="todos">Todos los Tipos</option>
          <option value="fijo">Fijo</option>
          <option value="variable">Variable</option>
        </select>
        <input type="date" onChange={(e) => setFiltroFecha(e.target.value)} value={filtroFecha} />
      </div>

      {loading && <p className={styles['loading-message']}>Cargando gastos...</p>}
      {error && !loading && <p className={styles['error-message']}>{error}</p>}
      
      {!loading && !error && (
        <ul className={styles['lista-gastos']}>
          {gastosFiltrados.length > 0 ? gastosFiltrados.map(g => (
            <li key={g.gasto_id}>
              {editandoId === g.gasto_id ? (
                <div className={styles['editando-item-container']}> {/* Contenedor para toda la fila de edición */}
                  <div className={styles['editando-inputs']}>
                    <select name="tipo_gasto" value={gastoEditado.tipo_gasto} onChange={handleEditChange}>
                      <option value="fijo">Fijo</option>
                      <option value="variable">Variable</option>
                    </select>
                    <input name="concepto" value={gastoEditado.concepto} onChange={handleEditChange} placeholder="Concepto"/>
                    <input name="monto" type="number" value={gastoEditado.monto} onChange={handleEditChange} step="0.01" placeholder="Monto"/>
                    <input name="fecha_gasto" type="date" value={gastoEditado.fecha_gasto} onChange={handleEditChange} />
                  </div>
                  <div className={styles['editando-acciones']}> {/* Div específico para acciones de edición */}
                    <button 
                        onClick={() => guardarEdicion(g.gasto_id)} 
                        className={`${styles.botonAccion} ${styles.botonGuardar}`} // Clases combinadas
                        disabled={isSubmitting}>
                      {isSubmitting ? '...' : 'Guardar'}
                    </button>
                    <button 
                        onClick={() => setEditandoId(null)} 
                        className={`${styles.botonAccion} ${styles.botonCancelarEdicion}`}> {/* Clase específica para cancelar */}
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <> {/* Estructura mejorada para mostrar información del gasto */}
                  <div className={styles.gastoInfo}>
                    <span className={styles.gastoConcepto}>{g.concepto}</span>
                    <span className={styles.gastoMonto}>${parseFloat(g.monto).toFixed(2)}</span>
                    <div className={styles.gastoDetalles}>
                      <span className={styles.gastoTipo}>{g.tipo_gasto}</span>
                      {g.fecha_gasto && <span className={styles.gastoFecha}>{new Date(g.fecha_gasto).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className={styles.acciones}>
                    <button onClick={() => editarGasto(g)} className={`${styles.botonAccion} ${styles.botonEditar}`}>Editar</button>
                    <button onClick={() => eliminarGasto(g.gasto_id)} className={`${styles.botonAccion} ${styles.botonEliminar}`}>Eliminar</button>
                  </div>
                </>
              )}
            </li>
          )) : (
            <li className={styles.noGastos}>No hay gastos para mostrar con el filtro actual.</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default Gastos;