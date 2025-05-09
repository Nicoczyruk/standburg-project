import React, { useState, useEffect } from 'react';
import './confirmarPedidosClientes.css'; // Asegúrate que este CSS exista

const ConfirmarPedidosClientes = () => {
  const [pedidosPorConfirmar, setPedidosPorConfirmar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null); // ID del pedido que se está actualizando

  // Función para cargar los pedidos "A CONFIRMAR" y sus detalles
  const fetchPedidosAConfirmar = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Obtener todos los pedidos
      const response = await fetch('/api/pedidos?estado=A CONFIRMAR'); // Filtrar por estado 'A CONFIRMAR'
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

      // 2. Para cada pedido "A CONFIRMAR", obtener sus detalles (productos)
      // ESTO PUEDE SER INEFICIENTE SI HAY MUCHOS PEDIDOS. Considera optimizar el backend después.
      const pedidosConDetalles = await Promise.all(
        pedidosData.map(async (pedido) => {
          try {
            const detalleResponse = await fetch(`/api/pedidos/${pedido.pedido_id}`);
            if (!detalleResponse.ok) {
              console.warn(`No se pudieron cargar detalles para pedido #${pedido.pedido_id}`);
              return { ...pedido, detalles: [] }; // Devolver pedido sin detalles en caso de error
            }
            const pedidoCompleto = await detalleResponse.json();
            return pedidoCompleto; // pedidoCompleto ya debería tener la propiedad 'detalles'
          } catch (detalleError) {
            console.warn(`Error cargando detalles para pedido #${pedido.pedido_id}:`, detalleError);
            return { ...pedido, detalles: [] }; // Fallback
          }
        })
      );
      setPedidosPorConfirmar(pedidosConDetalles.filter(p => p && p.estado === 'A CONFIRMAR')); // Doble chequeo de estado
    } catch (err) {
      console.error("Error al obtener pedidos por confirmar:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar pedidos al montar el componente
  useEffect(() => {
    fetchPedidosAConfirmar();
  }, []);

  // Función para confirmar un pedido (cambiar estado a 'PENDIENTE' o 'en preparacion')
  const confirmarEstePedido = async (pedidoId) => {
    setUpdatingId(pedidoId);
    setError(null);
    const nuevoEstado = 'PENDIENTE'; // O 'en preparacion' según tu flujo

    try {
      const response = await fetch(`/api/pedidos/${pedidoId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error ${response.status}: ${errorData.message || `No se pudo confirmar el pedido #${pedidoId}`}`);
      }
      
      // Éxito: Recargar la lista para que el pedido confirmado desaparezca
      await fetchPedidosAConfirmar();
      alert(`Pedido #${pedidoId} confirmado y pasado a estado ${nuevoEstado}.`);

    } catch (err) {
      console.error(`Error al confirmar el pedido ${pedidoId}:`, err);
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // --- Renderizado ---
  if (loading) {
    return (
      <div className="confirmar-pedidos-container">
        <h1>Pedidos Pendientes de Confirmación</h1>
        <p>Cargando pedidos...</p>
      </div>
    );
  }

  // Error general al cargar la lista inicial
  if (error && pedidosPorConfirmar.length === 0) {
    return (
      <div className="confirmar-pedidos-container">
        <h1>Pedidos Pendientes de Confirmación</h1>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="confirmar-pedidos-container">
      <h1>Pedidos Pendientes de Confirmación</h1>
      {/* Mostrar error de actualización si ocurrió */}
      {error && <p style={{ color: 'orange', fontWeight: 'bold' }}>{error}</p>}

      {pedidosPorConfirmar.length === 0 ? (
        <p>No hay pedidos de clientes para confirmar en este momento.</p>
      ) : (
        pedidosPorConfirmar.map((pedido) => (
          <div key={pedido.pedido_id} className="pedido-card" style={{ opacity: updatingId === pedido.pedido_id ? 0.5 : 1 }}>
            <h2>Pedido Cliente: #{pedido.pedido_id}</h2>
            <p><strong>Cliente:</strong> {pedido.cliente_nombre || 'N/A'}</p>
            <p><strong>Teléfono:</strong> {pedido.cliente_telefono || 'N/A'}</p>
            <p><strong>Dirección:</strong> {pedido.cliente_direccion || 'N/A (Mostrador o datos no provistos)'}</p>
            <p><strong>Tipo:</strong> {pedido.tipo || 'N/A'}</p>
            <p><strong>Notas:</strong> {pedido.notas || 'Sin notas'}</p>
            <p><strong>Total Estimado:</strong> ${pedido.total ? pedido.total.toFixed(2) : 'N/A'}</p>
            
            <h4>Productos:</h4>
            {pedido.detalles && pedido.detalles.length > 0 ? (
              <ul>
                {pedido.detalles.map(detalle => (
                  <li key={detalle.detalle_id}>
                    {detalle.cantidad} x {detalle.producto_nombre} (@ ${detalle.precio_unitario ? detalle.precio_unitario.toFixed(2) : 'N/A'})
                  </li>
                ))}
              </ul>
            ) : (
              <p>No se pudieron cargar los detalles de productos para este pedido o no tiene.</p>
            )}
            
            <button 
              onClick={() => confirmarEstePedido(pedido.pedido_id)}
              disabled={updatingId === pedido.pedido_id}
            >
              {updatingId === pedido.pedido_id ? 'Confirmando...' : 'Confirmar Pedido'}
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default ConfirmarPedidosClientes;