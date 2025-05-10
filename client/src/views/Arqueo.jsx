import React, { useState, useEffect } from 'react';
import './Arqueo.css';

const Arqueo = () => {
  const [montoApertura, setMontoApertura] = useState('');
  const [cajaAbierta, setCajaAbierta] = useState(false); // true si hay un arqueo activo
  const [arqueoActivo, setArqueoActivo] = useState(null); // Datos del arqueo activo/cerrado
  const [historial, setHistorial] = useState([]);
  
  // Estados para los inputs del cierre
  const [montoCierreEfectivo, setMontoCierreEfectivo] = useState('');
  const [montoCierreTarjeta, setMontoCierreTarjeta] = useState('');
  const [montoCierreTransferencia, setMontoCierreTransferencia] = useState('');
  const [notasCierre, setNotasCierre] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  const fetchArqueoActivo = async () => {
    try {
      const response = await fetch('/api/arqueos/activo');
      const data = await response.json();
      if (response.ok && data && data.arqueo_id) {
        setArqueoActivo(data);
        setCajaAbierta(true);
        setMontoApertura(data.monto_inicial.toString()); // Precargar si se retoma
      } else {
        setArqueoActivo(null);
        setCajaAbierta(false);
      }
    } catch (err) {
      setError(`Error al cargar arqueo activo: ${err.message}`);
      setCajaAbierta(false);
    }
  };

  const fetchHistorial = async () => {
    try {
      const response = await fetch('/api/arqueos');
      if (!response.ok) throw new Error('No se pudo cargar el historial.');
      const data = await response.json();
      setHistorial(data || []);
    } catch (err) {
      setError(`Error al cargar historial: ${err.message}`);
    }
  };

  useEffect(() => {
    const cargarDatosIniciales = async () => {
      setLoading(true);
      setError(null);
      await fetchArqueoActivo();
      await fetchHistorial();
      setLoading(false);
    };
    cargarDatosIniciales();
  }, []);

  const handleAbrirCaja = async () => {
    if (montoApertura.trim() === '' || isNaN(parseFloat(montoApertura))) {
      setError('Ingrese un monto inicial válido.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/arqueos/abrir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto_inicial: parseFloat(montoApertura) }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al abrir la caja.');
      }
      setArqueoActivo(data);
      setCajaAbierta(true);
      alert('Caja abierta exitosamente.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCerrarCaja = async () => {
    if (montoCierreEfectivo.trim() === '' || isNaN(parseFloat(montoCierreEfectivo)) ||
        montoCierreTarjeta.trim() === '' || isNaN(parseFloat(montoCierreTarjeta)) ||
        montoCierreTransferencia.trim() === '' || isNaN(parseFloat(montoCierreTransferencia))) {
      setError('Todos los montos de cierre son requeridos y deben ser números.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        monto_cierre_efectivo_real: parseFloat(montoCierreEfectivo),
        monto_cierre_tarjeta_real: parseFloat(montoCierreTarjeta),
        monto_cierre_transferencia_real: parseFloat(montoCierreTransferencia),
        notas_cierre: notasCierre.trim() || null,
      };
      const response = await fetch('/api/arqueos/cerrar', { // El ID se infiere en el backend
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al cerrar la caja.');
      }
      setArqueoActivo(data); // Mostrar el arqueo ya cerrado con todos los cálculos
      setCajaAbierta(true); // Mantenerla "abierta" en el UI para mostrar el resultado final
      // La lógica de "reiniciar" se maneja con el botón "Abrir Nueva Caja"
      await fetchHistorial(); // Actualizar historial
      alert('Caja cerrada exitosamente.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reiniciarParaNuevaCaja = () => {
    setMontoApertura('');
    setCajaAbierta(false);
    setArqueoActivo(null);
    setMontoCierreEfectivo('');
    setMontoCierreTarjeta('');
    setMontoCierreTransferencia('');
    setNotasCierre('');
    setError(null);
  };

  if (loading) {
    return <div className="arqueo-container"><h1>Arqueo de Caja</h1><p>Cargando...</p></div>;
  }

  return (
    <div className="arqueo-container">
      <h1>Arqueo de Caja</h1>
      {error && <p className="error-message">{error}</p>}

      {!cajaAbierta ? (
        <div className="apertura">
          <h2>Apertura de Caja</h2>
          <input
            type="number"
            placeholder="Monto inicial en caja"
            value={montoApertura}
            onChange={(e) => setMontoApertura(e.target.value)}
            disabled={isSubmitting}
          />
          <button onClick={handleAbrirCaja} disabled={isSubmitting}>
            {isSubmitting ? 'Abriendo...' : 'Abrir Caja'}
          </button>
        </div>
      ) : (
        <>
          {/* Sección para ingresar montos de cierre si la caja está activa (arqueoActivo no tiene fecha_hora_cierre) */}
          {arqueoActivo && !arqueoActivo.fecha_hora_cierre && (
            <div className="cierre-caja-form">
              <h2>Cerrar Caja</h2>
              <p><strong>Caja Abierta el:</strong> {formatDateTime(arqueoActivo?.fecha_hora_apertura)}</p>
              <p><strong>Monto Inicial:</strong> ${parseFloat(arqueoActivo?.monto_inicial || 0).toFixed(2)}</p>
              
              <h3>Contado al Cerrar:</h3>
              <input
                type="number"
                placeholder="Efectivo real en caja"
                value={montoCierreEfectivo}
                onChange={(e) => setMontoCierreEfectivo(e.target.value)}
                disabled={isSubmitting}
              />
              <input
                type="number"
                placeholder="Total Tarjeta real"
                value={montoCierreTarjeta}
                onChange={(e) => setMontoCierreTarjeta(e.target.value)}
                disabled={isSubmitting}
              />
              <input
                type="number"
                placeholder="Total Transferencia real"
                value={montoCierreTransferencia}
                onChange={(e) => setMontoCierreTransferencia(e.target.value)}
                disabled={isSubmitting}
              />
              <textarea
                placeholder="Notas de cierre (opcional)"
                value={notasCierre}
                onChange={(e) => setNotasCierre(e.target.value)}
                disabled={isSubmitting}
                rows="3"
              ></textarea>
              <button onClick={handleCerrarCaja} disabled={isSubmitting}>
                {isSubmitting ? 'Cerrando...' : 'Cerrar Caja'}
              </button>
            </div>
          )}

          {/* Mostrar resultados del arqueo cerrado */}
          {arqueoActivo && arqueoActivo.fecha_hora_cierre && (
            <div className="resultado-final">
              <h2>Resultado del Arqueo ID: {arqueoActivo.arqueo_id}</h2>
              <p><strong>Apertura:</strong> {formatDateTime(arqueoActivo.fecha_hora_apertura)}</p>
              <p><strong>Cierre:</strong> {formatDateTime(arqueoActivo.fecha_hora_cierre)}</p>
              <hr/>
              <p><strong>Monto Inicial:</strong> ${parseFloat(arqueoActivo.monto_inicial).toFixed(2)}</p>
              <p><strong>Ventas Efectivo (Calculado):</strong> ${parseFloat(arqueoActivo.ventas_efectivo_calculado).toFixed(2)}</p>
              <p><strong>Ventas Tarjeta (Calculado):</strong> ${parseFloat(arqueoActivo.ventas_tarjeta_calculado).toFixed(2)}</p>
              <p><strong>Ventas Transferencia (Calculado):</strong> ${parseFloat(arqueoActivo.ventas_transferencia_calculado).toFixed(2)}</p>
              <p><strong>Gastos (Calculado):</strong> -${parseFloat(arqueoActivo.gastos_calculado).toFixed(2)}</p>
              <hr/>
              <p><strong>Monto Final Esperado (Efectivo):</strong> ${parseFloat(arqueoActivo.monto_final_esperado_efectivo).toFixed(2)}</p>
              <p><strong>Monto Cierre Efectivo (Real):</strong> ${parseFloat(arqueoActivo.monto_cierre_efectivo_real).toFixed(2)}</p>
              <p style={{ color: Math.abs(parseFloat(arqueoActivo.diferencia_efectivo)) < 0.01 ? 'green' : 'red', fontWeight: 'bold' }}>
                <strong>Diferencia Efectivo:</strong> ${parseFloat(arqueoActivo.diferencia_efectivo).toFixed(2)}
              </p>
              <hr/>
              <p><strong>Monto Cierre Tarjeta (Real):</strong> ${parseFloat(arqueoActivo.monto_cierre_tarjeta_real).toFixed(2)}</p>
               <p style={{ color: Math.abs(parseFloat(arqueoActivo.diferencia_tarjeta)) < 0.01 ? 'green' : 'red', fontWeight: 'bold' }}>
                <strong>Diferencia Tarjeta:</strong> ${parseFloat(arqueoActivo.diferencia_tarjeta).toFixed(2)}
              </p>
              <hr/>
              <p><strong>Monto Cierre Transferencia (Real):</strong> ${parseFloat(arqueoActivo.monto_cierre_transferencia_real).toFixed(2)}</p>
              <p style={{ color: Math.abs(parseFloat(arqueoActivo.diferencia_transferencia)) < 0.01 ? 'green' : 'red', fontWeight: 'bold' }}>
                <strong>Diferencia Transferencia:</strong> ${parseFloat(arqueoActivo.diferencia_transferencia).toFixed(2)}
              </p>
              {arqueoActivo.notas_cierre && <p><strong>Notas:</strong> {arqueoActivo.notas_cierre}</p>}
              <button onClick={reiniciarParaNuevaCaja}>Abrir Nueva Caja</button>
            </div>
          )}
        </>
      )}

      <hr />
      <h2>Historial de Arqueos Cerrados</h2>
      {historial.length === 0 && !loading && <p>No hay arqueos cerrados registrados.</p>}
      {historial.map((a) => (
        <div key={a.arqueo_id} className="registro-arqueo">
          <p><strong>ID: {a.arqueo_id} | Fecha Apertura:</strong> {formatDateTime(a.fecha_hora_apertura)} | <strong>Fecha Cierre:</strong> {formatDateTime(a.fecha_hora_cierre)}</p>
          <p>M. Inicial: ${parseFloat(a.monto_inicial).toFixed(2)}</p>
          <p>Ventas Efectivo: ${parseFloat(a.ventas_efectivo_calculado).toFixed(2)} | Contado: ${parseFloat(a.monto_cierre_efectivo_real).toFixed(2)} | Δ: ${parseFloat(a.diferencia_efectivo).toFixed(2)}</p>
          <p>Ventas Tarjeta: ${parseFloat(a.ventas_tarjeta_calculado).toFixed(2)} | Contado: ${parseFloat(a.monto_cierre_tarjeta_real).toFixed(2)} | Δ: ${parseFloat(a.diferencia_tarjeta).toFixed(2)}</p>
          <p>Ventas Transferencia: ${parseFloat(a.ventas_transferencia_calculado).toFixed(2)} | Contado: ${parseFloat(a.monto_cierre_transferencia_real).toFixed(2)} | Δ: ${parseFloat(a.diferencia_transferencia).toFixed(2)}</p>
          <p>Gastos: ${parseFloat(a.gastos_calculado).toFixed(2)}</p>
          {a.notas_cierre && <p><i>Notas: {a.notas_cierre}</i></p>}
          <hr />
        </div>
      ))}
    </div>
  );
};

export default Arqueo;