import React, { useState, useEffect } from 'react';
import './Productos.css';

const Productos = () => {
  // --- Estados ---
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Error general o de carga
  const [submitError, setSubmitError] = useState(null); // Error específico del formulario
  const [isSubmitting, setIsSubmitting] = useState(false); // Para deshabilitar botón

  // Estado para el formulario
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    precio: '',
    costo: '', // Mantenemos costo en el form, pero no se envía a la API actual
    categoria_id: '',
    descripcion: '' // Añadimos descripción al estado inicial
  });

  // Estado para las categorías del <select>
  const [categorias, setCategorias] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  // --- Cargar Productos (GET /api/productos) ---
  const fetchProductos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/productos');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error ${response.status}: ${errorData.message || response.statusText}`);
      }
      const data = await response.json();
      setProductos(data || []);
    } catch (err) {
      console.error("Error al obtener productos:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Cargar Categorías (GET /api/categorias) ---
  const fetchCategorias = async () => {
    setLoadingCategorias(true);
    try {
      const response = await fetch('/api/categorias');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Error ${response.status}: ${errorData.message || response.statusText}`);
      }
      const data = await response.json();
      setCategorias(data || []);
      // Opcional: Preseleccionar si hay categorías y no hay una seleccionada
      if (data && data.length > 0 && !nuevoProducto.categoria_id) {
        // No preseleccionamos aquí para forzar al usuario a elegir
        // setNuevoProducto(prev => ({ ...prev, categoria_id: data[0].categoria_id }));
      }
    } catch (err) {
      console.error("Error al obtener categorías:", err);
      // Podrías tener un estado de error separado para categorías si quieres
      setError(err.message + ' (Error al cargar categorías)');
    } finally {
      setLoadingCategorias(false);
    }
  };

  // --- useEffect para cargar datos iniciales ---
  useEffect(() => {
    fetchProductos();
    fetchCategorias();
  }, []); // Ejecutar al montar

  // --- Manejador de Cambios en el Formulario ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNuevoProducto(prev => ({ ...prev, [name]: value }));
  };

  // --- Manejador para Agregar Producto (POST /api/productos) ---
  const agregarProducto = async (e) => {
    e.preventDefault(); // Prevenir recarga de página si estuviera en un <form>
    setSubmitError(null); // Limpiar error previo de submit

    // Validación
    if (!nuevoProducto.nombre || !nuevoProducto.precio || !nuevoProducto.categoria_id) {
      setSubmitError('Nombre, Precio y Categoría son obligatorios.');
      return;
    }
    if (isNaN(parseFloat(nuevoProducto.precio)) || parseFloat(nuevoProducto.precio) < 0) {
      setSubmitError('El precio debe ser un número válido no negativo.');
      return;
    }
    if (isNaN(parseInt(nuevoProducto.categoria_id))) {
      setSubmitError('Debe seleccionar una categoría válida.');
      return;
    }

    // Datos a enviar
    const payload = {
      nombre: nuevoProducto.nombre.trim(),
      precio: parseFloat(nuevoProducto.precio),
      descripcion: nuevoProducto.descripcion?.trim() || null,
      categoria_id: parseInt(nuevoProducto.categoria_id),
      // 'costo' no se envía actualmente
    };

    setIsSubmitting(true); // Deshabilitar botón

    try {
      const response = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Intenta obtener detalles del error del backend
        throw new Error(`Error ${response.status}: ${errorData.message || response.statusText}`);
      }

      const productoCreado = await response.json(); // La API devuelve el producto completo

      // Actualizar la lista de productos en el estado local para reflejar el cambio SIN recargar
      // setProductos(prevProductos => [...prevProductos, productoCreado]); // Opción 1: Añadir al final
      // Opción 2: Recargar la lista completa para asegurar consistencia (más simple)
      await fetchProductos();

      // Limpiar el formulario
      setNuevoProducto({ nombre: '', precio: '', costo: '', categoria_id: '', descripcion: '' });
      alert('¡Producto agregado exitosamente!');

    } catch (err) {
      console.error("Error al agregar producto:", err);
      setSubmitError(`Error al agregar: ${err.message}`);
    } finally {
      setIsSubmitting(false); // Habilitar botón de nuevo
    }
  };

  // --- Renderizado ---

  if (loading) return <div className="productos-container"><h1>Productos</h1><p>Cargando productos...</p></div>;
  if (error && !productos.length) return <div className="productos-container"><h1>Productos</h1><p style={{ color: 'red' }}>{error}</p></div>; // Mostrar error solo si no hay productos

  return (
    <div className="productos-container">
      <h1>Productos</h1>
      {error && <p style={{ color: 'orange' }}>Advertencia: {error}</p>} {/* Mostrar error de carga si ocurrió pero hay datos */}

      {/* --- Formulario para Agregar --- */}
      <form onSubmit={agregarProducto} className="form-producto">
        <input
          type="text"
          name="nombre" // Añadir name
          placeholder="Nombre"
          value={nuevoProducto.nombre}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />
        <input
          type="number"
          name="precio" // Añadir name
          placeholder="Precio"
          step="0.01" // Permitir decimales
          value={nuevoProducto.precio}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />
         <input
          type="text" // Cambiado a text para permitir vacío
          name="descripcion" // Añadir name
          placeholder="Descripción (Opcional)"
          value={nuevoProducto.descripcion}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />
        {/* Costo (opcional, no se envía) */}
        <input
          type="number"
          name="costo"
          placeholder="Costo (Info local)"
          step="0.01"
          value={nuevoProducto.costo}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />
        {/* Select para Categoría */}
        <select
          name="categoria_id" // Añadir name
          value={nuevoProducto.categoria_id}
          onChange={handleInputChange}
          disabled={loadingCategorias || isSubmitting}
          required // Hacerlo requerido en el HTML
        >
          <option value="" disabled>-- Seleccione Categoría --</option>
          {loadingCategorias ? (
            <option disabled>Cargando...</option>
          ) : (
            categorias.map((cat) => (
              <option key={cat.categoria_id} value={cat.categoria_id}>
                {cat.nombre}
              </option>
            ))
          )}
        </select>
        <button type="submit" disabled={isSubmitting || loadingCategorias}>
          {isSubmitting ? 'Agregando...' : 'Agregar Producto'}
        </button>
      </form>
      {/* Mostrar error del formulario si existe */}
      {submitError && <p style={{ color: 'red', marginTop: '10px' }}>{submitError}</p>}

      {/* --- Tabla de Productos --- */}
      <table className="tabla-productos">
        {/* ... (thead se mantiene igual) ... */}
        <thead>
           <tr>
             <th>Nombre</th>
             <th>Precio</th>
             <th>Categoría</th>
             {/* <th>Costo</th> */}
           </tr>
         </thead>
        <tbody>
          {productos.length > 0 ? (
            productos.map((p) => (
              <tr key={p.producto_id}>
                <td>{p.nombre}</td>
                <td>${typeof p.precio === 'number' ? p.precio.toFixed(2) : 'N/D'}</td>
                <td>{p.categoria_nombre || 'N/A'}</td>
                {/* <td>${p.costo || 'N/A'}</td> */}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3">No hay productos registrados.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Productos;