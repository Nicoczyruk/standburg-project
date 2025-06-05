import React, { useState, useEffect, useCallback } from 'react';
import './MovimientoCaja.css';

const MovimientoCaja = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [filtros, setFiltros] = useState({ fecha: '' });
  const [nuevoMovimiento, setNuevoMovimiento] = useState({
    tipo_movimiento: 'INGRESO',
    descripcion: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    metodo_pago_afectado: 'efectivo'
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Estados para el modal de edición ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movimientoActualEdicion, setMovimientoActualEdicion] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Función para formatear fecha para inputs tipo 'date' (YYYY-MM-DD)
   const formatInputDate = (isoDateString) => {
    if (!isoDateString) return '';
    try {
        const date = new Date(isoDateString);
        if (isNaN(date.getTime())) return '';
        
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return '';
    }
  };
  
  // Función para mostrar fecha en la tabla (formato local)
  const formatDisplayDate = (isoDateString) => {
    if (!isoDateString) return 'N/A';
    try {
        const date = new Date(isoDateString);
        if (isNaN(date.getTime())) return 'Fecha inválida';
        return date.toLocaleDateString(); 
    } catch (e) {
        return 'Fecha inválida';
    }
  };

  const fetchMovimientos = useCallback(async () => {
    setLoading(true);
    setError(null);
    let url = '/api/movimientos-caja';
    const queryParams = new URLSearchParams();
    if (filtros.fecha) {
      queryParams.append('fecha', filtros.fecha);
    }
    
    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Error al cargar movimientos' }));
        throw new Error(errData.message || `Error ${response.status}`);
      }
      const data = await response.json();
      setMovimientos(data || []);
    } catch (err) {
      console.error("Error fetching movimientos:", err);
      setError(err.message);
      setMovimientos([]);
    } finally {
      setLoading(false);
    }
  }, [filtros.fecha]); // Dependencia correcta

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]); // fetchMovimientos ya tiene filtros.fecha como dependencia

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNuevoMovimiento(prev => ({ ...prev, [name]: value }));
  };

  const handleFiltroChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  const agregarMovimiento = async () => {
    if (!nuevoMovimiento.descripcion.trim() || !nuevoMovimiento.monto.trim()) {
      setSubmitError('Descripción y Monto son obligatorios.');
      return;
    }
    const montoFloat = parseFloat(nuevoMovimiento.monto);
    if (isNaN(montoFloat) || montoFloat <= 0) {
      setSubmitError('El monto debe ser un número positivo.');
      return;
    }
    if (!nuevoMovimiento.fecha) {
        setSubmitError('La fecha es obligatoria.');
        return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    const payload = {
      tipo_movimiento: nuevoMovimiento.tipo_movimiento,
      descripcion: nuevoMovimiento.descripcion.trim(),
      monto: montoFloat,
      fecha: nuevoMovimiento.fecha, 
      metodo_pago_afectado: nuevoMovimiento.metodo_pago_afectado
    };

    try {
      const response = await fetch('/api/movimientos-caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error al agregar movimiento' }));
        throw new Error(errorData.message || `Error ${response.status}`);
      }
      
      await fetchMovimientos(); 
      setNuevoMovimiento({ 
        tipo_movimiento: 'INGRESO',
        descripcion: '',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        metodo_pago_afectado: 'efectivo'
      });
    } catch (err) {
      console.error("Error al agregar movimiento:", err);
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Funciones para el modal y CRUD ---
  const handleAbrirModalEditar = (movimiento) => {
    setMovimientoActualEdicion({
        ...movimiento, // Copia todos los campos del movimiento
        fecha: formatInputDate(movimiento.fecha_hora_movimiento) 
    });
    setIsModalOpen(true);
    setModalError(null);
  };

  const handleCerrarModal = () => {
    setIsModalOpen(false);
    setMovimientoActualEdicion(null);
    setModalError(null);
  };

  const handleChangeModal = (e) => {
    const { name, value } = e.target;
    setMovimientoActualEdicion({ ...movimientoActualEdicion, [name]: value });
  };

  const handleGuardarCambiosMovimiento = async (e) => {
    e.preventDefault();
    if (!movimientoActualEdicion) return;
    setIsUpdating(true);
    setModalError(null);

    const { movimiento_id, tipo_movimiento, descripcion, monto, fecha, metodo_pago_afectado } = movimientoActualEdicion;

    if (!descripcion || !monto || !fecha) {
        setModalError("Descripción, monto y fecha son obligatorios.");
        setIsUpdating(false);
        return;
    }
     if (parseFloat(monto) <= 0) {
        setModalError("El monto debe ser un número positivo.");
        setIsUpdating(false);
        return;
    }
    
    const movimientoOriginal = movimientos.find(m => m.movimiento_id === movimiento_id);
    const originalDateTime = new Date(movimientoOriginal?.fecha_hora_movimiento || Date.now());
    const newDatePart = new Date(fecha); // El input 'date' da YYYY-MM-DD, se interpreta a las 00:00 UTC

    // Combinar la nueva fecha con la hora original para preservar la hora del día del movimiento
    const finalDate = new Date(
        newDatePart.getUTCFullYear(), // Usar UTC para evitar desfases de zona horaria del navegador
        newDatePart.getUTCMonth(),
        newDatePart.getUTCDate(),
        originalDateTime.getHours(), // Mantener hora original
        originalDateTime.getMinutes(),
        originalDateTime.getSeconds()
    );

    const payload = {
        tipo_movimiento,
        descripcion,
        monto: parseFloat(monto),
        fecha: finalDate.toISOString(), // Enviar fecha en formato ISO completo al backend
        metodo_pago_afectado
    };

    try {
        const response = await fetch(`/api/movimientos-caja/${movimiento_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({ message: 'Error al actualizar movimiento' }));
            throw new Error(errData.message || `Error ${response.status}`);
        }
        fetchMovimientos(); 
        handleCerrarModal();
    } catch (err) {
        setModalError(err.message);
    } finally {
        setIsUpdating(false);
    }
  };

  const handleEliminarMovimiento = async (movimientoId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este movimiento?')) {
        try {
            const response = await fetch(`/api/movimientos-caja/${movimientoId}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ message: 'Error al eliminar movimiento' }));
                throw new Error(errData.message || `Error ${response.status}`);
            }
            fetchMovimientos();
        } catch (err) {
            setError(`Error al eliminar: ${err.message}`); 
        }
    }
  };

  const totalCaja = movimientos.reduce((acc, mov) => {
    const montoNum = parseFloat(mov.monto) || 0;
    return mov.tipo_movimiento === 'INGRESO' ? acc + montoNum : acc - montoNum;
  }, 0);

  return (
    <div className="movimiento-caja-container">
      <h1>Movimiento de Caja</h1> 
      {error && <p className="error-message" style={{color: 'red'}}>{error}</p>}

      
      <div className="form-movimiento">
        <select
          name="tipo_movimiento"
          value={nuevoMovimiento.tipo_movimiento}
          onChange={handleInputChange}
          disabled={isSubmitting}
        >
          <option value="INGRESO">Ingreso</option>
          <option value="EGRESO">Egreso</option>
        </select>
        <input
          type="text"
          name="descripcion"
          placeholder="Descripción"
          value={nuevoMovimiento.descripcion}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />
        <input
          type="number"
          name="monto"
          placeholder="Monto"
          step="0.01"
          value={nuevoMovimiento.monto}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />
        <input
          type="date"
          name="fecha"
          value={nuevoMovimiento.fecha}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />
        <button onClick={agregarMovimiento} disabled={isSubmitting}>
          {isSubmitting ? 'Agregando...' : 'Agregar Movimiento'}
        </button>
      </div>
      {submitError && <p style={{ color: 'red', marginTop: '10px' }}>{submitError}</p>}

      <div className="filtros">
        <input
          type="date"
          name="fecha"
          placeholder="Filtrar por fecha"
          value={filtros.fecha}
          onChange={handleFiltroChange}
        />
      </div>

      {loading && <p>Cargando movimientos...</p>}
      <table className="tabla-movimientos">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Descripción</th>
            <th>Monto</th>
            <th>Fecha</th>
            <th>Método</th> 
            <th>Acciones</th> 
          </tr>
        </thead>
        <tbody>
          {movimientos.length > 0 ? (
            movimientos.map((m) => (
              <tr key={m.movimiento_id} className={m.tipo_movimiento === 'INGRESO' ? 'ingreso' : 'egreso'}>
                <td>{m.tipo_movimiento}</td>
                <td>{m.descripcion}</td>
                <td>${(parseFloat(m.monto) || 0).toFixed(2)}</td>
                <td>{formatDisplayDate(m.fecha_hora_movimiento)}</td>
                <td>{m.metodo_pago_afectado || 'N/A'}</td> {/* Mostrar método */}
                <td>
                  <button onClick={() => handleAbrirModalEditar(m)} className="btn-accion btn-modificar">Modificar</button>
                  <button onClick={() => handleEliminarMovimiento(m.movimiento_id)} className="btn-accion btn-eliminar">Eliminar</button>
                </td>
              </tr>
            ))
          ) : (
            !loading && <tr><td colSpan="6">No hay movimientos para mostrar.</td></tr> /* Ajustado colSpan */
          )}
        </tbody>
      </table>

      <h2 className="total-caja">Saldo Actual (Movimientos Manuales): ${totalCaja.toFixed(2)}</h2>

      {/* --- Modal de Edición --- */}
      {isModalOpen && movimientoActualEdicion && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Modificar Movimiento</h3>
            {modalError && <p className="error-message modal-error-message" style={{color: 'red'}}>{modalError}</p>}
            <form onSubmit={handleGuardarCambiosMovimiento}>
              <div className="form-grupo"> 
                <label htmlFor="tipo_movimiento_modal">Tipo:</label>
                <select id="tipo_movimiento_modal" name="tipo_movimiento" value={movimientoActualEdicion.tipo_movimiento} onChange={handleChangeModal} required>
                  <option value="INGRESO">Ingreso</option>
                  <option value="EGRESO">Egreso</option>
                </select>
              </div>
              <div className="form-grupo">
                <label htmlFor="descripcion_modal">Descripción:</label>
                <input id="descripcion_modal" type="text" name="descripcion" value={movimientoActualEdicion.descripcion} onChange={handleChangeModal} required />
              </div>
              <div className="form-grupo">
                <label htmlFor="monto_modal">Monto:</label>
                <input id="monto_modal" type="number" name="monto" value={movimientoActualEdicion.monto} onChange={handleChangeModal} required step="0.01" min="0.01"/>
              </div>
              <div className="form-grupo">
                <label htmlFor="fecha_modal">Fecha:</label>
                <input id="fecha_modal" type="date" name="fecha" value={movimientoActualEdicion.fecha} onChange={handleChangeModal} required />
              </div>
              <div className="form-grupo">
                <label htmlFor="metodo_pago_afectado_modal">Método Afectado:</label>
                <input id="metodo_pago_afectado_modal" type="text" name="metodo_pago_afectado" value={movimientoActualEdicion.metodo_pago_afectado || ''} onChange={handleChangeModal} placeholder="Ej: efectivo, banco_x"/>
              </div>
              <div className="modal-acciones">
                <button type="submit" disabled={isUpdating} className="btn-submit">
                  {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button type="button" onClick={handleCerrarModal} disabled={isUpdating} className="btn-cancel">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovimientoCaja;