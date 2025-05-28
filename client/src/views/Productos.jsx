import React, { useState, useEffect } from 'react';
import './Productos.css';

const Productos = () => {
  // --- Estados ---
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    precio: '',
    costo: '',
    categoria_id: '',
    descripcion: '',
    imagen: null, // Nuevo campo para imagen
  });

  const [categorias, setCategorias] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  useEffect(() => {
    fetchProductos();
    fetchCategorias();
  }, []);

  const fetchProductos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/productos');
      if (!res.ok) throw new Error('Error al cargar productos');
      const data = await res.json();
      setProductos(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    setLoadingCategorias(true);
    try {
      const res = await fetch('/api/categorias');
      if (!res.ok) throw new Error('Error al cargar categorías');
      const data = await res.json();
      setCategorias(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingCategorias(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNuevoProducto(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setNuevoProducto(prev => ({ ...prev, imagen: e.target.files[0] }));
  };

  const agregarProducto = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!nuevoProducto.nombre || !nuevoProducto.precio || !nuevoProducto.categoria_id) {
      setSubmitError('Nombre, Precio y Categoría son obligatorios.');
      return;
    }
    if (isNaN(parseFloat(nuevoProducto.precio)) || parseFloat(nuevoProducto.precio) < 0) {
      setSubmitError('El precio debe ser un número válido no negativo.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('nombre', nuevoProducto.nombre.trim());
      formData.append('precio', parseFloat(nuevoProducto.precio));
      formData.append('descripcion', nuevoProducto.descripcion.trim());
      formData.append('categoria_id', parseInt(nuevoProducto.categoria_id));
      if (nuevoProducto.imagen) formData.append('imagen', nuevoProducto.imagen);

      const res = await fetch('/api/productos', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al agregar producto');
      }

      await fetchProductos();

      setNuevoProducto({
        nombre: '',
        precio: '',
        costo: '',
        categoria_id: '',
        descripcion: '',
        imagen: null,
      });

      alert('¡Producto agregado exitosamente!');
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="productos-container">
      <h1 className="titulo">Gestión de Productos</h1>

      {/* Formulario en card */}
      <div className="card-form">
        <h2>Agregar Nuevo Producto</h2>
        <form onSubmit={agregarProducto} className="form-producto">
          <input
            type="text"
            name="nombre"
            placeholder="Nombre"
            value={nuevoProducto.nombre}
            onChange={handleInputChange}
            disabled={isSubmitting}
          />
          <input
            type="number"
            name="precio"
            placeholder="Precio"
            step="0.01"
            value={nuevoProducto.precio}
            onChange={handleInputChange}
            disabled={isSubmitting}
          />
          <input
            type="text"
            name="descripcion"
            placeholder="Descripción (Opcional)"
            value={nuevoProducto.descripcion}
            onChange={handleInputChange}
            disabled={isSubmitting}
          />
          <select
            name="categoria_id"
            value={nuevoProducto.categoria_id}
            onChange={handleInputChange}
            disabled={loadingCategorias || isSubmitting}
            required
          >
            <option value="" disabled>-- Seleccione Categoría --</option>
            {loadingCategorias ? (
              <option disabled>Cargando...</option>
            ) : (
              categorias.map(cat => (
                <option key={cat.categoria_id} value={cat.categoria_id}>
                  {cat.nombre}
                </option>
              ))
            )}
          </select>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isSubmitting}
          />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Agregando...' : 'Agregar Producto'}
          </button>
          {submitError && <p className="error">{submitError}</p>}
        </form>
      </div>

      {/* Tabla productos */}
      <div className="tabla-container">
        {loading ? (
          <p>Cargando productos...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <table className="tabla-productos">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Categoría</th>
              </tr>
            </thead>
            <tbody>
              {productos.length ? (
                productos.map(p => (
                  <tr key={p.producto_id}>
                    <td>
                      {p.imagen_url ? (
                      <img src={`/ImagenesProductos/${prod.producto_id}.jpg`} alt={prod.nombre}/>                      
                        ) : (
                        <span>No image</span>
                      )}
                    </td>
                    <td>{p.nombre}</td>
                    <td>${typeof p.precio === 'number' ? p.precio.toFixed(2) : 'N/D'}</td>
                    <td>{p.categoria_nombre || 'N/A'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4">No hay productos registrados.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Productos;
