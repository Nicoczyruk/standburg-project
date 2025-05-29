import React, { useState, useEffect } from 'react';
import styles from './Arqueo.module.css';

const Arqueo = () => {
  const [montoApertura, setMontoApertura] = useState('');
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [arqueoActivo, setArqueoActivo] = useState(null);
  const [historial, setHistorial] = useState([]);
  
  const [montoCierreEfectivo, setMontoCierreEfectivo] = useState('');
  const [montoCierreTarjeta, setMontoCierreTarjeta] = useState('');
  const [montoCierreTransferencia, setMontoCierreTransferencia] = useState('');
  const [notasCierre, setNotasCierre] = useState('');

  // Desglose de billetes - lo mantenemos si tu lógica original lo usaba extensivamente.
  // Si no, se puede simplificar a un solo input para el total de efectivo real.
  // Por ahora, lo mantendré si estaba en tu versión funcional.
  const [denominaciones, setDenominaciones] = useState({
    b2000:0, b1000:0, b500:0, b200:0, b100:0, b50:0, b20:0, b10:0,
    m10:0, m5:0, m2:0, m1:0, m050:0, m025:0, m010:0 
  });
  const [totalContadoBilletes, setTotalContadoBilletes] = useState(0);


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      return `${date.toLocaleDateString('es-AR', {day: '2-digit', month: '2-digit', year: 'numeric'})} ${date.toLocaleTimeString('es-AR', {hour: '2-digit', minute: '2-digit', hour12: false})}`;
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  // --- Mantenemos lógica original de fetchArqueoActivo, fetchHistorial, useEffect, handleAbrirCaja, handleCerrarCaja, reiniciarParaNuevaCaja ---
  // ... (COPIA AQUÍ LAS FUNCIONES DE MANEJO DE DATOS Y ESTADOS DE TU Arqueo.jsx FUNCIONAL)
  // Asegúrate de que las URLs de fetch sean /api/arqueos/activo y /api/arqueos
  const fetchArqueoActivo = async () => {
    try {
      const response = await fetch('/api/arqueos/activo'); 
      const data = await response.json();
      if (response.ok && data && data.arqueo_id) {
        setArqueoActivo(data);
        setCajaAbierta(true);
        setMontoApertura(data.monto_inicial.toString()); 
        if (data.fecha_hora_cierre) { // Si el arqueo activo ya está cerrado
          setCajaAbierta(false); // Para mostrar el resumen y luego opción de abrir nueva
        }
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
    if (montoApertura.trim() === '' || isNaN(parseFloat(montoApertura)) || parseFloat(montoApertura) <=0) {
      setError('Ingrese un monto inicial válido y mayor a cero.');
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
      setArqueoActivo(data); // El backend devuelve el nuevo arqueo activo
      setCajaAbierta(true);
      setMontoApertura(''); // Limpiar después de abrir
      // alert('Caja abierta exitosamente.'); // Puedes usar un toast o mensaje más sutil
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Lógica para calcular el total del desglose de billetes y monedas (si la usas)
   const calcularTotalBilletes = (currentDenominaciones) => {
    let total = 0;
    total += (currentDenominaciones.b2000 || 0) * 2000;
    total += (currentDenominaciones.b1000 || 0) * 1000;
    // ... (resto de tu lógica de cálculo de billetes)
    total += (currentDenominaciones.m010 || 0) * 0.10;
    return total;
  };

  const handleDenominacionChange = (e) => {
    const { name, value } = e.target;
    const newDenominaciones = {
      ...denominaciones,
      [name]: parseInt(value, 10) || 0,
    };
    setDenominaciones(newDenominaciones);
    const newTotal = calcularTotalBilletes(newDenominaciones); // Asumiendo que tienes esta función
    setTotalContadoBilletes(newTotal);
    setMontoCierreEfectivo(newTotal.toString()); 
  };


  const handleCerrarCaja = async () => {
    // Validación básica, puedes expandirla
    if (isNaN(parseFloat(montoCierreEfectivo)) || isNaN(parseFloat(montoCierreTarjeta)) || isNaN(parseFloat(montoCierreTransferencia))) {
      setError('Todos los montos de cierre deben ser números válidos.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        monto_cierre_efectivo_real: parseFloat(montoCierreEfectivo) || 0,
        monto_cierre_tarjeta_real: parseFloat(montoCierreTarjeta) || 0,
        monto_cierre_transferencia_real: parseFloat(montoCierreTransferencia) || 0,
        notas_cierre: notasCierre.trim() || null, // Asegúrate que el backend espera 'notas_cierre'
        // Si usas el desglose de billetes, también deberías enviarlo:
        // denominaciones: denominaciones, 
      };
      const response = await fetch('/api/arqueos/cerrar', { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al cerrar la caja.');
      }
      setArqueoActivo(data); // El backend devuelve el arqueo cerrado con cálculos
      setCajaAbierta(false); // Importante: la caja ahora está cerrada para permitir una nueva apertura
      
      // Limpiar campos después de cerrar
      setMontoCierreEfectivo('');
      setMontoCierreTarjeta('');
      setMontoCierreTransferencia('');
      setNotasCierre('');
      setDenominaciones({ b2000:0, b1000:0, b500:0, b200:0, b100:0, b50:0, b20:0, b10:0, m10:0, m5:0, m2:0, m1:0, m050:0, m025:0, m010:0 });
      setTotalContadoBilletes(0);

      await fetchHistorial(); 
      // alert('Caja cerrada exitosamente.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const reiniciarParaNuevaCaja = () => {
    setMontoApertura('');
    setCajaAbierta(false);
    setArqueoActivo(null); // Crucial para limpiar el resumen y permitir nueva apertura
    setMontoCierreEfectivo('');
    setMontoCierreTarjeta('');
    setMontoCierreTransferencia('');
    setNotasCierre('');
    setError(null);
  };

  // --- Fin de la Lógica ---

  if (loading) {
    return <div className={styles['arqueo-container']}><h1>Arqueo de Caja</h1><p className={styles['loading-message']}>Cargando...</p></div>;
  }

  // Determinar qué mostrar basado en el estado
  let contenidoPrincipal;
  if (!cajaAbierta && (!arqueoActivo || arqueoActivo.fecha_hora_cierre)) {
    // Mostrar formulario de Apertura
    contenidoPrincipal = (
      <div className={styles['seccion-formulario']}>
        <h2>Apertura de Caja</h2>
        <div className={styles['input-group']}>
          <label htmlFor="montoApertura">Monto inicial en caja:</label>
          <input
            id="montoApertura"
            type="number"
            placeholder="Monto inicial"
            value={montoApertura}
            onChange={(e) => setMontoApertura(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        <button onClick={handleAbrirCaja} disabled={isSubmitting} className={styles['boton-accion']}>
          {isSubmitting ? 'Abriendo...' : 'Abrir Caja'}
        </button>
      </div>
    );
  } else if (cajaAbierta && arqueoActivo && !arqueoActivo.fecha_hora_cierre) {
    // Mostrar formulario de Cierre
    contenidoPrincipal = (
      <div className={styles['seccion-formulario']}>
        <h2>Caja Abierta</h2>
        <p><strong>Caja Abierta el:</strong> {formatDateTime(arqueoActivo?.fecha_hora_apertura)}</p>
        <p><strong>Monto Inicial:</strong> ${parseFloat(arqueoActivo?.monto_inicial || 0).toFixed(2)}</p>
        
        {/* Desglose de billetes - si lo usabas */}
        <div className={styles['billetes-container']}>
          <h3>Detalle de Efectivo Contado:</h3>
          <div className={styles['billetes-grid']}>
            {Object.keys(denominaciones).map(key => (
              <div key={key} className={styles['billete-item']}>
                <label htmlFor={key}>{key.replace('b', '$').replace('m', '¢')}:</label>
                <input
                  type="number" id={key} name={key}
                  value={denominaciones[key]}
                  onChange={handleDenominacionChange}
                  min="0" step="1"
                />
              </div>
            ))}
          </div>
          <p className={styles['total-contado-billetes']}>Total Contado: ${totalContadoBilletes.toFixed(2)}</p>
        </div>

        {/* Montos de cierre */}
        <div className={styles['input-group']} style={{display: 'none'}}> {/* Oculto ya que se llena con el desglose */}
          <label htmlFor="montoCierreEfectivo">Efectivo real en caja:</label>
          <input id="montoCierreEfectivo" type="number" value={montoCierreEfectivo} readOnly />
        </div>
        <div className={styles['input-group']}>
          <label htmlFor="montoCierreTarjeta">Total Tarjeta real:</label>
          <input id="montoCierreTarjeta" type="number" placeholder="Total Tarjeta" value={montoCierreTarjeta} onChange={(e) => setMontoCierreTarjeta(e.target.value)} disabled={isSubmitting} />
        </div>
        <div className={styles['input-group']}>
          <label htmlFor="montoCierreTransferencia">Total Transferencia real:</label>
          <input id="montoCierreTransferencia" type="number" placeholder="Total Transferencia" value={montoCierreTransferencia} onChange={(e) => setMontoCierreTransferencia(e.target.value)} disabled={isSubmitting} />
        </div>
        <div className={styles['input-group']}>
          <label htmlFor="notasCierre">Notas de cierre (opcional):</label>
          <textarea id="notasCierre" value={notasCierre} onChange={(e) => setNotasCierre(e.target.value)} disabled={isSubmitting} rows="3"></textarea>
        </div>
        <button onClick={handleCerrarCaja} disabled={isSubmitting} className={`${styles['boton-accion']} ${styles['boton-cierre']}`}>
          {isSubmitting ? 'Cerrando...' : 'Cerrar Caja'}
        </button>
      </div>
    );
  } else if (arqueoActivo && arqueoActivo.fecha_hora_cierre) {
    // Mostrar Resumen del Arqueo Cerrado
    contenidoPrincipal = (
      <div className={`${styles['seccion-resultado']} ${styles['resultado-arqueo-detalles']}`}>
        <h2>Resultado del Arqueo ID: {arqueoActivo.arqueo_id}</h2>
        <p>
            <strong>Apertura:</strong>
            <span className={styles['valor-numerico']}>{formatDateTime(arqueoActivo.fecha_hora_apertura)}</span>
        </p>
        <p>
            <strong>Cierre:</strong>
            <span className={styles['valor-numerico']}>{formatDateTime(arqueoActivo.fecha_hora_cierre)}</span>
        </p>
        <p>
            <strong>Monto Inicial:</strong>
            <span className={styles['valor-numerico']}>${parseFloat(arqueoActivo.monto_inicial || 0).toFixed(2)}</span>
        </p>
        <p>
            <strong>Ventas Efectivo (Calculado):</strong>
            <span className={styles['valor-numerico']}>${parseFloat(arqueoActivo.ventas_efectivo_calculado || 0).toFixed(2)}</span>
        </p>
        <p>
            <strong>Ventas Tarjeta (Calculado):</strong>
            <span className={styles['valor-numerico']}>${parseFloat(arqueoActivo.ventas_tarjeta_calculado || 0).toFixed(2)}</span>
        </p>
        <p>
            <strong>Ventas Transferencia (Calculado):</strong>
            <span className={styles['valor-numerico']}>${parseFloat(arqueoActivo.ventas_transferencia_calculado || 0).toFixed(2)}</span>
        </p>
        <p>
            <strong>Gastos (Calculado):</strong>
            <span className={styles['valor-numerico']}>-${parseFloat(arqueoActivo.gastos_calculado || 0).toFixed(2)}</span>
        </p>
        <hr style={{margin: '15px 0', borderStyle: 'dashed'}}/>
        <p>
            <strong>Monto Final Esperado (Efectivo):</strong>
            <span className={styles['valor-numerico']}>${parseFloat(arqueoActivo.monto_final_esperado_efectivo || 0).toFixed(2)}</span>
        </p>
        <p>
            <strong>Monto Cierre Efectivo (Real):</strong>
            <span className={styles['valor-numerico']}>${parseFloat(arqueoActivo.monto_cierre_efectivo_real || 0).toFixed(2)}</span>
        </p>
        <p>
            <strong>Diferencia Efectivo:</strong>
            <span className={`${styles['valor-numerico']} ${parseFloat(arqueoActivo.diferencia_efectivo || 0) < 0 ? styles['valor-negativo'] : styles['valor-positivo']}`}>
            ${parseFloat(arqueoActivo.diferencia_efectivo || 0).toFixed(2)}
            </span>
        </p>
        <hr style={{margin: '15px 0', borderStyle: 'dashed'}}/>
        <p>
            <strong>Monto Cierre Tarjeta (Real):</strong>
            <span className={styles['valor-numerico']}>${parseFloat(arqueoActivo.monto_cierre_tarjeta_real || 0).toFixed(2)}</span>
        </p>
        <p>
            <strong>Diferencia Tarjeta:</strong>
            <span className={`${styles['valor-numerico']} ${parseFloat(arqueoActivo.diferencia_tarjeta || 0) < 0 ? styles['valor-negativo'] : styles['valor-positivo']}`}>
            ${parseFloat(arqueoActivo.diferencia_tarjeta || 0).toFixed(2)}
            </span>
        </p>
        <hr style={{margin: '15px 0', borderStyle: 'dashed'}}/>
        <p>
            <strong>Monto Cierre Transferencia (Real):</strong>
            <span className={styles['valor-numerico']}>${parseFloat(arqueoActivo.monto_cierre_transferencia_real || 0).toFixed(2)}</span>
        </p>
        <p>
            <strong>Diferencia Transferencia:</strong>
            <span className={`${styles['valor-numerico']} ${parseFloat(arqueoActivo.diferencia_transferencia || 0) < 0 ? styles['valor-negativo'] : styles['valor-positivo']}`}>
            ${parseFloat(arqueoActivo.diferencia_transferencia || 0).toFixed(2)}
            </span>
        </p>
        {arqueoActivo.notas_cierre && (
          <p>
            <strong>Notas:</strong>
            <span className={styles['valor-numerico']}>{arqueoActivo.notas_cierre}</span>
          </p>
        )}
        <button onClick={reiniciarParaNuevaCaja} className={`${styles['boton-accion']} ${styles['boton-reiniciar']}`}>
            Abrir Nueva Caja
        </button>
      </div>
    );
  }


  return (
    <div className={styles['arqueo-container']}>
      <h1>Arqueo de Caja</h1>
      {error && <p className={styles['error-message']}>{error}</p>}

      {contenidoPrincipal}

      <div className={styles['seccion-historial-contenedor']}>
        <h2>Historial de Arqueos Cerrados</h2>
        {historial.length === 0 && !loading && <p>No hay arqueos cerrados.</p>}
        {historial.map((a) => (
          <div key={a.arqueo_id} className={styles['registro-arqueo-card']}>
            <div className={styles['registro-header']}>
              <span className={styles['registro-id']}>ID Arqueo: {a.arqueo_id}</span>
              <div className={styles['registro-fechas']}>
                <span>Apertura: {formatDateTime(a.fecha_hora_apertura)}</span>
                <span>Cierre: {formatDateTime(a.fecha_hora_cierre)}</span>
              </div>
            </div>
            <div className={styles['registro-body']}>
              <div className={styles['registro-linea']}>
                <span className={styles['registro-label']}>M. Inicial:</span>
                <span className={styles['registro-valor']}>${parseFloat(a.monto_inicial || 0).toFixed(2)}</span>
              </div>
              <div className={styles['registro-linea']}>
                <span className={styles['registro-label']}>V. Efectivo (Sistema):</span>
                <span className={styles['registro-valor']}>${parseFloat(a.ventas_efectivo_calculado || 0).toFixed(2)}</span>
              </div>
              <div className={styles['registro-linea']}>
                <span className={styles['registro-label']}>Efectivo Real:</span>
                <span className={styles['registro-valor']}>${parseFloat(a.monto_cierre_efectivo_real || 0).toFixed(2)}</span>
              </div>
              <div className={styles['registro-linea']}>
                <span className={styles['registro-label']}>Dif. Efectivo:</span>
                <span className={`${styles['registro-valor']} ${parseFloat(a.diferencia_efectivo || 0) < 0 ? styles['valor-negativo'] : styles['valor-positivo']}`}>
                  ${parseFloat(a.diferencia_efectivo || 0).toFixed(2)}
                </span>
              </div>
              <div className={styles['registro-linea']}>
                <span className={styles['registro-label']}>V. Tarjeta (Sistema):</span>
                <span className={styles['registro-valor']}>${parseFloat(a.ventas_tarjeta_calculado || 0).toFixed(2)}</span>
              </div>
              <div className={styles['registro-linea']}>
                <span className={styles['registro-label']}>Tarjeta Real:</span>
                <span className={styles['registro-valor']}>${parseFloat(a.monto_cierre_tarjeta_real || 0).toFixed(2)}</span>
              </div>
              <div className={styles['registro-linea']}>
                <span className={styles['registro-label']}>Dif. Tarjeta:</span>
                <span className={`${styles['registro-valor']} ${parseFloat(a.diferencia_tarjeta || 0) < 0 ? styles['valor-negativo'] : styles['valor-positivo']}`}>
                  ${parseFloat(a.diferencia_tarjeta || 0).toFixed(2)}
                </span>
              </div>
              <div className={styles['registro-linea']}>
                <span className={styles['registro-label']}>V. Transferencia (Sistema):</span>
                <span className={styles['registro-valor']}>${parseFloat(a.ventas_transferencia_calculado || 0).toFixed(2)}</span>
              </div>
              <div className={styles['registro-linea']}>
                <span className={styles['registro-label']}>Transferencia Real:</span>
                <span className={styles['registro-valor']}>${parseFloat(a.monto_cierre_transferencia_real || 0).toFixed(2)}</span>
              </div>
              <div className={styles['registro-linea']}>
                <span className={styles['registro-label']}>Dif. Transferencia:</span>
                <span className={`${styles['registro-valor']} ${parseFloat(a.diferencia_transferencia || 0) < 0 ? styles['valor-negativo'] : styles['valor-positivo']}`}>
                  ${parseFloat(a.diferencia_transferencia || 0).toFixed(2)}
                </span>
              </div>
              <div className={styles['registro-linea']}>
                <span className={styles['registro-label']}>Gastos (Sistema):</span>
                <span className={styles['registro-valor']}>${parseFloat(a.gastos_calculado || 0).toFixed(2)}</span>
              </div>
              {a.notas_cierre && (
                <div className={styles['registro-notas']}>
                  <span className={styles['registro-label']}>Notas:</span>
                  <span className={styles['registro-valor']}>{a.notas_cierre}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Arqueo;