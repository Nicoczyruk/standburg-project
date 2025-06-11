import React, { useState, useEffect, useCallback } from 'react';
import styles from './Arqueo.module.css';
import { FaSyncAlt } from 'react-icons/fa';

const DetalleLinea = ({ label, valor }) => (
    <div className={styles.detalleLinea}>
        <span className={styles.detalleLabel}>{label}:</span>
        <span className={styles.detalleValor}>${(parseFloat(valor) || 0).toFixed(2)}</span>
    </div>
);


const formatearFechaLocal = (fechaString) => {
    if (!fechaString) {
        return 'N/A';
    }
    const fecha = new Date(fechaString);
    // Verificamos si la fecha es válida para evitar errores que rompan el renderizado
    if (isNaN(fecha.getTime())) {
        return 'Fecha inválida';
    }
    // Usamos toLocaleString pero forzando el formato de 24 horas (hour12: false)
    return fecha.toLocaleString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
};

const Arqueo = () => {
    const [arqueoActivo, setArqueoActivo] = useState(null);
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [montoApertura, setMontoApertura] = useState('');
    const [montoCierreEfectivo, setMontoCierreEfectivo] = useState('');
    const [notasCierre, setNotasCierre] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchArqueoData = useCallback(async () => {
        setLoading(true);
        try {
            const [resActivo, resHistorial] = await Promise.all([
                fetch(`/api/arqueo/activo`, { cache: 'no-cache' }),
                fetch(`/api/arqueo/historial`, { cache: 'no-cache' })
            ]);
            if (!resActivo.ok || !resHistorial.ok) {
                throw new Error('Error al cargar los datos del arqueo.');
            }
            const activoData = await resActivo.json();
            const historialData = await resHistorial.json();
            setArqueoActivo(activoData);
            setHistorial(historialData || []);
            setError('');
        } catch (err) {
            setError(err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchArqueoData();
    }, [fetchArqueoData]);

    const handleAbrirCaja = async (e) => {
        e.preventDefault();
        if (!montoApertura || isNaN(parseFloat(montoApertura))) {
            setError('Por favor, ingresa un monto inicial válido.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            const response = await fetch('/api/arqueo/abrir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monto_inicial: parseFloat(montoApertura) }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Error al abrir la caja.');
            setMontoApertura('');
            await fetchArqueoData();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCerrarCaja = async (e) => {
        e.preventDefault();
        if (montoCierreEfectivo === '' || isNaN(parseFloat(montoCierreEfectivo))) {
            setError('Por favor, ingresa el monto de cierre en efectivo.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            const response = await fetch('/api/arqueo/cerrar', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    monto_cierre_efectivo_real: parseFloat(montoCierreEfectivo),
                    notas: notasCierre // Se mantiene como 'notas' según tu código original
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Error al cerrar la caja.');
            setMontoCierreEfectivo('');
            setNotasCierre('');
            await fetchArqueoData();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderAperturaCaja = () => (
        <div className={styles['seccion-formulario']}>
            <h2>Apertura de Caja</h2>
            <form onSubmit={handleAbrirCaja}>
                <div className={styles['input-group']}>
                    <label htmlFor="montoApertura">Monto inicial en caja:</label>
                    <input id="montoApertura" type="number" placeholder="Monto inicial" value={montoApertura} onChange={(e) => setMontoApertura(e.target.value)} disabled={isSubmitting} required />
                </div>
                <button type="submit" disabled={isSubmitting} className={styles['boton-accion']}>
                    {isSubmitting ? 'Abriendo...' : 'Abrir Caja'}
                </button>
            </form>
        </div>
    );

    const renderArqueoActivo = () => {
        if (!arqueoActivo || !arqueoActivo.calculos) return null;

        const { monto_inicial, calculos } = arqueoActivo;
        const { 
            ventas_efectivo_calculado, 
            ventas_tarjeta_calculado, 
            ventas_transferencia_calculado,
            gastos_calculado,
            movimientos_ingreso_calculado,
            movimientos_egreso_calculado
        } = calculos;

        const totalEfectivoSistema = 
            parseFloat(monto_inicial || 0) + 
            parseFloat(ventas_efectivo_calculado || 0) +
            parseFloat(movimientos_ingreso_calculado || 0) -
            parseFloat(movimientos_egreso_calculado || 0) -
            parseFloat(gastos_calculado || 0);

        return (
            <div className={styles.arqueoActivoContenedor}>
                <div className={styles.arqueoHeader}>
                    <h2>Arqueo de Caja Activo</h2>
                    <button onClick={fetchArqueoData} className={styles.botonRefrescar} disabled={loading}>
                        <FaSyncAlt />
                    </button>
                </div>
                <div className={styles.resumenActivo}>
                    <DetalleLinea label="Monto Inicial" valor={monto_inicial} />
                    <hr />
                    <DetalleLinea label="(+) Ventas en Efectivo" valor={ventas_efectivo_calculado} />
                    <DetalleLinea label="(+) Ingresos Manuales" valor={movimientos_ingreso_calculado} />
                    <DetalleLinea label="(-) Egresos Manuales" valor={movimientos_egreso_calculado} />
                    <DetalleLinea label="(-) Gastos Pagados" valor={gastos_calculado} />
                    <hr />
                    <DetalleLinea label="(=) Total Efectivo en Caja (Sistema)" valor={totalEfectivoSistema} />
                    <hr />
                    <DetalleLinea label="Total Ventas con Tarjeta" valor={ventas_tarjeta_calculado} />
                    <DetalleLinea label="Total Ventas por Transferencia" valor={ventas_transferencia_calculado} />
                </div>
                <form onSubmit={handleCerrarCaja} className={styles['seccion-formulario']}>
                    <h3>Cierre de Caja</h3>
                    <div className={styles['input-group']}>
                        <label htmlFor="montoCierreEfectivo">Monto final en efectivo (conteo real):</label>
                        <input id="montoCierreEfectivo" type="number" placeholder="Monto final contado" value={montoCierreEfectivo} onChange={(e) => setMontoCierreEfectivo(e.target.value)} disabled={isSubmitting} required />
                    </div>
                    <div className={styles['input-group']}>
                        <label htmlFor="notasCierre">Notas de cierre (opcional):</label>
                        <textarea id="notasCierre" placeholder="Anotaciones relevantes..." value={notasCierre} onChange={(e) => setNotasCierre(e.target.value)} disabled={isSubmitting} />
                    </div>
                    <button type="submit" disabled={isSubmitting} className={`${styles['boton-accion']} ${styles.botonCerrar}`}>
                        {isSubmitting ? 'Cerrando...' : 'Cerrar Caja y Generar Resumen'}
                    </button>
                </form>
            </div>
        );
    };

    const renderHistorial = () => {
        if (!historial || historial.length === 0) {
            return (
                <div className={styles['seccion-historial-contenedor']}>
                    <h2>Historial de Arqueos Cerrados</h2>
                    <p>No hay arqueos cerrados para mostrar.</p>
                </div>
            )
        }
        return (
            <div className={styles['seccion-historial-contenedor']}>
                <h2>Historial de Arqueos Cerrados</h2>
                {historial.map(arqueo => (
                    <div key={arqueo.arqueo_id} className={styles['registro-arqueo-card']}>
                        <div className={styles['registro-header']}>
                            <span className={styles['registro-id']}>ID Arqueo: {arqueo.arqueo_id}</span>
                            <div className={styles['registro-fechas']}>
                                <span>Apertura: {formatearFechaLocal(arqueo.fecha_hora_apertura)}</span>
                                <span>Cierre: {formatearFechaLocal(arqueo.fecha_hora_cierre)}</span>
                            </div>
                        </div>
                        <div className={styles['registro-body']}>
                            <div className={styles['registro-linea']}><span className={styles['registro-label']}>Monto Inicial:</span><span className={styles['registro-valor']}>${parseFloat(arqueo.monto_inicial || 0).toFixed(2)}</span></div>
                            <hr />
                            <div className={styles['registro-linea']}><span className={styles['registro-label']}>Total Efectivo (Sistema):</span><span className={styles['registro-valor']}>${parseFloat(arqueo.monto_final_esperado_efectivo || 0).toFixed(2)}</span></div>
                            <div className={styles['registro-linea']}><span className={styles['registro-label']}>Total Efectivo (Real):</span><span className={styles['registro-valor']}>${parseFloat(arqueo.monto_cierre_efectivo_real || 0).toFixed(2)}</span></div>
                            <div className={styles['registro-linea']}>
                                <span className={styles['registro-label']}>Diferencia Efectivo:</span>
                                <span className={`${styles['registro-valor']} ${parseFloat(arqueo.diferencia_efectivo) >= 0 ? styles['valor-positivo'] : styles['valor-negativo']}`}>
                                    ${parseFloat(arqueo.diferencia_efectivo || 0).toFixed(2)}
                                </span>
                            </div>
                            <hr />
                            <div className={styles['registro-linea']}><span className={styles['registro-label']}>Ventas con Tarjeta:</span><span className={styles['registro-valor']}>${parseFloat(arqueo.ventas_tarjeta_calculado || 0).toFixed(2)}</span></div>
                            <div className={styles['registro-linea']}><span className={styles['registro-label']}>Ventas por Transferencia:</span><span className={styles['registro-valor']}>${parseFloat(arqueo.ventas_transferencia_calculado || 0).toFixed(2)}</span></div>
                            <div className={styles['registro-linea']}><span className={styles['registro-label']}>Total Gastos:</span><span className={styles['registro-valor']}>${parseFloat(arqueo.gastos_calculado || 0).toFixed(2)}</span></div>
                            {arqueo.notas_cierre && (
                                <div className={styles['registro-notas']}>
                                    <span className={styles['registro-label']}>Notas:</span>
                                    <span className={styles['registro-valor']}>{arqueo.notas_cierre}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    if (loading) {
        return <div className={styles.contenedor}>Cargando...</div>;
    }

    return (
        <div className={styles.contenedor}>
            <h1>Gestión de Arqueo de Caja</h1>
            {error && <p className={styles.errorMensaje}>{error}</p>}
            {arqueoActivo ? renderArqueoActivo() : renderAperturaCaja()}
            <hr className={styles.separador} />
            {renderHistorial()}
        </div>
    );
};

export default Arqueo;