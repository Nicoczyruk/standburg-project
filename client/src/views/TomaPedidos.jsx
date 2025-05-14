import React, { useState, useEffect } from 'react';
import './TomaPedidos.css'; // Asegúrate que el CSS exista y esté bien

const TomaPedidos = ({ cambiarVista }) => {
  // --- Estados ---
  const [tipoPedido, setTipoPedido] = useState('');
  const [cliente, setCliente] = useState({ nombre: '', telefono: '', direccion: '', costoEnvio: '' });
  const [carrito, setCarrito] = useState({});
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [metodoPago, setMetodoPago] = useState('efectivo'); // <-- NUEVO ESTADO para método de pago

  // --- Cargar Productos Disponibles ---
  useEffect(() => {
    const fetchProductos = async () => {
      setLoadingProductos(true);
      setError(null);
      try {
        const response = await fetch('/api/productos');
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`Error ${response.status}: ${errData.message || response.statusText}`);
        }
        const data = await response.json();
        setProductosDisponibles(data || []);
      } catch (err) {
        console.error("Error al obtener productos:", err);
        setError(`Error cargando productos: ${err.message}`);
      } finally {
        setLoadingProductos(false);
      }
    };
    fetchProductos();
  }, []);

  // --- Manejar Cambios en Datos del Cliente ---
  const handleChangeCliente = (e) => {
    const { name, value } = e.target;
    const processedValue = name === 'costoEnvio'
      ? (value === '' ? '' : parseFloat(value) || 0)
      : value;
    setCliente(prev => ({ ...prev, [name]: processedValue }));
  };

  // --- Agregar Producto al Carrito ---
  const agregarProductoAlCarrito = (producto) => {
    setCarrito(prevCarrito => {
      const existente = prevCarrito[producto.producto_id];
      if (existente) {
        return { ...prevCarrito, [producto.producto_id]: { ...existente, cantidad: existente.cantidad + 1 } };
      } else {
        return { ...prevCarrito, [producto.producto_id]: { ...producto, cantidad: 1 } };
      }
    });
  };

  // --- Cambiar Cantidad en Carrito ---
  const cambiarCantidadCarrito = (productoId, nuevaCantidad) => {
    setCarrito(prevCarrito => {
      const item = prevCarrito[productoId];
      if (!item) return prevCarrito;
      if (nuevaCantidad <= 0) {
        const { [productoId]: _, ...resto } = prevCarrito;
        return resto;
      } else {
        return { ...prevCarrito, [productoId]: { ...item, cantidad: nuevaCantidad } };
      }
    });
  };

  // --- Limpiar Estado ---
  const limpiarFormulario = () => {
    setTipoPedido('');
    setCliente({ nombre: '', telefono: '', direccion: '', costoEnvio: '' });
    setCarrito({});
    setMetodoPago('efectivo'); // Resetear método de pago
    setError(null);
    setSubmitError(null);
    setIsSubmitting(false);
  };

  // --- Confirmar y Enviar Pedido (POST /api/pedidos) ---
  const confirmarPedido = async () => {
    setSubmitError(null);
    setIsSubmitting(true);

    const itemsParaEnviar = Object.values(carrito).map(item => ({
      producto_id: item.producto_id,
      cantidad: item.cantidad,
    }));

    if (itemsParaEnviar.length === 0) {
      setSubmitError("El pedido debe contener al menos un producto.");
      setIsSubmitting(false);
      return;
    }
    if (!tipoPedido) {
         setSubmitError("Debe seleccionar un tipo de pedido.");
         setIsSubmitting(false);
         return;
    }
    if (!metodoPago) { // Validación para el nuevo campo
        setSubmitError("Debe seleccionar un método de pago.");
        setIsSubmitting(false);
        return;
    }
    const mesaIdParsed = cliente.mesa_id ? parseInt(cliente.mesa_id) : null;
    if (tipoPedido === 'mesa' && (!mesaIdParsed || mesaIdParsed <= 0) ) {
         setSubmitError("Debe seleccionar una mesa válida para pedidos de tipo 'mesa'.");
         setIsSubmitting(false);
         return;
    }
     if (tipoPedido === 'delivery' && !cliente.direccion) {
        setSubmitError("La dirección es obligatoria para pedidos de tipo 'delivery'.");
        setIsSubmitting(false);
        return;
     }

    const payload = {
      mesa_id: tipoPedido === 'mesa' ? mesaIdParsed : null,
      tipo: tipoPedido,
      cliente_nombre: cliente.nombre || null,
      cliente_telefono: cliente.telefono || null,
      cliente_direccion: cliente.direccion || null,
      notas: null,
      items: itemsParaEnviar,
      estadoInicial: 'PENDIENTE', // El backend se encargará del estado del pago
      metodo_pago: metodoPago // <-- AÑADIDO metodo_pago
    };

    console.log("Enviando payload a /api/pedidos:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Error ${response.status}: ${errorData.message || 'No se pudo crear el pedido'}`);
      }

      const pedidoCreado = await response.json();
      console.log('Pedido creado exitosamente:', pedidoCreado);
      alert(`Pedido #${pedidoCreado.pedido_id} creado exitosamente con método de pago: ${metodoPago}!`);
      limpiarFormulario();

    } catch (err) {
      console.error("Error al confirmar pedido:", err);
      setSubmitError(`Error al crear pedido: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Cálculos ---
  const carritoArray = Object.values(carrito);
  const subtotal = carritoArray.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  const costoEnvioNumerico = typeof cliente.costoEnvio === 'number' ? cliente.costoEnvio : 0;
  const total = subtotal + costoEnvioNumerico;

  // --- Renderizado ---
  if (loadingProductos) return <p>Cargando productos...</p>;
  if (error && !productosDisponibles.length) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div className="toma-pedidos-container">
      <h1>Tomar Pedido</h1>

      <select value={tipoPedido} onChange={(e) => setTipoPedido(e.target.value)} disabled={isSubmitting}>
        <option value="" disabled>-- Seleccionar Tipo --</option>
        <option value="mostrador">Mostrador</option>
        <option value="mesa">Mesa</option>
        <option value="delivery">Delivery</option>
      </select>

      {(tipoPedido === 'mostrador' || tipoPedido === 'mesa' || tipoPedido === 'delivery') && (
        <div className="form-cliente">
          <input
            type="text" name="nombre" placeholder="Nombre Cliente"
            value={cliente.nombre} onChange={handleChangeCliente} disabled={isSubmitting}
          />
          {tipoPedido === 'mesa' && (
             <input
               type="number" name="mesa_id" placeholder="ID Mesa"
               value={cliente.mesa_id || ''} onChange={handleChangeCliente} disabled={isSubmitting}
             />
          )}
          {(tipoPedido === 'mostrador' || tipoPedido === 'delivery') && (
            <input
              type="text" name="telefono" placeholder="Teléfono"
              value={cliente.telefono} onChange={handleChangeCliente} disabled={isSubmitting}
            />
          )}
          {tipoPedido === 'delivery' && (
            <>
              <input
                type="text" name="direccion" placeholder="Dirección"
                value={cliente.direccion} onChange={handleChangeCliente} disabled={isSubmitting}
              />
              <input
                type="number" name="costoEnvio" placeholder="Costo de Envío"
                step="0.01"
                value={cliente.costoEnvio} onChange={handleChangeCliente} disabled={isSubmitting}
              />
            </>
          )}
        </div>
      )}

      <h2>Productos Disponibles</h2>
      {error && !loadingProductos && <p style={{ color: 'orange' }}>Advertencia: {error}</p>}
      <div className="productos-rapidos">
        {productosDisponibles.length > 0 ? (
          productosDisponibles.map((prod) => (
            <button key={prod.producto_id} onClick={() => agregarProductoAlCarrito(prod)} disabled={isSubmitting}>
              {prod.nombre} - ${prod.precio.toFixed(2)}
            </button>
          ))
        ) : (
          <p>No hay productos disponibles.</p>
        )}
      </div>

      <h2>Pedido Actual</h2>
      {carritoArray.length === 0 ? (
        <p>Agrega productos al pedido.</p>
      ) : (
        <ul className="lista-productos-pedido">
          {carritoArray.map((item) => (
            <li key={item.producto_id} className="carrito-item-toma">
              <span>{item.nombre} (${item.precio.toFixed(2)})</span>
              <div className="controles-cantidad">
                <button type="button" onClick={() => cambiarCantidadCarrito(item.producto_id, item.cantidad - 1)} disabled={isSubmitting}>-</button>
                <span>{item.cantidad}</span>
                <button type="button" onClick={() => cambiarCantidadCarrito(item.producto_id, item.cantidad + 1)} disabled={isSubmitting}>+</button>
              </div>
              <span>Subtotal: ${(item.precio * item.cantidad).toFixed(2)}</span>
              <button type="button" className="eliminar-item" onClick={() => cambiarCantidadCarrito(item.producto_id, 0)} disabled={isSubmitting}>X</button>
            </li>
          ))}
        </ul>
      )}

      {/* Totales, Método de Pago y Confirmación */}
      <div className="totales">
        <p>Subtotal: ${subtotal.toFixed(2)}</p>
        {tipoPedido === 'delivery' && cliente.costoEnvio !== '' && <p>Envío: ${costoEnvioNumerico.toFixed(2)}</p>}
        <h3>Total: ${total.toFixed(2)}</h3>

        {/* NUEVO SELECTOR para Método de Pago */}
        <div className="metodo-pago-selector">
            <label htmlFor="metodoPago">Método de Pago: </label>
            <select
                id="metodoPago"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                disabled={isSubmitting}
            >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta_credito">Tarjeta de Crédito</option>
                <option value="tarjeta_debito">Tarjeta de Débito</option>
            </select>
        </div>

        {submitError && <p style={{ color: 'red' }}>{submitError}</p>}
        <button onClick={confirmarPedido} disabled={isSubmitting || carritoArray.length === 0 || !tipoPedido || !metodoPago}>
          {isSubmitting ? 'Confirmando...' : 'Confirmar Pedido'}
        </button>
         <button type="button" onClick={limpiarFormulario} disabled={isSubmitting} style={{ marginLeft: '10px', backgroundColor: '#555' }}>
           Limpiar
         </button>
      </div>
    </div>
  );
};

export default TomaPedidos;