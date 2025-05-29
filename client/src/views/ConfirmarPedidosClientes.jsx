import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import styles from './ConfirmarPedidosClientes.module.css'; // Importa el CSS Module

const ConfirmarPedidosClientes = () => {
  const [pedidosPorConfirmar, setPedidosPorConfirmar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchPedidosAConfirmar = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/pedidos?estado=A CONFIRMAR');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`Error ${response.status}: ${errData.message || 'No se pudieron cargar los pedidos por confirmar'}`);
      }
      let pedidosData = await response.json();

      if (!pedidosData || pedidosData.length === 0) {
        setPedidosPorConfirmar([]);
        setLoading(false);
        return;
      }

      // Para cada pedido, obtener su información completa que incluye los detalles
      const pedidosConDetallesCompletos = await Promise.all(
        pedidosData.map(async (pedidoDeLista) => {
          try {
            // CORRECCIÓN: Llamar a la ruta que devuelve el pedido completo con sus detalles
            const responsePedidoCompleto = await fetch(`/api/pedidos/${pedidoDeLista.pedido_id}`);
            if (!responsePedidoCompleto.ok) {
              console.error(`Error al cargar pedido completo para ID ${pedidoDeLista.pedido_id}: ${responsePedidoCompleto.status}`);
              // Devolver el objeto original de la lista con detalles vacíos como fallback
              return { ...pedidoDeLista, detalles: [] }; 
            }
            const pedidoCompleto = await responsePedidoCompleto.json();
            // pedidoCompleto ahora ES el objeto del pedido que contiene la propiedad 'detalles' (ej. pedidoCompleto.detalles)
            // y también el resto de la información del pedido.
            return pedidoCompleto; 
          } catch (err) {
            console.error(`Excepción al cargar pedido completo para ID ${pedidoDeLista.pedido_id}:`, err);
            return { ...pedidoDeLista, detalles: [] }; // Fallback
          }
        })
      );
      setPedidosPorConfirmar(pedidosConDetallesCompletos);
    } catch (err) {
      console.error("Error en fetchPedidosAConfirmar:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidosAConfirmar();
  }, []);

  const confirmarEstePedido = async (pedidoId) => {
    setUpdatingId(pedidoId);
    setError(null);
    try {
      const response = await fetch(`/api/pedidos/${pedidoId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'en preparacion' }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`Error ${response.status}: ${errData.message || 'No se pudo confirmar el pedido'}`);
      }
      toast.success(`Pedido ${pedidoId} confirmado y pasado a EN PREPARACION.`);
      setPedidosPorConfirmar(prevPedidos => prevPedidos.filter(p => p.pedido_id !== pedidoId));
    } catch (err) {
      console.error("Error al confirmar pedido:", err);
      toast.error(`Error al confirmar pedido ${pedidoId}: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <div className={styles['confirmar-pedidos-container']}><p className={styles['loading-message']}>Cargando pedidos por confirmar...</p></div>;
  if (error && pedidosPorConfirmar.length === 0 && !loading) return <div className={styles['confirmar-pedidos-container']}><p className={styles['error-message']}>Error al cargar pedidos: {error}</p></div>;

  return (
    <div className={styles['confirmar-pedidos-container']}>
      <h1>Confirmar Pedidos de Clientes</h1>
      
      {pedidosPorConfirmar.length === 0 && !loading && !error && (
        <p className={styles['no-pedidos-mensaje']}>No hay pedidos pendientes de confirmación.</p>
      )}

      <div className={styles['lista-pedidos-confirmar']}>
        {pedidosPorConfirmar.map(pedido => (
          // El objeto 'pedido' aquí ya debería tener la propiedad 'detalles' poblada
          <div key={pedido.pedido_id} className={styles['pedido-card-confirmar']}>
            <h2>Pedido ID: {pedido.pedido_id}</h2>
            <div className={styles['info-pedido']}>
              <p><strong>Cliente:</strong> {pedido.cliente_nombre || 'N/A'}</p>
              <p><strong>Teléfono:</strong> {pedido.cliente_telefono || 'N/A'}</p>
              <p><strong>Dirección:</strong> {pedido.cliente_direccion || 'N/A (Mostrador o datos no provistos)'}</p>
              <p><strong>Tipo:</strong> {pedido.tipo_pedido || pedido.tipo || 'N/A'}</p>
              <p><strong>Notas:</strong> {pedido.notas || 'Sin notas'}</p>
              <p><strong>Total Estimado:</strong> ${pedido.total_pedido ? parseFloat(pedido.total_pedido).toFixed(2) : (pedido.total ? parseFloat(pedido.total).toFixed(2) : '0.00')}</p>
            </div>
            
            <h4 className={styles['titulo-productos']}>Productos:</h4>
            {/* La propiedad 'detalles' ahora viene del objeto 'pedido' que fue completamente recargado */}
            {pedido.detalles && pedido.detalles.length > 0 ? (
              <ul className={styles['lista-productos-pedido']}>
                {pedido.detalles.map(detalle => (
                  <li key={detalle.detalle_id || detalle.producto_id}>
                    {detalle.cantidad} x {detalle.nombre_producto || detalle.nombre || detalle.producto_nombre}
                    (@ ${detalle.precio_unitario ? parseFloat(detalle.precio_unitario).toFixed(2) : (detalle.precio ? parseFloat(detalle.precio).toFixed(2) : '0.00')})
                    {detalle.notas_producto && <span className={styles['nota-producto']}> ({detalle.notas_producto})</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles['no-detalles-mensaje']}>No hay detalles de productos para este pedido o no se pudieron cargar.</p>
            )}
            
            <button 
              onClick={() => confirmarEstePedido(pedido.pedido_id)}
              disabled={updatingId === pedido.pedido_id}
              className={styles['boton-confirmar']}
            >
              {updatingId === pedido.pedido_id ? 'Confirmando...' : 'Confirmar pedido'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConfirmarPedidosClientes;