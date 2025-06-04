// standburg-project-gemini/client/src/views/Productos.jsx
import React, { useState, useEffect } from 'react';
import styles from './Productos.module.css';
import { toast } from 'react-toastify';

const Productos = () => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    precio: '',
    // costo: '', // Eliminado
    categoria_id: '',
    descripcion: '',
    imagen_url: '',
  });
  const [isSubmittingNuevoProducto, setIsSubmittingNuevoProducto] = useState(false);
  const [submitErrorNuevoProducto, setSubmitErrorNuevoProducto] = useState(null);

  const [categorias, setCategorias] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productoAEditar, setProductoAEditar] = useState(null);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [submitErrorModal, setSubmitErrorModal] = useState(null);

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
      setProductos(data); // Asumimos que el backend ahora envía productos con imagen_url y sin costo
    } catch (e) {
      setError(e.message);
      toast.error(`Error al cargar productos: ${e.message}`);
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
      toast.error(`Error al cargar categorías: ${e.message}`);
    } finally {
      setLoadingCategorias(false);
    }
  };

  const handleChangeNuevoProducto = (e) => {
    const { name, value } = e.target;
    setNuevoProducto(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitNuevoProducto = async (e) => {
    e.preventDefault();
    setIsSubmittingNuevoProducto(true);
    setSubmitErrorNuevoProducto(null);

    if (!nuevoProducto.nombre || !nuevoProducto.nombre.trim()) {
        toast.error('El nombre del producto es obligatorio.');
        setSubmitErrorNuevoProducto('El nombre del producto es obligatorio.');
        setIsSubmittingNuevoProducto(false);
        return;
    }
     if (!nuevoProducto.precio) {
        toast.error('El precio del producto es obligatorio.');
        setSubmitErrorNuevoProducto('El precio del producto es obligatorio.');
        setIsSubmittingNuevoProducto(false);
        return;
    }

    const productoParaEnviar = {
        nombre: nuevoProducto.nombre.trim(),
        precio: parseFloat(nuevoProducto.precio),
        // costo: ..., // Eliminado
        categoria_id: parseInt(nuevoProducto.categoria_id, 10),
        descripcion: nuevoProducto.descripcion.trim(),
        imagen_url: nuevoProducto.imagen_url.trim() || null,
        // No se envía 'disponible' desde el frontend al crear. El backend/DB debe manejarlo.
    };

    try {
      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(productoParaEnviar),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Error ${res.status} - ${res.statusText}` }));
        throw new Error(errorData.message || 'Error al agregar producto');
      }
      const productoAgregado = await res.json();
      toast.success(`Producto "${productoAgregado.nombre || nuevoProducto.nombre}" agregado con éxito!`);
      fetchProductos(); // Recarga productos, que deberían venir con imagen_url y sin costo
      setNuevoProducto({ nombre: '', precio: '', /*costo: '',*/ categoria_id: '', descripcion: '', imagen_url: '' });
    } catch (err) {
      setSubmitErrorNuevoProducto(err.message);
      toast.error(`Error al agregar producto: ${err.message}`);
    } finally {
      setIsSubmittingNuevoProducto(false);
    }
  };

  const handleAbrirModalModificar = (producto) => {
    // producto viene de fetchProductos, debe tener imagen_url y no costo
    setProductoAEditar({
        ...producto,
        precio: producto.precio != null ? String(producto.precio) : '',
        descripcion: producto.descripcion || '',
        imagen_url: producto.imagen_url || '',
        // No se maneja 'costo'
        // 'disponible' vendrá en el objeto producto si el backend lo envía.
    });
    setIsModalOpen(true);
    setSubmitErrorModal(null);
  };

  const handleCerrarModal = () => {
    setIsModalOpen(false);
    setProductoAEditar(null);
  };

  // No se necesita manejo especial para 'disponible' aquí ya que se quitó el checkbox
  const handleInputChangeModal = (e) => {
    const { name, value } = e.target;
    setProductoAEditar(prev => ({
        ...prev,
        [name]: value
    }));
  };

  const handleGuardarCambiosProducto = async (e) => {
    e.preventDefault();
    if (!productoAEditar) return;
    setIsSubmittingModal(true);
    setSubmitErrorModal(null);

    if (!productoAEditar.nombre || !productoAEditar.nombre.trim()) {
        toast.error('El nombre del producto es obligatorio.');
        setSubmitErrorModal('El nombre del producto es obligatorio.');
        setIsSubmittingModal(false);
        return;
    }

    const datosActualizar = {
        nombre: productoAEditar.nombre.trim(),
        precio: parseFloat(productoAEditar.precio),
        // costo: ..., // Eliminado
        categoria_id: parseInt(productoAEditar.categoria_id, 10),
        descripcion: productoAEditar.descripcion.trim(),
        imagen_url: productoAEditar.imagen_url ? productoAEditar.imagen_url.trim() : null,
        // No se envía 'disponible' explícitamente desde este formulario del modal.
        // Si el backend lo necesita para actualizar, deberá recibirlo.
        // O, si no se envía, el backend no debería intentar actualizarlo o usar su valor actual.
        // Si se quiere poder editar 'disponible', se necesitaría un input y lógica aquí.
    };

    try {
      const res = await fetch(`/api/productos/${productoAEditar.producto_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosActualizar),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Error ${res.status} - ${res.statusText}` }));
        throw new Error(errorData.message || 'Error al actualizar el producto');
      }
      const productoActualizado = await res.json();
      toast.success(`Producto "${productoActualizado.nombre}" actualizado.`);
      fetchProductos(); // Recarga productos
      handleCerrarModal();
    } catch (err) {
      setSubmitErrorModal(err.message);
      toast.error(`Error al actualizar: ${err.message}`);
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleEliminarProducto = async (productoId, productoNombre) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el producto "${productoNombre}"?`)) {
      try {
        const res = await fetch(`/api/productos/${productoId}`, { method: 'DELETE' });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: `Error ${res.status} - ${res.statusText}` }));
          throw new Error(errorData.message || `Error al eliminar producto`);
        }
        toast.success(`Producto "${productoNombre}" eliminado.`);
        setProductos(prev => prev.filter(p => p.producto_id !== productoId));
      } catch (err) {
        toast.error(`Error al eliminar: ${err.message}`);
      }
    }
  };

  return (
    <div className={styles['productos-page-container']}>
      <h1>Gestión de Productos</h1>

      <div className={styles['form-container']}>
        <h2>Agregar Nuevo Producto</h2>
        <form onSubmit={handleSubmitNuevoProducto}>
          <div className={styles.formFieldGroup}>
            <label htmlFor="nombre-nuevo-producto">Nombre:</label>
            <input type="text" id="nombre-nuevo-producto" name="nombre" value={nuevoProducto.nombre} onChange={handleChangeNuevoProducto} required />
          </div>
          <div className={styles.formFieldGroup}>
            <label htmlFor="precio-nuevo-producto">Precio:</label>
            <input type="number" id="precio-nuevo-producto" name="precio" value={nuevoProducto.precio} onChange={handleChangeNuevoProducto} required min="0" step="0.01" />
          </div>
          {/* Campo Costo Eliminado */}
          <div className={styles.formFieldGroup}>
            <label htmlFor="categoria_id-nuevo-producto">Categoría:</label>
            {loadingCategorias ? <p>Cargando categorías...</p> : (
              <select id="categoria_id-nuevo-producto" name="categoria_id" value={nuevoProducto.categoria_id} onChange={handleChangeNuevoProducto} required>
                <option value="">Seleccione una categoría</option>
                {categorias.map(cat => (
                  <option key={`cat-nuevo-${cat.categoria_id}`} value={cat.categoria_id}>{cat.nombre}</option>
                ))}
              </select>
            )}
          </div>
          <div className={styles.formFieldGroup}>
            <label htmlFor="descripcion-nuevo-producto">Descripción:</label>
            <textarea id="descripcion-nuevo-producto" name="descripcion" className={styles.fixedTextarea} value={nuevoProducto.descripcion} onChange={handleChangeNuevoProducto}></textarea>
          </div>
          <div className={styles.formFieldGroup}>
            <label htmlFor="imagen_url-nuevo-producto">URL de Imagen (opcional):</label>
            <input type="text" id="imagen_url-nuevo-producto" name="imagen_url" placeholder="https://ejemplo.com/imagen.jpg" value={nuevoProducto.imagen_url} onChange={handleChangeNuevoProducto} />
          </div>
          <button type="submit" disabled={isSubmittingNuevoProducto} className={styles.submitButton}>
            {isSubmittingNuevoProducto ? 'Agregando...' : 'Agregar Producto'}
          </button>
          {submitErrorNuevoProducto && <p className={styles.error}>{submitErrorNuevoProducto}</p>}
        </form>
      </div>

      <div className={styles['tabla-container']}>
        <h2>Lista de Productos</h2>
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
                {/* Columna Disponible Eliminada <th>Disponible</th> */}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.length > 0 ? (
                productos.map(p => (
                  <tr key={p.producto_id}>
                    <td>
                      {p.imagen_url ? (
                      <img
                        src={p.imagen_url}
                        alt={p.nombre}
                        className={styles['producto-imagen-tabla']} />
                        ) : (
                        <span>Sin imagen</span>
                      )}
                    </td>
                    <td>{p.nombre}</td>
                    <td>${typeof p.precio === 'number' ? p.precio.toFixed(2) : (p.precio || 'N/D')}</td>
                    <td>{p.categoria_nombre || 'N/A'}</td>
                    {/* Celda Disponible Eliminada <td>{p.disponible ? 'Sí' : 'No'}</td> */}
                    <td>
                      <button
                        onClick={() => handleAbrirModalModificar(p)}
                        className={`${styles.btnAction} ${styles.btnModificar}`}
                      >
                        Modificar
                      </button>
                      <button
                        onClick={() => handleEliminarProducto(p.producto_id, p.nombre)}
                        className={`${styles.btnAction} ${styles.btnEliminar}`}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                // Ajustar colSpan si se eliminó la columna 'Disponible'
                <tr><td colSpan="5">No hay productos registrados.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && productoAEditar && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Modificar Producto</h2>
            <form onSubmit={handleGuardarCambiosProducto}>
              <div>
                <label htmlFor="modal-nombre">Nombre:</label>
                <input type="text" id="modal-nombre" name="nombre" value={productoAEditar.nombre} onChange={handleInputChangeModal} required />
              </div>
              <div>
                <label htmlFor="modal-precio">Precio:</label>
                <input type="number" id="modal-precio" name="precio" step="0.01" value={productoAEditar.precio} onChange={handleInputChangeModal} required />
              </div>
              {/* Campo Costo Eliminado del Modal */}
              <div>
                <label htmlFor="modal-categoria_id">Categoría:</label>
                <select id="modal-categoria_id" name="categoria_id" value={productoAEditar.categoria_id} onChange={handleInputChangeModal} required>
                  <option value="">Seleccione una categoría</option>
                  {categorias.map(cat => (
                    <option key={`cat-modal-${cat.categoria_id}`} value={cat.categoria_id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="modal-descripcion">Descripción:</label>
                <textarea id="modal-descripcion" name="descripcion" value={productoAEditar.descripcion} onChange={handleInputChangeModal}></textarea>
              </div>
              <div>
                <label htmlFor="modal-imagen_url">URL de Imagen (opcional):</label>
                <input type="text" id="modal-imagen_url" name="imagen_url" placeholder="https://ejemplo.com/imagen.jpg" value={productoAEditar.imagen_url} onChange={handleInputChangeModal} />
              </div>
              {/* Checkbox Disponible Eliminado del Modal 
              <div className={styles.formFieldGroup}>
                <label htmlFor="modal-disponible">Disponible:</label>
                <input type="checkbox" id="modal-disponible" name="disponible" checked={!!productoAEditar.disponible} onChange={handleInputChangeModal} />
              </div>
              */}
              <div className={styles.modalActions}>
                <button type="submit" disabled={isSubmittingModal}>
                  {isSubmittingModal ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button type="button" onClick={handleCerrarModal} className={styles.btnCancelar}>
                  Cancelar
                </button>
              </div>
              {submitErrorModal && <p className={styles.error}>{submitErrorModal}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Productos;