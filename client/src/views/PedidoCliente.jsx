import React, { useState, useEffect } from 'react';
import './pedidoCliente.css'; // Asegúrate que este CSS exista y esté bien

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
    pago: 'efectivo', // Asumiendo que este es un valor por defecto
    direccion: '',
    correo: '', // Tu tabla PEDIDOS no tiene correo, pero el form sí. Ajusta si es necesario.
    comentario: '' // Este es 'notas' en tu tabla PEDIDOS
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
      setProductosFiltrados(productos); // Mostrar todos si no hay categoría seleccionada (o la primera)
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
    // setCategoriaSeleccionada(categorias.length > 0 ? categorias[0].categoria_id : ''); // Resetear a la primera categoría
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

    // Validaciones del formulario
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

    console.log("DEBUG Frontend: Contenido del carrito ANTES de map:", JSON.stringify(carrito, null, 2));

    const itemsParaEnviar = Object.values(carrito).map(item => ({
      producto_id: item.producto_id,
      cantidad: item.cantidad
    }));

    console.log("DEBUG Frontend: itemsParaEnviar DESPUÉS de map:", JSON.stringify(itemsParaEnviar, null, 2));

    const payload = {
      tipo: tipoPedido, // 'mostrador' o 'delivery'
      cliente_nombre: formCliente.nombre.trim(),
      cliente_telefono: formCliente.telefono.trim() || null,
      cliente_direccion: tipoPedido === 'delivery' ? formCliente.direccion.trim() : null,
      notas: formCliente.comentario.trim() || null, // 'comentario' del form va a 'notas'
      items: itemsParaEnviar,
      mesa_id: null, // Los clientes no eligen mesa desde esta interfaz
      // El total se calculará en el backend
    };
    // El campo 'pago' del form (efectivo/transferencia) no se envía directamente al crear el pedido.
    // Se gestionaría al momento de registrar el PAGO en la BD, que es un paso posterior.
    // Tu tabla PEDIDOS no tiene un campo para 'correo', así que no lo enviamos.

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
      setModalVisible(true); // Mostrar modal de éxito
      // No limpiamos todo aquí, lo hacemos al cerrar el modal
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
        <div>
          <button
            className={`btn ${tipoPedido === 'mostrador' ? 'active' : ''}`}
            onClick={() => setTipoPedido('mostrador')}
            disabled={isSubmitting}
          >
            Retiro en Mostrador
          </button>
          <button
            className={`btn ${tipoPedido === 'delivery' ? 'active' : ''}`}
            onClick={() => setTipoPedido('delivery')}
            disabled={isSubmitting}
          >
            Delivery
          </button>
        </div>
      </header>

      <div className="categorias">
        {categorias.map(cat => (
          <button
            key={cat.categoria_id}
            className={`categoria-btn ${categoriaSeleccionada === cat.categoria_id ? 'activa' : ''}`}
            onClick={() => setCategoriaSeleccionada(cat.categoria_id)}
            disabled={isSubmitting}
          >
            {cat.nombre}
          </button>
        ))}
      </div>

      <div className="contenido">
        <div className="productos">
          {productosFiltrados.length > 0 ? productosFiltrados.map(prod => (
            <div key={prod.producto_id} className="producto-card">
              <img src={prod.imagen_url || '/default.jpg'} alt={prod.nombre} className="producto-img" />
              <h3>{prod.nombre}</h3>
              <p>{prod.descripcion || 'Sin descripción'}</p>
              <p><strong>${prod.precio ? prod.precio.toFixed(2) : 'N/D'}</strong></p>
              <button onClick={() => agregarAlCarrito(prod)} disabled={isSubmitting}>Agregar</button>
            </div>
          )) : <p>No hay productos en esta categoría o para mostrar.</p>}
        </div>

        <div className="carrito">
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
                <button className="eliminar-item-cliente" onClick={() => eliminarDelCarrito(item.producto_id)} disabled={isSubmitting}>X</button>
              </div>
            ))
          )}
          <p className="total-carrito-cliente">Total: ${totalCarrito.toFixed(2)}</p>

          <form className="formulario-pedido" onSubmit={handleSubmitPedido}>
            <input name="nombre" placeholder="Nombre Completo*" value={formCliente.nombre} onChange={handleChangeFormCliente} required disabled={isSubmitting} />
            <input name="telefono" type="tel" placeholder="Teléfono (Opcional)" value={formCliente.telefono} onChange={handleChangeFormCliente} disabled={isSubmitting} />

            {tipoPedido === 'delivery' && (
              <>
                <input name="direccion" placeholder="Dirección Completa*" value={formCliente.direccion} onChange={handleChangeFormCliente} required disabled={isSubmitting} />
                {/* Tu tabla no tiene 'correo', considera si lo necesitas o quítalo del form */}
                {/* <input name="correo" type="email" placeholder="Correo electrónico (Opcional)" value={formCliente.correo} onChange={handleChangeFormCliente} disabled={isSubmitting} /> */}
              </>
            )}
            <select name="pago" value={formCliente.pago} onChange={handleChangeFormCliente} required disabled={isSubmitting}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              {/* Añade más métodos si los manejas */}
            </select>
            <textarea name="comentario" placeholder="Comentario Adicional (Opcional)" value={formCliente.comentario} onChange={handleChangeFormCliente} disabled={isSubmitting} />

            {submitError && <p style={{ color: 'red', marginTop: '10px' }}>{submitError}</p>}

            <button type="submit" disabled={isSubmitting || carritoArray.length === 0}>
              {isSubmitting ? 'Enviando Pedido...' : 'Confirmar pedido'}
            </button>
          </form>
        </div>
      </div>

      {modalVisible && (
        <div className="modal">
          <div className="modal-content">
            <p>¡Pedido realizado correctamente! Nos pondremos en contacto contigo pronto para confirmar.</p>
            <button onClick={cerrarModalYLimpiar}>Cerrar y Nuevo Pedido</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PedidoCliente;