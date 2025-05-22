import React, { useState, useEffect } from 'react';
import './tomaPedidos.css'; 

const TomaPedidos = () => {
  // --- Estados ---
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(''); 
  const [carrito, setCarrito] = useState({}); 

  const [tipoPedido, setTipoPedido] = useState('mostrador'); 

  
  const [formCliente, setFormCliente] = useState({
    nombre: '',
    telefono: '',
    pago: 'efectivo',
    direccion: '',
    correo: '',
    comentario: '',
  });

  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const fetchCategorias = async () => {
      setLoadingCategorias(true);
      try {
        const response = await fetch('/api/categorias');
        if (!response.ok) throw new Error('Error al cargar categorías');
        const data = await response.json();
        setCategorias(data || []);
        if (data && data.length > 0) {
          setCategoriaSeleccionada(data[0].categoria_id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingCategorias(false);
      }
    };

    const fetchProductos = async () => {
      setLoadingProductos(true);
      try {
        const response = await fetch('/api/productos');
        if (!response.ok) throw new Error('Error al cargar productos');
        const data = await response.json();
        setProductos(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingProductos(false);
      }
    };

    fetchCategorias();
    fetchProductos();
  }, []);

  useEffect(() => {
    if (categoriaSeleccionada) {
      setProductosFiltrados(productos.filter(p => p.categoria_id === parseInt(categoriaSeleccionada)));
    } else {
      setProductosFiltrados(productos);
    }
  }, [categoriaSeleccionada, productos]);

  // --- Carrito ---
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
        const { [productoId]: _, ...resto } = prev;
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

  const handleChangeFormCliente = (e) => {
    setFormCliente({ ...formCliente, [e.target.name]: e.target.value });
  };

  const limpiarTodo = () => {
    setCarrito({});
    setFormCliente({ nombre: '', telefono: '', pago: 'efectivo', direccion: '', correo: '', comentario: '' });
    setTipoPedido('mostrador');
    setError(null);
    setSubmitError(null);
    setIsSubmitting(false);
    setModalVisible(false);
  };

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
      console.log('Pedido creado:', pedidoCreado);
      setModalVisible(true);
    } catch (err) {
      setSubmitError(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cerrarModalYLimpiar = () => {
    setModalVisible(false);
    limpiarTodo();
  };

  if (loadingCategorias || loadingProductos) {
    return <div className="pedido-cliente-container"><h1>Toma de Pedidos</h1><p>Cargando...</p></div>;
  }

  if (error) {
    return <div className="pedido-cliente-container"><h1>Toma de Pedidos</h1><p style={{color: 'red'}}>{error}</p></div>;
  }

  const carritoArray = Object.values(carrito);

  return (
    <div className="pedido-cliente-container">
      <header className="pedido-cliente-header">
        <h1>Toma de Pedidos</h1>
        { <div className="tipo-pedido">
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
        </div> }
      </header>

      <div className="categorias">
        {categorias.map(cat => (
          <button
            key={cat.categoria_id}
            className={`categoria-btn
            ${categoriaSeleccionada === cat.categoria_id ? 'categoria-activa' : ''}`}
            onClick={() => setCategoriaSeleccionada(cat.categoria_id)}
            disabled={isSubmitting}
          >
        {cat.nombre}
        </button>
        ))}
      </div>
      
  <div className="productos">
    {productosFiltrados.length === 0 && <p>No hay productos en esta categoría.</p>}
    {productosFiltrados.map(prod => (
      <div
        key={prod.producto_id}
        className="producto-card"
        onClick={() => agregarAlCarrito(prod)}
        tabIndex={0}
        role="button"
        onKeyDown={e => { if (e.key === 'Enter') agregarAlCarrito(prod); }}
        aria-label={`Agregar ${prod.nombre} al carrito`}
      >
        <img src={prod.imagen_url} alt={prod.nombre} />
        <div className="producto-info">
          <h3>{prod.nombre}</h3>
          <p>${prod.precio.toFixed(2)}</p>
        </div>
      </div>
    ))}
  </div>

  <div className="pedido-footer">
    <section className="carrito">
      <h2>Carrito</h2>
      {carritoArray.length === 0 ? (
        <p>El carrito está vacío.</p>
      ) : (
        carritoArray.map(item => (
          <div key={item.producto_id} className="carrito-item">
            <span>{item.nombre}</span>
            <span>
              <button
                onClick={() => cambiarCantidad(item.producto_id, -1)}
                aria-label={`Disminuir cantidad de ${item.nombre}`}
                disabled={isSubmitting}
              >-</button>
              <strong>{item.cantidad}</strong>
              <button
                onClick={() => cambiarCantidad(item.producto_id, 1)}
                aria-label={`Aumentar cantidad de ${item.nombre}`}
                disabled={isSubmitting}
              >+</button>
            </span>
            <span>${(item.precio * item.cantidad).toFixed(2)}</span>
            <button
              onClick={() => eliminarDelCarrito(item.producto_id)}
              aria-label={`Eliminar ${item.nombre} del carrito`}
              disabled={isSubmitting}
            >×</button>
          </div>
        ))
      )}
      <div className="total">
        Total: ${totalCarrito.toFixed(2)}
      </div>
    </section>

    <aside className="form-cliente">
      <h2>Datos del Cliente</h2>
      <form onSubmit={handleSubmitPedido} noValidate>
        <label htmlFor="nombre">Nombre *</label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          value={formCliente.nombre}
          onChange={handleChangeFormCliente}
          required
          disabled={isSubmitting}
          autoComplete="name"
        />

        <label htmlFor="telefono">Teléfono</label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          value={formCliente.telefono}
          onChange={handleChangeFormCliente}
          disabled={isSubmitting}
          autoComplete="tel"
        />

        {/* Si usas delivery, mostrar dirección */}
        {tipoPedido === 'delivery' && (
          <>
            <label htmlFor="direccion">Dirección *</label>
            <input
              id="direccion"
              name="direccion"
              type="text"
              value={formCliente.direccion}
              onChange={handleChangeFormCliente}
              required={tipoPedido === 'delivery'}
              disabled={isSubmitting}
              autoComplete="address-line1"
            />
          </>
        )}

        <label htmlFor="correo">Correo electrónico</label>
        <input
          id="correo"
          name="correo"
          type="email"
          value={formCliente.correo}
          onChange={handleChangeFormCliente}
          disabled={isSubmitting}
          autoComplete="email"
        />

        <label htmlFor="pago">Método de pago *</label>
        <select
          id="pago"
          name="pago"
          value={formCliente.pago}
          onChange={handleChangeFormCliente}
          disabled={isSubmitting}
          required
        >
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="transferencia">Transferencia</option>
        </select>

        <label htmlFor="comentario">Comentario</label>
        <textarea
          id="comentario"
          name="comentario"
          value={formCliente.comentario}
          onChange={handleChangeFormCliente}
          disabled={isSubmitting}
        ></textarea>

        {submitError && <p className="error-submit" role="alert">{submitError}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviar Pedido'}
        </button>
      </form>
    </aside>
  </div>

  {/* Modal de éxito */}
  {modalVisible && (
    <div className="modal-exito" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
      <div className="modal-contenido">
        <h2 id="modal-titulo">Pedido enviado con éxito</h2>
        <p>Gracias por tu pedido. Nos pondremos en contacto pronto.</p>
        <button onClick={cerrarModalYLimpiar} autoFocus>
          Cerrar
        </button>
      </div>
    </div>
  )}
</div>
);
};

export default TomaPedidos;