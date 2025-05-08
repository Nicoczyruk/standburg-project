import React, { useState, useEffect } from 'react';
// import './pedidosConfirmados.css'; // Descomenta si tienes estilos

// Estados a mostrar en esta vista (PENDIENTE, en preparacion, listo)
const ESTADOS_VISIBLES = ['PENDIENTE', 'en preparacion', 'listo'];

const PedidosConfirmados = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Función para cargar los pedidos desde la API
  const fetchPedidos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/pedidos');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`Error ${response.status}: ${errData.message || response.statusText}`);
      }
      const data = await response.json();
      // Filtramos en el cliente por los estados definidos
      const pedidosFiltrados = (data || []).filter(p => ESTADOS_VISIBLES.includes(p.estado));
      setPedidos(pedidosFiltrados);
    } catch (err) {
      console.error("Error al obtener pedidos:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cargar pedidos al montar
  useEffect(() => {
    fetchPedidos();
  }, []);

  // Función para marcar un pedido como entregado (PUT /api/pedidos/:id/estado)
  const marcarEntregado = async (pedidoId) => {
    setUpdatingId(pedidoId);
    setError(null);
    try {
      const response = await fetch(`/api/pedidos/${pedidoId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'entregado' }) // Siempre envía 'entregado'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error ${response.status}: ${errorData.message || 'No se pudo actualizar el estado'}`);
      }

      // Éxito: Recargar la lista para quitar el pedido entregado
      await fetchPedidos();

    } catch (err) {
      console.error(`Error al marcar como entregado el pedido ${pedidoId}:`, err);
      setError(`Error al actualizar pedido #${pedidoId}: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // --- Renderizado ---

  if (loading) {
    return <div className="pedidos-confirmados"><h1>Pedidos Pendientes/Listos</h1><p>Cargando pedidos...</p></div>;
  }

  // Muestra error si la carga inicial falló y no hay datos
  if (error && !pedidos.length) {
    return <div className="pedidos-confirmados"><h1>Pedidos Pendientes/Listos</h1><p style={{ color: 'red' }}>{error}</p></div>;
  }

  return (
    <div className="pedidos-confirmados">
      <h1>Pedidos Pendientes/Listos</h1>
      {/* Muestra errores de actualización si ocurren */}
      {error && <p style={{ color: 'orange', fontWeight: 'bold' }}>{error}</p>}

      {pedidos.length === 0 ? (
        <p>No hay pedidos pendientes, en preparación o listos.</p>
      ) : (
        pedidos.map(p => (
          <div key={p.pedido_id} style={{ border: '1px solid #ccc', padding: 12, marginBottom: 12, backgroundColor: updatingId === p.pedido_id ? '#f0f0f0' : 'white' }}>
            <h2>Pedido #{p.pedido_id}</h2>
            <p><strong>Cliente:</strong> {p.cliente_nombre || 'Mostrador/Mesa'}</p>
            <p><strong>Teléfono:</strong> {p.cliente_telefono || 'N/A'}</p>
            <p><strong>Dirección:</strong> {p.cliente_direccion || 'N/A'}</p>
            <p><strong>Tipo:</strong> {p.tipo || 'N/A'}</p>
            <p><strong>Mesa:</strong> {p.numero_mesa || 'N/A'}</p>
            <p><strong>Total:</strong> ${typeof p.total === 'number' ? p.total.toFixed(2) : 'N/A'}</p>
            <p><strong>Estado Actual:</strong> <span style={{ fontWeight: 'bold' }}>{p.estado ? p.estado.toUpperCase() : 'N/A'}</span></p> {/* Manejo por si estado es null */}

            {/* Botón ÚNICO para marcar como entregado */}
            <button
              onClick={() => marcarEntregado(p.pedido_id)}
              disabled={updatingId === p.pedido_id} // Deshabilitar si se está actualizando este pedido
              style={{ marginTop: '10px' }}
            >
              {updatingId === p.pedido_id ? 'Marcando...' : 'Marcar como Entregado'}
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default PedidosConfirmados;