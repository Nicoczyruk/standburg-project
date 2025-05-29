import React, { useState, useEffect } from 'react';
import './MovimientoCaja.css';

const MovimientoCaja = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [filtros, setFiltros] = useState({ fecha: '' }); // Filtro de fecha
  const [nuevoMovimiento, setNuevoMovimiento] = useState({
    tipo_movimiento: 'INGRESO', // Coincide con el backend
    descripcion: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0], // Fecha actual por defecto
    metodo_pago_afectado: 'efectivo' // Asumir efectivo por defecto o añadir input
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDisplayDate = (isoDateString) => {
    if (!isoDateString) return 'N/A';
    try {
        // La fecha del backend ya viene en un formato que toLocaleDateString puede usar
        // o si es un string ISO completo:
        const date = new Date(isoDateString);
        if (isNaN(date.getTime())) return 'Fecha inválida';
        return date.toLocaleDateString(); // Formato local
    } catch (e) {
        return 'Fecha inválida';
    }
  };


  // Cargar movimientos desde la API
  const fetchMovimientos = async () => {
    setLoading(true);
    setError(null);
    let url = '/api/movimientos-caja';
    if (filtros.fecha) {
      url += `?fecha=${filtros.fecha}`;
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
    } finally {
      setLoading(false);
    }
  };

  // useEffect para cargar movimientos al montar y cuando cambie el filtro de fecha
  useEffect(() => {
    fetchMovimientos();
  }, [filtros.fecha]); // Recargar si cambia el filtro de fecha

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
      tipo_movimiento: nuevoMovimiento.tipo_movimiento, // 'INGRESO' o 'EGRESO'
      descripcion: nuevoMovimiento.descripcion.trim(),
      monto: montoFloat,
      fecha: nuevoMovimiento.fecha, // El backend espera una fecha que pueda parsear
      metodo_pago_afectado: nuevoMovimiento.metodo_pago_afectado // ej: 'efectivo'
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
      
      await fetchMovimientos(); // Recargar la lista
      setNuevoMovimiento({ // Limpiar formulario
        tipo_movimiento: 'INGRESO',
        descripcion: '',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        metodo_pago_afectado: 'efectivo'
      });
      alert('Movimiento agregado exitosamente!');

    } catch (err) {
      console.error("Error al agregar movimiento:", err);
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCaja = movimientos.reduce((acc, mov) => {
    const monto = parseFloat(mov.monto) || 0;
    return mov.tipo_movimiento === 'INGRESO' ? acc + monto : acc - monto;
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
        
        {}
        <button onClick={agregarMovimiento} disabled={isSubmitting}>
          {isSubmitting ? 'Agregando...' : 'Agregar Movimiento'}
        </button>
      </div>
      {submitError && <p style={{ color: 'red', marginTop: '10px' }}>{submitError}</p>}

      <div className="filtros">
        <input
          type="date"
          name="fecha" // Para que handleFiltroChange funcione
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
            {}
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
                {}
              </tr>
            ))
          ) : (
            !loading && <tr><td colSpan="4">No hay movimientos para mostrar.</td></tr>
          )}
        </tbody>
      </table>

      <h2 className="total-caja">Saldo Actual (Movimientos Manuales): ${totalCaja.toFixed(2)}</h2>
    </div>
  );
};

export default MovimientoCaja;