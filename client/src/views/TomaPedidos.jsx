import React, { useState, useEffect } from 'react';
import './TomaPedidos.css'; // Asegúrate que el CSS exista y esté bien

const TomaPedidos = ({ cambiarVista }) => {
  // --- Estados ---
  const [tipoPedido, setTipoPedido] = useState('');
  const [cliente, setCliente] = useState({ nombre: '', telefono: '', direccion: '', costoEnvio: '' });
  const [carrito, setCarrito] = useState({}); // Objeto para manejar { producto_id: { ...producto, cantidad } }
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [error, setError] = useState(null); // Para errores generales o de carga
  const [submitError, setSubmitError] = useState(null); // Para errores de envío
  const [isSubmitting, setIsSubmitting] = useState(false);
  // TODO: Añadir estado para mesas si se implementa selección
  // const [mesasDisponibles, setMesasDisponibles] = useState([]);
  // const [mesaSeleccionadaId, setMesaSeleccionadaId] = useState(''); // O guardar en cliente.mesa_id

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

    // TODO: Cargar mesas si se necesita
    // const fetchMesas = async () => { /* ... fetch('/api/mesas') ... */ };
    // fetchMesas();

  }, []); // Ejecutar solo al montar

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
    setCliente({ nombre: '', telefono: '', direccion: '', costoEnvio: '' /*, mesa_id: '' */ });
    setCarrito({});
    setError(null);
    setSubmitError(null);
    setIsSubmitting(false);
    // setMesaSeleccionadaId('');
  };

  // --- Confirmar y Enviar Pedido (POST /api/pedidos) ---
  const confirmarPedido = async () => {
    setSubmitError(null);
    setIsSubmitting(true);

    const itemsParaEnviar = Object.values(carrito).map(item => ({
      producto_id: item.producto_id,
      cantidad: item.cantidad,
    }));

    // Validaciones (igual que antes)
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
    // Validación de mesa_id si es necesario
    const mesaIdParsed = cliente.mesa_id ? parseInt(cliente.mesa_id) : null;
    if (tipoPedido === 'mesa' && (!mesaIdParsed || mesaIdParsed <= 0) ) {
         setSubmitError("Debe seleccionar una mesa válida para pedidos de tipo 'mesa'.");
         setIsSubmitting(false);
         return;
    }
     // Validación de dirección para delivery
     if (tipoPedido === 'delivery' && !cliente.direccion) {
        setSubmitError("La dirección es obligatoria para pedidos de tipo 'delivery'.");
        setIsSubmitting(false);
        return;
     }


    // Prepara el payload para la API - SIN admin_id, CON datos del cliente
    const payload = {
      mesa_id: tipoPedido === 'mesa' ? mesaIdParsed : null,
      tipo: tipoPedido,
      // Añadir datos del cliente desde el estado 'cliente'
      cliente_nombre: cliente.nombre || null,
      cliente_telefono: cliente.telefono || null,
      cliente_direccion: cliente.direccion || null,
      // 'notas' no está en el form actual, se enviaría null o añadir input/textarea
      notas: null,
      // 'costo_envio' no se envía aquí, el backend no lo usa directamente en PEDIDOS.total por ahora
      items: itemsParaEnviar,
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
      alert(`Pedido #${pedidoCreado.pedido_id} creado exitosamente!`);
      limpiarFormulario();
      // cambiarVista('confirmarPedido');

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

      {/* Selector de Tipo de Pedido */}
      <select value={tipoPedido} onChange={(e) => setTipoPedido(e.target.value)} disabled={isSubmitting}>
        <option value="" disabled>-- Seleccionar Tipo --</option>
        <option value="mostrador">Mostrador</option>
        <option value="mesa">Mesa</option>
        <option value="delivery">Delivery</option>
      </select>

      {/* Formulario Cliente (Condicional) */}
      {(tipoPedido === 'mostrador' || tipoPedido === 'mesa' || tipoPedido === 'delivery') && (
        <div className="form-cliente">
          <input
            type="text" name="nombre" placeholder="Nombre Cliente"
            value={cliente.nombre} onChange={handleChangeCliente} disabled={isSubmitting}
          />
          {/* Ejemplo de cómo añadirías el selector de Mesa */}
          {tipoPedido === 'mesa' && (
             <input // Temporalmente un input, idealmente un <select> cargado con /api/mesas
               type="number" name="mesa_id" placeholder="ID Mesa"
               value={cliente.mesa_id || ''} onChange={handleChangeCliente} disabled={isSubmitting}
             />
            /* <select name="mesa_id" value={cliente.mesa_id || ''} onChange={handleChangeCliente} disabled={isSubmitting}>
              <option value="">Seleccionar Mesa</option>
              {mesasDisponibles.map(m => <option key={m.mesa_id} value={m.mesa_id}>{m.numero_mesa}</option>)}
            </select> */
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

      {/* Selección Rápida de Productos */}
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

      {/* Resumen del Pedido (Carrito) */}
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

      {/* Totales y Confirmación */}
      <div className="totales">
        <p>Subtotal: ${subtotal.toFixed(2)}</p>
        {tipoPedido === 'delivery' && cliente.costoEnvio !== '' && <p>Envío: ${costoEnvioNumerico.toFixed(2)}</p>}
        <h3>Total: ${total.toFixed(2)}</h3>
        {/* Mostrar error de submit */}
        {submitError && <p style={{ color: 'red' }}>{submitError}</p>}
        <button onClick={confirmarPedido} disabled={isSubmitting || carritoArray.length === 0 || !tipoPedido}>
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