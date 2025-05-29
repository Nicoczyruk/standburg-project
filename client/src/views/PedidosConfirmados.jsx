// client/src/views/PedidosConfirmados.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import styles from './PedidosConfirmados.module.css'; // Correcta importación de CSS Module

const ESTADO_EN_PREPARACION = 'en preparacion';
const ESTADO_ENTREGADO = 'entregado';

// ESTADOS_COLORES_CLASES ahora directamente usa los nombres de tu CSS para los badges de estado
const ESTADOS_COLORES_CLASES = {
  'pendiente': styles['estado-PENDIENTE'],
  'en preparacion': styles['estado-en-preparacion'],
  'listo': styles['estado-listo'],
  'entregado': styles['estado-entregado'],
  'pagado': styles['estado-pagado'],
  'cancelado': styles['estado-cancelado'],
  'a confirmar': styles['estado-A-CONFIRMAR'],
  'default': styles['estado-desconocido']
};

const PedidosConfirmados = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [filtroActual, setFiltroActual] = useState(ESTADO_EN_PREPARACION);

  const fetchPedidosYDetalles = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPedidos([]);
    try {
      const apiUrl = `/api/pedidos-gestion?estado=${encodeURIComponent(filtroActual)}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Error ${response.status}: ${errorData.message || 'No se pudo obtener los pedidos'}`);
      }
      const data = await response.json();
      const groupedPedidos = data.reduce((acc, item) => {
        const pedidoId = item.pedido_id;
        if (!acc[pedidoId]) {
          acc[pedidoId] = {
            pedido_id: pedidoId,
            id_mesa: item.mesa_id,
            numero_mesa: item.numero_mesa,
            fecha: item.fecha,
            estado: item.estado_pedido,
            cliente_nombre: item.cliente_nombre,
            productos: [],
            total_pedido: parseFloat(item.total_pedido) || 0,
          };
        }
        acc[pedidoId].productos.push({
          producto_id: item.id_producto,
          nombre_producto: item.nombre_producto,
          cantidad: item.cantidad,
          precio_unitario: parseFloat(item.precio_unitario) || 0,
          subtotal: parseFloat(item.subtotal) || 0,
        });
        return acc;
      }, {});
      setPedidos(Object.values(groupedPedidos));
    } catch (err) {
      console.error(`Error al obtener o procesar pedidos para gestión (${filtroActual}):`, err);
      setError(err.message);
      toast.error(`Error al cargar pedidos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [filtroActual]);

  useEffect(() => {
    fetchPedidosYDetalles();
  }, [fetchPedidosYDetalles]);

  const cambiarEstadoPedido = async (pedidoId, nuevoEstado) => {
    setUpdatingId(pedidoId);
    try {
      const response = await fetch(`/api/pedidos/${pedidoId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Error al cambiar estado a ${nuevoEstado}` }));
        throw new Error(errorData.message || `No se pudo actualizar el estado del pedido ${pedidoId}`);
      }
      toast.success(`Pedido #${pedidoId} actualizado a ${nuevoEstado}`);
      fetchPedidosYDetalles();
    } catch (err) {
      console.error("Error al cambiar estado del pedido:", err);
      toast.error(`Error al actualizar pedido #${pedidoId}: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleFiltroChange = (nuevoFiltro) => {
    setFiltroActual(nuevoFiltro);
  };

  // Se usan las clases del CSS module para mensajes
  if (loading) return <div className={styles['loading-message']}>Cargando pedidos...</div>;
  if (error && pedidos.length === 0) return <div className={styles['error-message']}>Error al cargar pedidos: {error}</div>;

  return (
    // Contenedor principal
    <div className={styles['pedidos-confirmados-container']}>
      {/* Título - El CSS lo estiliza por etiqueta h1 dentro del contenedor */}
      <h1>Gestión de Pedidos</h1>
      
      {/* Contenedor de filtros - Clase corregida */}
      <div className={styles['filtros-pedidos']}>
        <button 
            onClick={() => handleFiltroChange(ESTADO_EN_PREPARACION)} 
            // Clases corregidas para botón de filtro y estado activo
            className={`${styles['boton-filtro']} ${filtroActual === ESTADO_EN_PREPARACION ? styles.activo : ''}`}
        >
            En Preparación
        </button>
        <button 
            onClick={() => handleFiltroChange(ESTADO_ENTREGADO)} 
            className={`${styles['boton-filtro']} ${filtroActual === ESTADO_ENTREGADO ? styles.activo : ''}`}
        >
            Entregados
        </button>
      </div>

      {/* Lista de pedidos (grid) - Clase corregida */}
      <div className={styles['lista-pedidos']}>
        {pedidos.length === 0 && !loading && (
          // Mensaje "no hay pedidos" - Clase corregida
          <p className={styles['no-pedidos-mensaje']}>No hay pedidos en estado "{filtroActual}".</p>
        )}
        {pedidos.map(pedido => (
          // Tarjeta de pedido - Clase base correcta
          <div 
            key={pedido.pedido_id} 
            className={styles['pedido-card']} // Ya no se aplica el color de estado aquí
          >
            {/* Título de la tarjeta (h2 o h3) - Usamos h2 como en el CSS, o ajusta el CSS a h3 si prefieres */}
            {/* El CSS tiene estilos para '.pedido-card h2' */}
            <h2>Pedido #{pedido.pedido_id} - Mesa: {pedido.numero_mesa || pedido.id_mesa || 'N/A'}</h2>
            
            {/* Contenedor para información del pedido para aplicar estilos flex */}
            <div className={styles['info-pedido']}>
              {pedido.cliente_nombre && <p><strong>Cliente:</strong> {pedido.cliente_nombre}</p>}
              <p><strong>Fecha:</strong> {new Date(pedido.fecha).toLocaleString()}</p>
              <p>
                <strong>Estado:</strong>
                {/* El span recibe la clase base 'estado-pedido' y la clase de color específica */}
                <span className={`${styles['estado-pedido']} ${ESTADOS_COLORES_CLASES[pedido.estado?.toLowerCase()] || ESTADOS_COLORES_CLASES.default}`}>
                    {pedido.estado?.toUpperCase()}
                </span>
              </p>
            </div>
            
            {/* Título de productos - Clase correcta */}
            <h4 className={styles['titulo-productos']}>Productos:</h4>
            {/* Lista de productos UL - Clase correcta */}
            <ul className={styles['lista-productos-pedido']}>
              {pedido.productos && pedido.productos.length > 0 ? (
                pedido.productos.map((producto, index) => (
                  // El CSS estiliza 'li' directamente dentro de '.lista-productos-pedido li'
                  <li key={`${pedido.pedido_id}-${producto.producto_id}-${index}`}>
                    {producto.nombre_producto || 'Producto desconocido'} - Cant: {producto.cantidad} - Precio: ${producto.precio_unitario?.toFixed(2)}
                  </li>
                ))
              ) : (
                <li>No hay detalles de productos para este pedido.</li>
              )}
            </ul>
            {/* Total del Pedido - Estilizado por 'p' general dentro de 'pedido-card' o 'info-pedido' */}
            <p><strong>Total del Pedido:</strong> ${pedido.total_pedido?.toFixed(2)}</p>

            {/* Acciones del pedido - Clase correcta */}
            <div className={styles['acciones-pedido']}>
              {pedido.estado && pedido.estado.toLowerCase() === ESTADO_EN_PREPARACION && (
                <button
                  onClick={() => cambiarEstadoPedido(pedido.pedido_id, ESTADO_ENTREGADO)}
                  // Clases correctas para botón de acción y tipo de botón
                  className={`${styles['boton-accion-card']} ${styles['boton-entregado']}`}
                  disabled={updatingId === pedido.pedido_id}
                >
                  {updatingId === pedido.pedido_id ? 'Actualizando...' : 'Marcar como Entregado'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PedidosConfirmados;