import React, { useState, useEffect } from 'react';
import './Arqueo.css';

// Simulaciones de ventas y gastos
const mockVentas = [
  { id: 1, total: 3000, metodo: 'efectivo' },
  { id: 2, total: 2500, metodo: 'tarjeta' },
  { id: 3, total: 1800, metodo: 'transferencia' },
  { id: 4, total: 2000, metodo: 'efectivo' },
];

const mockGastos = [
  { id: 1, motivo: 'Panadería', monto: 800 },
  { id: 2, motivo: 'Limpieza', monto: 600 },
];

const Arqueo = () => {
  const [montoApertura, setMontoApertura] = useState('');
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [cerrada, setCerrada] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [inicio, setInicio] = useState(null);
  const [fin, setFin] = useState(null);

  const [efectivoContado, setEfectivoContado] = useState('');
  const [tarjetaContado, setTarjetaContado] = useState('');
  const [transferenciaContado, setTransferenciaContado] = useState('');

  useEffect(() => {
    const guardado = localStorage.getItem('historialArqueos');
    if (guardado) {
      setHistorial(JSON.parse(guardado));
    }
  }, []);

  const totalVentasPorMetodo = (metodo) =>
    mockVentas
      .filter((v) => v.metodo === metodo)
      .reduce((sum, v) => sum + v.total, 0);

  const totalGastos = mockGastos.reduce((sum, g) => sum + g.monto, 0);

  const abrirCaja = () => {
    if (montoApertura === '') return alert('Ingrese un monto inicial');
    setCajaAbierta(true);
    setInicio(new Date());
    setCerrada(false);
  };

  const cerrarCaja = () => {
    const finCaja = new Date();
    setFin(finCaja);

    const esperadoEfectivo =
      parseFloat(montoApertura || 0) + totalVentasPorMetodo('efectivo') - totalGastos;
    const esperadoTarjeta = totalVentasPorMetodo('tarjeta');
    const esperadoTransferencia = totalVentasPorMetodo('transferencia');

    const diferenciaEfectivo = parseFloat(efectivoContado || 0) - esperadoEfectivo;
    const diferenciaTarjeta = parseFloat(tarjetaContado || 0) - esperadoTarjeta;
    const diferenciaTransferencia =
      parseFloat(transferenciaContado || 0) - esperadoTransferencia;

    const nuevoArqueo = {
      fecha: inicio.toLocaleDateString(),
      horaInicio: inicio.toLocaleTimeString(),
      horaFin: finCaja.toLocaleTimeString(),
      apertura: parseFloat(montoApertura),
      ingresos: {
        efectivo: totalVentasPorMetodo('efectivo'),
        tarjeta: totalVentasPorMetodo('tarjeta'),
        transferencia: totalVentasPorMetodo('transferencia'),
      },
      egresos: totalGastos,
      contado: {
        efectivo: parseFloat(efectivoContado || 0),
        tarjeta: parseFloat(tarjetaContado || 0),
        transferencia: parseFloat(transferenciaContado || 0),
      },
      diferencia: {
        efectivo: diferenciaEfectivo,
        tarjeta: diferenciaTarjeta,
        transferencia: diferenciaTransferencia,
      },
    };

    const nuevoHistorial = [nuevoArqueo, ...historial];
    setHistorial(nuevoHistorial);
    localStorage.setItem('historialArqueos', JSON.stringify(nuevoHistorial));
    setCerrada(true);
  };

  const reiniciarCaja = () => {
    setMontoApertura('');
    setCajaAbierta(false);
    setCerrada(false);
    setInicio(null);
    setFin(null);
    setEfectivoContado('');
    setTarjetaContado('');
    setTransferenciaContado('');
  };

  return (
    <div className="arqueo-container">
      <h1>Arqueo de Caja</h1>

      {!cajaAbierta ? (
        <div className="apertura">
          <h2>Apertura</h2>
          <input
            type="number"
            placeholder="Monto inicial en caja"
            value={montoApertura}
            onChange={(e) => setMontoApertura(e.target.value)}
          />
          <button onClick={abrirCaja}>Abrir Caja</button>
        </div>
      ) : (
        <>
          {!cerrada && (
            <>
              <h2>Totales del sistema</h2>
              <p>Ventas en efectivo: ${totalVentasPorMetodo('efectivo')}</p>
              <p>Ventas con tarjeta: ${totalVentasPorMetodo('tarjeta')}</p>
              <p>Ventas por transferencia: ${totalVentasPorMetodo('transferencia')}</p>
              <p>Gastos: -${totalGastos}</p>

              <h2>Contado al cerrar</h2>
              <input
                type="number"
                placeholder="Efectivo contado"
                value={efectivoContado}
                onChange={(e) => setEfectivoContado(e.target.value)}
              />
              <input
                type="number"
                placeholder="Tarjeta contado"
                value={tarjetaContado}
                onChange={(e) => setTarjetaContado(e.target.value)}
              />
              <input
                type="number"
                placeholder="Transferencia contado"
                value={transferenciaContado}
                onChange={(e) => setTransferenciaContado(e.target.value)}
              />
              <button onClick={cerrarCaja}>Cerrar Caja</button>
            </>
          )}

          {cerrada && (
            <div className="resultado-final">
              <h2>Resultado</h2>
              <p><strong>Inicio:</strong> {inicio.toLocaleTimeString()} | <strong>Fin:</strong> {fin.toLocaleTimeString()}</p>
              <p>Efectivo contado: ${efectivoContado}</p>
              <p>Tarjeta contado: ${tarjetaContado}</p>
              <p>Transferencia contado: ${transferenciaContado}</p>
              <p>
                <strong>Diferencia en efectivo:</strong>{' '}
                <span style={{ color: Math.abs(historial[0].diferencia.efectivo) < 0.01 ? 'green' : 'red' }}>
                  ${historial[0].diferencia.efectivo.toFixed(2)}
                </span>
              </p>
              <p><strong>Diferencia tarjeta:</strong> ${historial[0].diferencia.tarjeta.toFixed(2)}</p>
              <p><strong>Diferencia transferencia:</strong> ${historial[0].diferencia.transferencia.toFixed(2)}</p>
              <button onClick={reiniciarCaja}>Abrir Nueva Caja</button>
            </div>
          )}
        </>
      )}

      <hr />
      <h2>Historial</h2>
      {historial.length === 0 ? (
        <p>No hay arqueos registrados.</p>
      ) : (
        historial.map((a, i) => (
          <div key={i} className="registro">
            <p><strong>{a.fecha}</strong> | {a.horaInicio} - {a.horaFin}</p>
            <p>🟢 Efectivo: ${a.contado.efectivo} (Δ ${a.diferencia.efectivo.toFixed(2)})</p>
            <p>💳 Tarjeta: ${a.contado.tarjeta} (Δ ${a.diferencia.tarjeta.toFixed(2)})</p>
            <p>🔁 Transferencia: ${a.contado.transferencia} (Δ ${a.diferencia.transferencia.toFixed(2)})</p>
            <p>🔴 Gastos: ${a.egresos}</p>
            <hr />
          </div>
        ))
      )}
    </div>
  );
};

export default Arqueo;
