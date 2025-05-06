import React, { useState } from 'react';
import './pedidoCliente.css';

const categorias = [
  { id: 'hamburguesas', nombre: 'Hamburguesas' },
  { id: 'snacks', nombre: 'Snacks' },
  { id: 'ensaladas', nombre: 'Ensaladas' },
  { id: 'bebidas', nombre: 'Bebidas' },
];

const productos = [
  { id: 1, nombre: 'Central Park', descripcion: 'Hamburguesa premium con ingredientes seleccionados.', precio: 3000, categoria: 'hamburguesas', imagen: '/default.jpg' },
  { id: 2, nombre: 'Central Park (simple)', descripcion: 'Versión simple de la clásica Central Park.', precio: 2500, categoria: 'hamburguesas', imagen: '/default.jpg' },
  { id: 3, nombre: 'Broadway', descripcion: 'Hamburguesa con un toque especial de la casa.', precio: 2800, categoria: 'hamburguesas', imagen: '/default.jpg' },
  { id: 4, nombre: 'Brooklyn', descripcion: 'Sabor intenso en cada bocado.', precio: 2500, categoria: 'hamburguesas', imagen: '/default.jpg' },
  { id: 5, nombre: 'Harlem', descripcion: 'Hamburguesa especiada con un sabor único.', precio: 2700, categoria: 'hamburguesas', imagen: '/default.jpg' },
  { id: 6, nombre: 'Green Point Avenue', descripcion: 'Hamburguesa gourmet con ingredientes frescos.', precio: 2600, categoria: 'hamburguesas', imagen: '/default.jpg' },
  { id: 7, nombre: 'Standburg', descripcion: 'Nuestra estrella: potente y deliciosa.', precio: 3200, categoria: 'hamburguesas', imagen: '/default.jpg' },
  { id: 8, nombre: 'Wall Street', descripcion: 'Hamburguesa con doble carne y doble queso.', precio: 3100, categoria: 'hamburguesas', imagen: '/default.jpg' },
  { id: 9, nombre: 'York Street', descripcion: 'Hamburguesa ligera y sabrosa.', precio: 2550, categoria: 'hamburguesas', imagen: '/default.jpg' },
  { id: 10, nombre: 'Time Square', descripcion: 'Combinación perfecta de sabores tradicionales.', precio: 2900, categoria: 'hamburguesas', imagen: '/default.jpg' },

  { id: 11, nombre: 'Papas Simples', descripcion: 'Papas fritas doradas y crocantes.', precio: 1000, categoria: 'snacks', imagen: '/default.jpg' },
  { id: 12, nombre: 'Papas CB', descripcion: 'Papas con cheddar y bacon.', precio: 1300, categoria: 'snacks', imagen: '/default.jpg' },
  { id: 13, nombre: 'Fried Chicken Crispy', descripcion: 'Pollo frito crujiente y sabroso.', precio: 1500, categoria: 'snacks', imagen: '/default.jpg' },

  { id: 14, nombre: 'Ensalada César', descripcion: 'Fresca con pollo, lechuga y aderezo César.', precio: 1200, categoria: 'ensaladas', imagen: '/default.jpg' },

  { id: 15, nombre: 'Pepsi', descripcion: 'Bebida cola clásica y refrescante.', precio: 800, categoria: 'bebidas', imagen: '/default.jpg' },
  { id: 16, nombre: 'Pepsi Black', descripcion: 'Sin azúcar, con el mismo sabor.', precio: 800, categoria: 'bebidas', imagen: '/default.jpg' },
  { id: 17, nombre: 'Mirinda', descripcion: 'Refrescante sabor naranja.', precio: 800, categoria: 'bebidas', imagen: '/default.jpg' },
  { id: 18, nombre: 'Seven-Up', descripcion: 'Gaseosa lima-limón.', precio: 800, categoria: 'bebidas', imagen: '/default.jpg' },
  { id: 19, nombre: 'Paso de los Toros', descripcion: 'Tónica con un toque amargo.', precio: 800, categoria: 'bebidas', imagen: '/default.jpg' },
  { id: 20, nombre: 'Stella Artois', descripcion: 'Cerveza belga premium.', precio: 1500, categoria: 'bebidas', imagen: '/default.jpg' },
  { id: 21, nombre: 'Agua Mineral', descripcion: 'Agua natural y pura.', precio: 700, categoria: 'bebidas', imagen: '/default.jpg' }
];


const PedidoCliente = () => {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('hamburguesas');
  const [carrito, setCarrito] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [tipoPedido, setTipoPedido] = useState('mostrador');
  const [form, setForm] = useState({
    nombre: '', telefono: '', pago: 'efectivo', direccion: '', correo: '', comentario: ''
  });

  const productosFiltrados = productos.filter(p => p.categoria === categoriaSeleccionada);

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => {
      const existe = prev.find(p => p.id === producto.id);
      return existe ? prev.map(p => p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p) : [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (id, delta) => {
    setCarrito(prev =>
      prev.map(p => p.id === id ? { ...p, cantidad: p.cantidad + delta } : p).filter(p => p.cantidad > 0)
    );
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(prev => prev.filter(p => p.id !== id));
  };

  const total = carrito.reduce((acc, p) => acc + p.precio * p.cantidad, 0);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!form.nombre || !form.telefono || !form.pago || (tipoPedido === 'delivery' && (!form.direccion || !form.correo))) {
      alert('Por favor completa todos los campos obligatorios.');
      return;
    }
    setModalVisible(true);
  };

  return (
    <div className="pedido-cliente-container">
      <header className="pedido-cliente-header">
        <h1>Realizar Pedido</h1>
        <div>
          <button className={`btn ${tipoPedido === 'mostrador' ? 'active' : ''}`} onClick={() => setTipoPedido('mostrador')}>Mostrador</button>
          <button className={`btn ${tipoPedido === 'delivery' ? 'active' : ''}`} onClick={() => setTipoPedido('delivery')}>Delivery</button>
        </div>
      </header>

      <div className="categorias">
        {categorias.map(cat => (
          <button
            key={cat.id}
            className={`categoria-btn ${categoriaSeleccionada === cat.id ? 'activa' : ''}`}
            onClick={() => setCategoriaSeleccionada(cat.id)}>
            {cat.nombre}
          </button>
        ))}
      </div>

      <div className="contenido">
        <div className="productos">
          {productosFiltrados.map(prod => (
            <div key={prod.id} className="producto-card">
              <img src={prod.imagen} alt={prod.nombre} className="producto-img" />
              <h3>{prod.nombre}</h3>
              <p>{prod.descripcion}</p>
              <p><strong>${prod.precio}</strong></p>
              <button onClick={() => agregarAlCarrito(prod)}>Agregar</button>
            </div>
          ))}
        </div>

        <div className="carrito">
          <h2>Mi Pedido</h2>
          {carrito.map(item => (
            <div key={item.id} className="carrito-item">
              <span>{item.nombre}</span>
              <div>
                <button onClick={() => cambiarCantidad(item.id, -1)}>-</button>
                <span>{item.cantidad}</span>
                <button onClick={() => cambiarCantidad(item.id, 1)}>+</button>
              </div>
              <button onClick={() => eliminarDelCarrito(item.id)}>X</button>
            </div>
          ))}
          <p>Total: ${total}</p>

          <form className="formulario-pedido">
            <input name="nombre" placeholder="Nombre" value={form.nombre} onChange={handleChange} required />
            <input name="telefono" placeholder="Teléfono" value={form.telefono} onChange={handleChange} required />
            <select name="pago" value={form.pago} onChange={handleChange} required>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
            </select>
            {tipoPedido === 'delivery' && (
              <>
                <input name="direccion" placeholder="Dirección" value={form.direccion} onChange={handleChange} required />
                <input name="correo" placeholder="Correo electrónico" value={form.correo} onChange={handleChange} required />
              </>
            )}
            <textarea name="comentario" placeholder="Comentario" value={form.comentario} onChange={handleChange} />
            <button type="button" onClick={handleSubmit}>Confirmar pedido</button>
          </form>
        </div>
      </div>

      {modalVisible && (
        <div className="modal">
          <div className="modal-content">
            <p>¡Pedido realizado correctamente! Espera la confirmación.</p>
            <button onClick={() => setModalVisible(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PedidoCliente;
