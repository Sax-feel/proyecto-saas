"use client"

import { useState, useEffect, useRef } from "react"
import Button from "../../../components/ui/Button/Button";
import ActionMenu from "../../../components/ui/ActionMenu/ActionMenuStock";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import Tables from "../../../components/ui/tables/table";
import styles from "./productos.module.css"
import SearchBar from "../../../components/ui/SearchBar/SearchBar";
import FormField from "../../../components/ui/FormField/FormField";
import SelectField from "../../../components/ui/SelectField/SelectField";
import Notification from "../../../components/ui/notificacion/notificacion"
import { ChevronLeft, ChevronRight, X, Plus } from "lucide-react"

export default function ProductosSection() {
  const [productos, setProductos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editIndex, setEditIndex] = useState(null)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para formularios
  const [showProductosForm, setShowProductosForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);

  // Estado para formulario de añadir stock
  const [showAñadirStockForm, setShowAñadirStockForm] = useState(false);
  const [productoParaStock, setProductoParaStock] = useState(null);
  const [stockFormData, setStockFormData] = useState({
    cantidad: "",
    precio_unitario: "",
    id_proveedor: ""
  });

  // Estado para formulario de registrar proveedor
  const [showRegistrarProveedorForm, setShowRegistrarProveedorForm] = useState(false);
  const [proveedorFormData, setProveedorFormData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    direccion: ""
  });

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    stock_actual: "",
    stock_minimo: "",
    categoria: "",
    proveedor: ""
  });

  // Carrusel de imágenes
  const [imagenesProducto, setImagenesProducto] = useState([]);
  const [showImagenesModal, setShowImagenesModal] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [indiceImagenActual, setIndiceImagenActual] = useState(0);
  const carruselRef = useRef(null);

  //Autenticacion
  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access")
    }
    return null;
  }

  //sidebar
  const [collapsed, setCollapsed] = useState(false)

  //buscador
  const [searchTerm, setSearchTerm] = useState("")
  const filteredProductos = productos.filter(producto => {
    const term = searchTerm.toLowerCase()
    return ["nombre", "descripcion", "categoria", "proveedor_nombre"].some((key) =>
      String(producto[key]).toLowerCase().includes(term)
    );
  });

  //notificaciones
  const [notifications, setNotifications] = useState([])

  const showNotification = (message, type = "warning") => {
    const id = Date.now() + Math.random()

    setNotifications(prev => [
      ...prev,
      { id, message, type }
    ])

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 4000)
  }

  //Obtener todo los productos
  const fetchProductos = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) throw new Error("No hay token");

      const res = await fetch(
        "http://localhost:8000/api/productos/mi-empresa/",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));

      const productosArray = Array.isArray(data) ? data : data.productos || []
      setProductos(productosArray);

      // 🔔 VALIDACIÓN DE STOCK
      productosArray.forEach(producto => {
        if (producto.stock_actual === 0) {
          showNotification(
            `Producto "${producto.nombre}" sin stock`,
            "error"
          )
        } else if (producto.stock_actual <= producto.stock_minimo) {
          showNotification(
            `Producto "${producto.nombre}" con stock bajo`,
            "warning"
          )
        }
      })

      setError(null);
    } catch (err) {
      setError(`Error al cargar productos:\n${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  //Obtener Categorias
  const [categorias, setCategorias] = useState([]);
  const fetchCategorias = async () => {
    const token = getToken();
    const res = await fetch("http://localhost:8000/api/categorias/mi-empresa/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setCategorias(Array.isArray(data.categorias) ? data.categorias : []);
  };

  //Obtener Proveedores
  const [proveedores, setProveedores] = useState([]);
  const fetchProveedores = async () => {
    const token = getToken();
    const res = await fetch("http://localhost:8000/api/proveedores/listar/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setProveedores(Array.isArray(data.proveedores) ? data.proveedores : []);
  };

  //formularios
  const handleProductoFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleOpenProductoForm = () => {
    fetchCategorias();
    fetchProveedores();
    setIsEditing(false);
    setProductoEditando(null);
    setFormData({
      nombre: "",
      descripcion: "",
      precio: "",
      stock_actual: "",
      stock_minimo: "",
      categoria: "",
      proveedor: ""
    });
    setShowProductosForm(true);
  };

  const handleCloseProductoForm = () => {
    setShowProductosForm(false);
    setIsEditing(false);
    setProductoEditando(null);
    setFormData({
      nombre: "",
      descripcion: "",
      precio: "",
      stock_actual: "",
      stock_minimo: "",
      categoria: "",
      proveedor: ""
    });
  };

  // Editar producto
  const handleEditarProducto = (producto) => {
    fetchCategorias();
    fetchProveedores();
    setIsEditing(true);
    setProductoEditando(producto);

    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion || "",
      precio: producto.precio,
      stock_actual: producto.stock_actual,
      stock_minimo: producto.stock_minimo,
      categoria: producto.categoria?.id_categoria || producto.categoria || "",
      proveedor: producto.proveedor_nombre,
    });

    setShowProductosForm(true);
  };

  // Añadir Stock - Abrir formulario
  const handleAñadirStock = (producto) => {
    setProductoParaStock(producto);
    fetchProveedores();
    setStockFormData({
      cantidad: "",
      precio_unitario: producto.precio || "",
      id_proveedor: ""
    });
    setShowAñadirStockForm(true);
  };

  // Cerrar formulario de añadir stock
  const handleCloseAñadirStockForm = () => {
    setShowAñadirStockForm(false);
    setProductoParaStock(null);
    setStockFormData({
      cantidad: "",
      precio_unitario: "",
      id_proveedor: ""
    });
  };

  // Manejar cambios en formulario de stock
  const handleStockFormChange = (e) => {
    setStockFormData({
      ...stockFormData,
      [e.target.name]: e.target.value,
    });
  };

  // Abrir formulario de registrar proveedor
  const handleOpenRegistrarProveedor = () => {
    setProveedorFormData({
      nombre: "",
      telefono: "",
      email: "",
      direccion: ""
    });
    setShowRegistrarProveedorForm(true);
  };

  // Cerrar formulario de registrar proveedor
  const handleCloseRegistrarProveedor = () => {
    setShowRegistrarProveedorForm(false);
    setProveedorFormData({
      nombre: "",
      telefono: "",
      email: "",
      direccion: ""
    });
  };

  // Manejar cambios en formulario de proveedor
  const handleProveedorFormChange = (e) => {
    setProveedorFormData({
      ...proveedorFormData,
      [e.target.name]: e.target.value,
    });
  };

  // Registrar nuevo proveedor
  const handleRegistrarProveedor = async (e) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!proveedorFormData.nombre.trim() || !proveedorFormData.email.trim()) {
      alert("Nombre y email son campos obligatorios");
      return;
    }

    try {
      const token = getToken();
      if (!token) throw new Error("No Autenticado");

      const res = await fetch(
        "http://localhost:8000/api/proveedores/crear/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(proveedorFormData),
        }
      );

      const data = await res.json();

      if (res.ok) {
        showNotification("Proveedor registrado exitosamente", "success");
        
        // Actualizar lista de proveedores
        fetchProveedores();
        
        // Cerrar el formulario
        handleCloseRegistrarProveedor();
        
        // Opcional: Seleccionar automáticamente el proveedor recién creado
        if (data.proveedor && data.proveedor.id_proveedor) {
          setStockFormData(prev => ({
            ...prev,
            id_proveedor: data.proveedor.id_proveedor
          }));
        }
      } else {
        alert(data.detail || data.error || "Error al registrar proveedor");
      }
    } catch (err) {
      console.error(err);
      alert("Error al registrar el proveedor");
    }
  };

  // Realizar compra de stock
  const handleRealizarCompra = async (e) => {
    e.preventDefault();

    try {
      const token = getToken();
      if (!token) throw new Error("No Autenticado");
      if (!productoParaStock) throw new Error("No hay producto seleccionado");

      const compraData = {
        detalles: [
          {
            id_producto: productoParaStock.id_producto,
            cantidad: Number(stockFormData.cantidad),
            precio_unitario: stockFormData.precio_unitario,
            id_proveedor: Number(stockFormData.id_proveedor)
          }
        ]
      };

      console.log("Datos de compra:", compraData);

      const res = await fetch("http://localhost:8000/api/compras/realizar/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(compraData),
      });

      const data = await res.json();
      console.log("Respuesta backend:", res.status, data);

      if (res.ok) {
        // Mostrar notificación de éxito
        showNotification("Compra realizada exitosamente", "success");
        
        // Actualizar la lista de productos
        fetchProductos();
        
        // Cerrar el formulario
        handleCloseAñadirStockForm();
      } else {
        // Mostrar error del backend
        const errorMsg = data.detail || data.error || "Error desconocido";
        showNotification(`Error: ${errorMsg}`, "error");
      }
    } catch (err) {
      console.error("Error al realizar compra:", err);
      showNotification(`Error: ${err.message}`, "error");
    }
  };

  //ver desde el inicio los productos
  useEffect(() => {
    fetchProductos();
  }, []);

  // Funciones para el carrusel de imágenes
  const handleOpenImagenes = async (producto) => {
    setProductoSeleccionado(producto);
    setIndiceImagenActual(0);
    
    try {
      const token = getToken();
      const res = await fetch(`http://localhost:8000/api/archivos/producto/${producto.id_producto}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const imagenesArray = Array.isArray(data) ? data : [];
      
      // Ordenar por el campo "orden" si está disponible
      if (imagenesArray.length > 0 && imagenesArray[0].orden !== undefined) {
        imagenesArray.sort((a, b) => a.orden - b.orden);
      }
      
      setImagenesProducto(imagenesArray);
      setShowImagenesModal(true);
    } catch (err) {
      console.error("Error al cargar imágenes:", err);
      setImagenesProducto([]);
      setShowImagenesModal(true);
    }
  };

  const handleSiguienteImagen = () => {
    setIndiceImagenActual((prevIndex) => 
      prevIndex === imagenesProducto.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handleAnteriorImagen = () => {
    setIndiceImagenActual((prevIndex) => 
      prevIndex === 0 ? imagenesProducto.length - 1 : prevIndex - 1
    );
  };

  const handleSeleccionarImagen = (index) => {
    setIndiceImagenActual(index);
  };

  const handleUploadImagen = async (e) => {
    e.preventDefault();
    if (!archivoSeleccionado || !productoSeleccionado) return;

    const formData = new FormData();
    formData.append("archivo", archivoSeleccionado);
    formData.append("producto", productoSeleccionado.id_producto);

    try {
      const token = getToken();
      const res = await fetch("http://localhost:8000/api/archivos/crear/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        alert("Imagen subida exitosamente");
        
        // Actualizar lista de imágenes
        const nuevasImagenes = Array.isArray(imagenesProducto) ? [...imagenesProducto, data] : [data];
        setImagenesProducto(nuevasImagenes);
        setArchivoSeleccionado(null);
      } else {
        alert(data.detail || "Error al subir imagen");
      }
    } catch (err) {
      console.error("Error al subir imagen:", err);
    }
  };

  const handleDeleteImagen = async (id) => {
    if (!confirm("¿Eliminar esta imagen?")) return;
    try {
      const token = getToken();
      const res = await fetch(`http://localhost:8000/api/archivos/${id}/gestion/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setImagenesProducto(prev => prev.filter(img => img.id_archivo !== id));
        alert("Imagen eliminada");
      } else {
        alert("Error al eliminar imagen");
      }
    } catch (err) {
      console.error("Error al eliminar imagen:", err);
    }
  };

  // Lógica para manejar teclas en el carrusel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showImagenesModal) return;
      
      if (e.key === 'ArrowLeft') {
        handleAnteriorImagen();
      } else if (e.key === 'ArrowRight') {
        handleSiguienteImagen();
      } else if (e.key === 'Escape') {
        setShowImagenesModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showImagenesModal]);

  /* ====== LÓGICA ====== */
  // Agregar Producto
  const handleAgregarProducto = async (e) => {
    e.preventDefault();

    try {
      const token = getToken();
      if (!token) throw new Error("No Autenticado");

      const res = await fetch(
        "http://localhost:8000/api/productos/crear/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            precio: Number(formData.precio),
            stock_actual: Number(formData.stock_actual),
            stock_minimo: Number(formData.stock_minimo),
            categoria: Number(formData.categoria),
            proveedor: Number(formData.proveedor),
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        showNotification("Producto registrado correctamente", "success")

        if (Number(formData.stock_actual) === 0) {
          showNotification(
            `El producto "${formData.nombre}" fue creado sin stock`,
            "error"
          )
        } else if (Number(formData.stock_actual) <= formData.stock_minimo) {
          showNotification(
            `El producto "${formData.nombre}" tiene stock bajo`,
            "warning"
          )
        }

        handleCloseProductoForm()
        fetchProductos()
      } else {
        alert(data.detail || data.error || "Error desconocido")
      }
    } catch (err) {
      console.error(err)
      alert("Error al registrar el producto")
    }
  };

  // Editar Producto
  const handleActualizarProducto = async (e) => {
    e.preventDefault();

    try {
      const token = getToken();
      if (!token) throw new Error("No Autenticado");

      const res = await fetch(`http://localhost:8000/api/productos/${productoEditando.id_producto}/gestion/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          precio: Number(formData.precio),
          stock_actual: Number(formData.stock_actual),
          stock_minimo: Number(formData.stock_minimo),
          categoria: Number(formData.categoria),
          proveedor: Number(formData.proveedor),
        }),
      });

      const data = await res.json();
      console.log("Respuesta backend:", res.status, data);

      if (res.ok) {
        showNotification("Producto actualizado exitosamente", "success")

        if (Number(formData.stock_actual) === 0) {
          showNotification(
            `Producto "${formData.nombre}" quedó sin stock`,
            "error"
          )
        } else if (Number(formData.stock_actual) <= formData.stock_minimo) {
          showNotification(
            `Producto "${formData.nombre}" tiene stock bajo`,
            "warning"
          )
        }

        alert("Producto actualizado exitosamente");
        handleCloseProductoForm();
        fetchProductos();
      } else {
        alert(data.detail || data.error || "Error al actualizar");
      }
    } catch (err) {
      console.error(err);
      alert("Error al actualizar el producto");
    }
  };

  //Eliminar Producto
  const deleteProducto = async (id) => {
    if (!confirm("¿Eliminar Producto?")) return;

    try {
      const token = getToken();
      if (!token) throw new Error("No Autenticado");

      const res = await fetch(`http://localhost:8000/api/productos/${id}/gestion/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setProductos(prev => prev.filter(p => p.id_producto !== id));
        alert("Producto eliminado correctamente");
      } else {
        const data = await res.json();
        alert(data.detail || data.error || "Error al eliminar el producto");
      }

    } catch (err) {
      console.error(err);
      alert("Error al eliminar producto");
    }
  }

  //tabla
  const columns = [
    { label: "Nombre", key: "nombre" },
    { label: "Descripción", key: "descripcion" },
    { label: "Categoría", key: "categoria" },
    { label: "Proveedor", key: "proveedor_nombre" },
    { label: "Precio", key: "precio" },
    { label: "Stock Actual", key: "stock_actual" },
    { label: "Stock Minimo", key: "stock_minimo" },
  ]

  const renderActions = (row) => (
    <div style={{ display: "flex", gap: "8px" }}>
      <ActionMenu
        id={row.id_producto}
        producto={row}
        onEliminar={() => deleteProducto(row.id_producto)}
        onEditar={() => handleEditarProducto(row)}
        onAñadirStock={() => handleAñadirStock(row)}
      />
      <Button onClick={() => handleOpenImagenes(row)} variant="secondary">
        Imágenes
      </Button>
    </div>
  );

  /* ====== UI ====== */
  return (
    <>
      <Notification notifications={notifications} />

      <div className={styles.dashboardContainer}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div className={`${styles.mainContent} ${collapsed ? styles.collapsed : ""}`}>
          <h1 className={styles.title}> Gestion de Productos</h1>

          {/* Productos */}
          <section className={styles.section}>
            <div>
              <h2>Productos ({filteredProductos.length})</h2>
              <div className={styles.headerActions}>
                <Button onClick={handleOpenProductoForm} variant="secondary">
                  + Agregar Productos
                </Button>
              </div>
            </div>

            {loading && <p>Cargando productos...</p>}
            {error && <p className={styles.errorText}>{error}</p>}

            <SearchBar
              searchTerm={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar productos por nombre, categoria, descripcion o proveedores"
              fullWidth={true}
            />

            <Tables
              columns={columns}
              data={filteredProductos}
              renderActions={renderActions}
              rowKey="id_producto"
            />

            {/* Modal de formulario (CREAR o EDITAR) */}
            {showProductosForm && (
              <div className={styles.modalOverlay}>
                <div className={styles.modal}>
                  <div className={styles.modalHeader}>
                    <h3>
                      {isEditing ? "Editar Producto" : "Registrar nuevo Producto"}
                    </h3>

                    <form onSubmit={isEditing ? handleActualizarProducto : handleAgregarProducto}>
                      <FormField
                        type="text"
                        name="nombre"
                        label="Nombre del Producto"
                        placeholder="Nombre del Producto"
                        value={formData.nombre}
                        onChange={handleProductoFormChange}
                        required
                      />
                      <FormField
                        type="text"
                        name="descripcion"
                        label="Descripción"
                        placeholder="Máximo 250 caracteres"
                        value={formData.descripcion}
                        onChange={handleProductoFormChange}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                        <FormField
                          type="number"
                          name="precio"
                          label="Precio"
                          value={formData.precio}
                          onChange={handleProductoFormChange}
                          required
                        />
                        <FormField
                          type="number"
                          name="stock_actual"
                          label="Stock Actual"
                          value={formData.stock_actual}
                          onChange={handleProductoFormChange}
                          required
                        />
                        <FormField
                          type="number"
                          name="stock_minimo"
                          label="Stock Mínimo"
                          value={formData.stock_minimo}
                          onChange={handleProductoFormChange}
                          required
                        />
                      </div>
                      <SelectField
                        label="Categoría"
                        name="categoria"
                        value={formData.categoria}
                        onChange={handleProductoFormChange}
                        options={categorias.map(c => ({
                          value: c.id_categoria,
                          label: c.nombre
                        }))}
                        required
                      />
                      <SelectField
                        label="Proveedor"
                        name="proveedor"
                        value={formData.proveedor}
                        onChange={handleProductoFormChange}
                        options={proveedores.map(p => ({
                          value: p.id_proveedor,
                          label: p.nombre
                        }))}
                        required
                      />
                      <div className={styles.modalActions}>
                        <Button type="submit" variant="primary">
                          {isEditing ? "Actualizar" : "Guardar"}
                        </Button>
                        <Button type="button" variant="secondary" onClick={handleCloseProductoForm}>
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Modal para Añadir Stock */}
            {showAñadirStockForm && productoParaStock && (
              <div className={styles.modalOverlay}>
                <div className={styles.modal}>
                  <div className={styles.modalHeader}>
                    <h3>Añadir Stock a: {productoParaStock.nombre}</h3>
                    <p>Stock actual: {productoParaStock.stock_actual}</p>
                    
                    <form onSubmit={handleRealizarCompra}>
                      <FormField
                        type="number"
                        name="cantidad"
                        label="Cantidad a comprar"
                        placeholder="Ej: 10"
                        value={stockFormData.cantidad}
                        onChange={handleStockFormChange}
                        required
                        min="1"
                      />
                      
                      <FormField
                        type="number"
                        name="precio_unitario"
                        label="Precio unitario de compra"
                        placeholder="Ej: 25.50"
                        value={stockFormData.precio_unitario}
                        onChange={handleStockFormChange}
                        required
                        step="0.01"
                        min="0.01"
                      />
                      
                      <div className={styles.proveedorContainer}>
                        <div className={styles.proveedorSelectRow}>
                          <SelectField
                            label="Proveedor"
                            name="id_proveedor"
                            value={stockFormData.id_proveedor}
                            onChange={handleStockFormChange}
                            options={[
                              { value: "", label: "Seleccionar proveedor..." },
                              ...proveedores.map(p => ({
                                value: p.id_proveedor,
                                label: p.nombre
                              }))
                            ]}
                            required
                          />
                          <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={handleOpenRegistrarProveedor}
                            className={styles.registrarProveedorButton}
                          >
                            <Plus size={16} />
                            Registrar Proveedor
                          </Button>
                        </div>
                      </div>
                      
                      <div className={styles.modalActions}>
                        <Button type="submit" variant="primary">
                          Realizar Compra
                        </Button>
                        <Button 
                          type="button" 
                          variant="secondary" 
                          onClick={handleCloseAñadirStockForm}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Modal para Registrar Proveedor */}
            {showRegistrarProveedorForm && (
              <div className={styles.modalOverlay}>
                <div className={styles.modal}>
                  <div className={styles.modalHeader}>
                    <h3>Registrar Nuevo Proveedor</h3>
                  </div>
                  
                  <form onSubmit={handleRegistrarProveedor}>
                    <FormField
                      label="Nombre *"
                      name="nombre"
                      value={proveedorFormData.nombre}
                      onChange={handleProveedorFormChange}
                      required
                      placeholder="Ej: Distribuidora XYZ"
                    />
                    <FormField
                      label="Email *"
                      type="email"
                      name="email"
                      value={proveedorFormData.email}
                      onChange={handleProveedorFormChange}
                      required
                      placeholder="ejemplo@proveedor.com"
                    />
                    <FormField
                      label="Teléfono"
                      type="tel"
                      name="telefono"
                      value={proveedorFormData.telefono}
                      onChange={handleProveedorFormChange}
                      placeholder="77777777"
                    />
                    <FormField
                      label="Dirección"
                      name="direccion"
                      value={proveedorFormData.direccion}
                      onChange={handleProveedorFormChange}
                      placeholder="Calle Principal #123"
                    />
                    
                    <div className={styles.modalActions}>
                      <Button type="submit" variant="primary">
                        Registrar Proveedor
                      </Button>
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={handleCloseRegistrarProveedor}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </section>

          {/* Modal del carrusel de imágenes */}
          {showImagenesModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.carruselModal}>
                <div className={styles.carruselHeader}>
                  <h3>Imágenes de {productoSeleccionado?.nombre}</h3>
                  <Button 
                    onClick={() => setShowImagenesModal(false)} 
                    variant="secondary"
                    className={styles.closeButton}
                  >
                    <X size={20} />
                  </Button>
                </div>

                <div className={styles.carruselContainer}>
                  {imagenesProducto.length > 0 ? (
                    <>
                      <div className={styles.imagenPrincipalContainer}>
                        <Button 
                          onClick={handleAnteriorImagen}
                          variant="secondary"
                          className={styles.navButton}
                          disabled={imagenesProducto.length <= 1}
                        >
                          <ChevronLeft size={24} />
                        </Button>
                        
                        <div className={styles.imagenPrincipal}>
                          <img 
                            src={imagenesProducto[indiceImagenActual]?.archivo} 
                            alt={`Imagen ${indiceImagenActual + 1} de ${productoSeleccionado?.nombre}`}
                            className={styles.imagen}
                          />
                        </div>
                        
                        <Button 
                          onClick={handleSiguienteImagen}
                          variant="secondary"
                          className={styles.navButton}
                          disabled={imagenesProducto.length <= 1}
                        >
                          <ChevronRight size={24} />
                        </Button>
                      </div>

                      <div className={styles.contador}>
                        {indiceImagenActual + 1} / {imagenesProducto.length}
                      </div>

                      {imagenesProducto.length > 1 && (
                        <div className={styles.miniaturasContainer}>
                          {imagenesProducto.map((img, index) => (
                            <button
                              key={img.id_archivo}
                              onClick={() => handleSeleccionarImagen(index)}
                              className={`${styles.miniatura} ${index === indiceImagenActual ? styles.miniaturaActiva : ''}`}
                            >
                              <img 
                                src={img.archivo} 
                                alt={`Miniatura ${index + 1}`}
                                className={styles.miniaturaImagen}
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      <div className={styles.imagenInfo}>
                        <Button 
                          onClick={() => handleDeleteImagen(imagenesProducto[indiceImagenActual]?.id_archivo)}
                          variant="danger"
                          size="small"
                          className={styles.deleteImageButton}
                        >
                          Eliminar Imagen
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className={styles.sinImagenes}>
                      <p>No hay imágenes para este producto</p>
                    </div>
                  )}

                  <div className={styles.uploadSection}>
                    <h4>Subir nueva imagen</h4>
                    <form onSubmit={handleUploadImagen}>
                      <input 
                        type="file" 
                        onChange={(e) => setArchivoSeleccionado(e.target.files[0])}
                        accept="image/*"
                        className={styles.fileInput}
                      />
                      <Button type="submit" variant="primary">
                        Subir Imagen
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}