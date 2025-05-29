import React, { useState, useEffect } from 'react';
// import './Productos.css'; // Se comenta o elimina la importación antigua
import styles from './Productos.module.css'; // NUEVA IMPORTACIÓN del CSS Module

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
    imagen: null,
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
      console.error("Error en fetchCategorias:", e);
    } finally {
      setLoadingCategorias(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "imagen") {
      setNuevoProducto(prev => ({ ...prev, imagen: files[0] }));
    } else {
      setNuevoProducto(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const formData = new FormData();
    formData.append('nombre', nuevoProducto.nombre);
    formData.append('precio', nuevoProducto.precio);
    formData.append('costo', nuevoProducto.costo);
    formData.append('categoria_id', nuevoProducto.categoria_id);
    formData.append('descripcion', nuevoProducto.descripcion);
    if (nuevoProducto.imagen) {
      formData.append('imagen', nuevoProducto.imagen);
    }

    try {
      const res = await fetch('/api/productos', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido al agregar producto' }));
        throw new Error(errorData.message || 'Error al agregar producto');
      }
      fetchProductos();
      setNuevoProducto({ nombre: '', precio: '', costo: '', categoria_id: '', descripcion: '', imagen: null });
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles['productos-page-container']}>
      <h1>Gestión de Productos</h1>

      <div className={styles['form-container']}>
        <h2>Agregar Nuevo Producto</h2>
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          {/* Aplicamos .formFieldGroup a cada div contenedor de label+input */}
          <div className={styles.formFieldGroup}>
            <label htmlFor="nombre">Nombre:</label>
            <input type="text" id="nombre" name="nombre" value={nuevoProducto.nombre} onChange={handleChange} required />
          </div>
          <div className={styles.formFieldGroup}>
            <label htmlFor="precio">Precio:</label>
            <input type="number" id="precio" name="precio" value={nuevoProducto.precio} onChange={handleChange} required min="0" step="0.01" />
          </div>
          <div className={styles.formFieldGroup}>
            <label htmlFor="costo">Costo:</label>
            <input type="number" id="costo" name="costo" value={nuevoProducto.costo} onChange={handleChange} min="0" step="0.01" />
          </div>
          <div className={styles.formFieldGroup}>
            <label htmlFor="categoria_id">Categoría:</label>
            {loadingCategorias ? <p>Cargando categorías...</p> : (
              <select id="categoria_id" name="categoria_id" value={nuevoProducto.categoria_id} onChange={handleChange} required>
                <option value="">Seleccione una categoría</option>
                {categorias.map(cat => (
                  <option key={cat.categoria_id} value={cat.categoria_id}>{cat.nombre}</option>
                ))}
              </select>
            )}
          </div>
          <div className={styles.formFieldGroup}>
            <label htmlFor="descripcion">Descripción:</label>
            {/* Aplicamos .fixedTextarea al textarea */}
            <textarea id="descripcion" name="descripcion" className={styles.fixedTextarea} value={nuevoProducto.descripcion} onChange={handleChange}></textarea>
          </div>
          <div className={styles.formFieldGroup}>
            <label htmlFor="imagen">Imagen:</label>
            <input type="file" id="imagen" name="imagen" onChange={handleChange} accept="image/*" />
          </div>
          {/* Aplicamos .submitButton al botón */}
          <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
            {isSubmitting ? 'Agregando...' : 'Agregar Producto'}
          </button>
          {submitError && <p className={styles.error}>{submitError}</p>}
        </form>
      </div>

      <div className={styles['tabla-container']}>
        {loading ? (
          <p>Cargando productos...</p>
        ) : error ? (
          <p className={styles.error}>{error}</p> 
        ) : (
          <table className={styles['tabla-productos']}>
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
                      <img 
                        src={p.imagen_url.startsWith('http') ? p.imagen_url : `/ImagenesProductos/${p.imagen_url}`} 
                        alt={p.nombre} 
                        className={styles['producto-imagen-tabla']} />
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