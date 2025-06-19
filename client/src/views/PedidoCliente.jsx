import React, { useState, useEffect } from 'react';
import './pedidoCliente.css'; 

const PedidoCliente = () => {
  // --- Estados ---
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(''); // ID de la categoría
  const [carrito, setCarrito] = useState({}); // { productoId: { ...producto, cantidad } }

  const [tipoPedido, setTipoPedido] = useState('mostrador'); // 'mostrador' o 'delivery'
  const [formCliente, setFormCliente] = useState({
    nombre: '',
    telefono: '',
    pago: 'efectivo', // Valor por defecto
    direccion: '',
    correo: '',
    comentario: '' 
  });

  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [error, setError] = useState(null); // Para errores de carga
  const [submitError, setSubmitError] = useState(null); // Para errores de envío de pedido
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false); // Para el mensaje de éxito

  // --- Carga de Datos Inicial ---
  useEffect(() => {
    const fetchCategorias = async () => {
      setLoadingCategorias(true);
      try {
        const response = await fetch('/api/categorias');
        if (!response.ok) throw new Error('Error al cargar categorías');
        const data = await response.json();
        setCategorias(data || []);
        if (data && data.length > 0) {
          setCategoriaSeleccionada(data[0].categoria_id); // Selecciona la primera por defecto
        }
      } catch (err) {
        console.error("Error fetching categorías:", err);
        setError(err.message);
      } finally {
        setLoadingCategorias(false);
      }
    };

    const fetchProductos = async () => {
      setLoadingProductos(true);
      try {
        const response = await fetch('/api/productos'); // Carga todos los productos
        if (!response.ok) throw new Error('Error al cargar productos');
        const data = await response.json();
        setProductos(data || []);
      } catch (err) {
        console.error("Error fetching productos:", err);
        setError(err.message);
      } finally {
        setLoadingProductos(false);
      }
    };

    fetchCategorias();
    fetchProductos();
  }, []);

  // --- Filtrar Productos por Categoría ---
  useEffect(() => {
    if (categoriaSeleccionada) {
      setProductosFiltrados(productos.filter(p => p.categoria_id === parseInt(categoriaSeleccionada)));
    } else {
      setProductosFiltrados(productos);
    }
  }, [categoriaSeleccionada, productos]);


  // --- Lógica del Carrito ---
  const agregarAlCarrito = (producto) => {
    setCarrito(prev => {
      const existente = prev[producto.producto_id];
      if (existente) {
        return { ...prev, [producto.producto_id]: { ...existente, cantidad: existente.cantidad + 1 } };
      }
      return { ...prev, [producto.producto_id]: { ...producto, cantidad: 1 } };
    });
  };

  const cambiarCantidad = (productoId, delta) => {
    setCarrito(prev => {
      const itemActual = prev[productoId];
      if (!itemActual) return prev;
      const nuevaCantidad = itemActual.cantidad + delta;
      if (nuevaCantidad <= 0) {
        const { [productoId]: _, ...resto } = prev; // Eliminar item
        return resto;
      }
      return { ...prev, [productoId]: { ...itemActual, cantidad: nuevaCantidad } };
    });
  };

  const eliminarDelCarrito = (productoId) => {
    setCarrito(prev => {
      const { [productoId]: _, ...resto } = prev;
      return resto;
    });
  };

  const totalCarrito = Object.values(carrito).reduce((acc, p) => acc + (p.precio * p.cantidad), 0);

  // --- Manejar Cambios en Formulario del Cliente ---
  const handleChangeFormCliente = (e) => {
    setFormCliente({ ...formCliente, [e.target.name]: e.target.value });
  };

  // --- Limpiar Formulario y Carrito ---
  const limpiarTodo = () => {
    setCarrito({});
    setFormCliente({ nombre: '', telefono: '', pago: 'efectivo', direccion: '', correo: '', comentario: '' });
    setTipoPedido('mostrador');
    setError(null);
    setSubmitError(null);
    setIsSubmitting(false);
    setModalVisible(false);
  }

  // --- Enviar Pedido ---
  const handleSubmitPedido = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    if (!formCliente.nombre.trim()) {
      setSubmitError('El nombre es obligatorio.');
      setIsSubmitting(false);
      return;
    }
    if (tipoPedido === 'delivery' && !formCliente.direccion.trim()) {
      setSubmitError('La dirección es obligatoria para delivery.');
      setIsSubmitting(false);
      return;
    }
    if (Object.keys(carrito).length === 0) {
      setSubmitError('El carrito está vacío.');
      setIsSubmitting(false);
      return;
    }
    if (!formCliente.pago) {
        setSubmitError('Debe seleccionar un método de pago.');
        setIsSubmitting(false);
        return;
    }

    const itemsParaEnviar = Object.values(carrito).map(item => ({
      producto_id: item.producto_id,
      cantidad: item.cantidad
    }));

    const payload = {
      tipo: tipoPedido,
      cliente_nombre: formCliente.nombre.trim(),
      cliente_telefono: formCliente.telefono.trim() || null,
      cliente_direccion: tipoPedido === 'delivery' ? formCliente.direccion.trim() : null,
      notas: formCliente.comentario.trim() || null,
      items: itemsParaEnviar,
      mesa_id: null,
      metodo_pago: formCliente.pago 
    };

    console.log("Enviando pedido de cliente:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error ${response.status}: ${errorData.message || 'No se pudo crear el pedido'}`);
      }

      const pedidoCreado = await response.json();
      console.log('Pedido de cliente creado:', pedidoCreado);
      setModalVisible(true);
    } catch (err) {
      console.error("Error al enviar pedido:", err);
      setSubmitError(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cerrarModalYLimpiar = () => {
    setModalVisible(false);
    limpiarTodo();
  }


  // --- Renderizado ---
  if (loadingCategorias || loadingProductos) {
    return <div className="pedido-cliente-container"><h1>Realizar Pedido</h1><p>Cargando...</p></div>;
  }

  if (error) {
    return <div className="pedido-cliente-container"><h1>Realizar Pedido</h1><p style={{color: 'red'}}>{error}</p></div>;
  }

  const carritoArray = Object.values(carrito);

return (
  <div className="pedido-cliente-container">
    <header className="pedido-cliente-header">
      <h1>Realizar Pedido</h1>
      <div className="tipo-pedido">
        <input
          type="checkbox"
          id="pedido-toggle"
          checked={tipoPedido === 'delivery'}
          onChange={() => setTipoPedido(tipoPedido === 'mostrador' ? 'delivery' : 'mostrador')}
          disabled={isSubmitting}
        />
        <label htmlFor="pedido-toggle" className="switch">
          <span className="switch-label" data-on="Delivery" data-off="Mostrador"></span>
          <span className="switch-button"></span>
        </label>
      </div>
    </header>

    <div className="categorias">
      {categorias.map(cat => (
        <button
          key={cat.categoria_id}
          className={`categoria-btn ${categoriaSeleccionada === cat.categoria_id ? 'activa' : ''}`}
          onClick={() => setCategoriaSeleccionada(cat.categoria_id)}
          disabled={isSubmitting}
          aria-pressed={categoriaSeleccionada === cat.categoria_id}
        >
          {cat.nombre}
        </button>
      ))}
    </div>

    <div className="contenido">
<section className="productos" aria-label="Lista de productos">
  {productosFiltrados.length > 0 ? (
    productosFiltrados.map(prod => (
      <article key={prod.producto_id} className="producto-card">
        <img
          src={`/ImagenesProductos/${prod.producto_id}.jpg`}
          onError={(e) => { e.currentTarget.src = '/default.jpg'; }}
          alt={prod.nombre}
          className="producto-img"
        />
        <h3>{prod.nombre}</h3>
        <p>{prod.descripcion || 'Sin descripción'}</p>
        <p><strong>${prod.precio ? prod.precio.toFixed(2) : 'N/D'}</strong></p>
        <button onClick={() => agregarAlCarrito(prod)} disabled={isSubmitting}>Agregar</button>
      </article>
    ))
  ) : (
    <p>No hay productos en esta categoría o para mostrar.</p>
  )}
</section>
      <aside className="carrito" aria-label="Carrito de compra">
        <h2>Mi Pedido</h2>
        {carritoArray.length === 0 ? (
          <p>Tu carrito está vacío.</p>
        ) : (
          carritoArray.map(item => (
            <div key={item.producto_id} className="carrito-item">
              <span>{item.nombre} (${item.precio.toFixed(2)})</span>
              <div className="controles-cantidad">
                <button onClick={() => cambiarCantidad(item.producto_id, -1)} disabled={isSubmitting}>-</button>
                <span>{item.cantidad}</span>
                <button onClick={() => cambiarCantidad(item.producto_id, 1)} disabled={isSubmitting}>+</button>
              </div>
              <span>${(item.precio * item.cantidad).toFixed(2)}</span>
              <button className="eliminar-item-cliente" onClick={() => eliminarDelCarrito(item.producto_id)} disabled={isSubmitting} aria-label={`Eliminar ${item.nombre} del carrito`}>X</button>
            </div>
          ))
        )}
        <p className="total-carrito-cliente">Total: ${totalCarrito.toFixed(2)}</p>

        <form className="formulario-pedido" onSubmit={handleSubmitPedido}>
          <input name="nombre" placeholder="Nombre Completo*" value={formCliente.nombre} onChange={handleChangeFormCliente} required disabled={isSubmitting} />
          <input name="telefono" type="tel" placeholder="Teléfono" value={formCliente.telefono} onChange={handleChangeFormCliente} disabled={isSubmitting} />

          {tipoPedido === 'delivery' && (
            <input name="direccion" placeholder="Dirección Completa*" value={formCliente.direccion} onChange={handleChangeFormCliente} required disabled={isSubmitting} />
          )}

          <select name="pago" value={formCliente.pago} onChange={handleChangeFormCliente} required disabled={isSubmitting}>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta_credito">Tarjeta de Crédito</option>
            <option value="tarjeta_debito">Tarjeta de Débito</option>
          </select>
         <textarea name="comentario" placeholder="Comentario Adicional (Opcional)" value={formCliente.comentario} onChange={handleChangeFormCliente} disabled={isSubmitting} style={{ resize: 'none' }}/>

          {submitError && <p className="error-text">{submitError}</p>}

          <button type="submit" disabled={isSubmitting || carritoArray.length === 0}>
            {isSubmitting ? 'Enviando Pedido...' : 'Confirmar pedido'}
          </button>
        </form>
      </aside>
    </div>

    {modalVisible && (
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-content">
          <p id="modal-title">¡Pedido realizado correctamente! Nos pondremos en contacto contigo pronto para confirmar.</p>
          <button onClick={cerrarModalYLimpiar}>Cerrar y Nuevo Pedido</button>
        </div>
      </div>
    )}
  </div>
);

};

export default PedidoCliente;