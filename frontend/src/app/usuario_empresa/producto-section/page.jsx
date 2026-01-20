"use client"

import { useState, useEffect } from "react"
import Button from "../../../components/ui/Button/Button";
import ActionMenu from "../../../components/ui/ActionMenu/ActionMenu";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import Tables from "../../../components/ui/tables/table";
import styles from "./productos.module.css"
import SearchBar from "../../../components/ui/SearchBar/SearchBar";
import FormField from "../../../components/ui/FormField/FormField";
import SelectField from "../../../components/ui/SelectField/SelectField";
import EditForm from "../../../components/ui/EditForm/EditForm";
import Notification from "../../../components/ui/notificacion/notificacion"

export default function ProductosSection() {
  const [productos, setProductos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editIndex, setEditIndex] = useState(null)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProductosForm, setShowProductosForm] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    stock_actual: "",
    categoria: "",
    proveedor: ""
  });

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
    return ["nombre", "descripcion", "categoria","proveedor"].some((key) =>
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
        "http://localhost:8000/api/productos/listar/",
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
        } else if (producto.stock_actual <= 5) {
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
    const res = await fetch("http://localhost:8000/api/categorias/listar/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    //console.log("Data categorias:", data[1]);
    setCategorias(Array.isArray(data) ? data : []);
  };

  //Obtener Proveedores
  const [proveedores, setProveedores] = useState([]);
  const fetchProveedores = async () => {
    const token = getToken();
    const res = await fetch("http://localhost:8000/api/proveedores/public/listar/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log("Data proveedores:", data);
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
    setShowProductosForm(true);
  };
  const handleCloseProductoForm = () => {
    setShowProductosForm(false);
    setFormData({  nombre: "", descripcion: "", precio: "", stock_actual: "", categoria: "", proveedor: ""})
  }

  //ver desde el inicio los productos
  useEffect(() => {
    fetchProductos();
  }, []);

  //Imagenes
  const [imagenesProducto, setImagenesProducto] = useState([]);
  const [showImagenesModal, setShowImagenesModal] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);

  const handleOpenImagenes = async (producto) => {
    setProductoSeleccionado(producto);
    setShowImagenesModal(true);

    // Obtener imágenes existentes del producto
    try {
      const token = getToken();
      const res = await fetch(`http://localhost:8000/api/archivos/producto/${producto.id_producto}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setImagenesProducto(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar imágenes:", err);
      setImagenesProducto([]);
    }
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
        setImagenesProducto(prev => [...prev, data]);
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

  /* ====== LÓGICA ====== */
  // Agregar Producto
  const handleAgregarProducto = async (e) => {
    e.preventDefault();

    try {
      const token = getToken();
      if (!token) throw new Error ("No Autenticado");

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
        } else if (Number(formData.stock_actual) <= 5) {
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
    { label: "Proveedor", key: "proveedor" },
    { label: "Precio", key: "precio" },
    { label: "Stock Actual", key: "stock_actual" },
  ]

  //Editar Productos
  const [editForm, setEditForm] = useState({});
  const [editingProducto, setEditingProducto] = useState(null);
  
  const renderActions = (row) => (
    <div style={{ display: "flex", gap: "8px" }}>
      <ActionMenu
        id={row.id_producto}
        onEliminar={() => deleteProducto(row.id_producto)}
        onEditar={() => {
          setEditingProducto(row);
          setFormData({
            nombre: row.nombre,
            descripcion: row.descripcion,
            precio: row.precio,
            stock_actual: row.stock_actual,
            categoria: row.categoria?.id_categoria || row.categoria || "",
            proveedor: row.proveedor?.id_proveedor || row.proveedor || "",
          });
          fetchCategorias();
          fetchProveedores();
        }}
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

            {showProductosForm && (
              <div className={styles.modalOverlay}>
                <div className={styles.modal}>
                  <div className={styles.modalHeader}>
                  <h3> Registrar nuevo Producto </h3>
                    <form onSubmit={handleAgregarProducto}>
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
                        label="Descripcion"
                        placeholder="Maximo 250 caracteres"
                        value={formData.descripcion}
                        onChange={handleProductoFormChange}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <FormField
                          type="number"
                          name="precio"
                          label="Precio"
                          value={formData.precio}
                          onChange={handleProductoFormChange}
                        />
                        <FormField
                          type="number"
                          name="stock_actual"
                          label="Stock Actual"
                          value={formData.stock_actual}
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
                        <Button type="submit" variant="primary">Guardar</Button>
                        <Button type="button" variant="secondary" onClick={handleCloseProductoForm}>Cancelar</Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )
            }
          </section>

      {/* Editar Producto */}
      {editingProducto && (
        <EditForm
          data={formData}
          fields={[
            { name: "nombre", label: "Nombre Producto" },
            { name: "descripcion", label: "Descripcion" },
            { name: "precio", label: "Precio" },
            { name: "stock_actual", label: "Stock Actual" },
            { 
              name: "categoria", 
              label: "Categoria", 
              type: "select", 
              options: categorias.map(c => ({value: c.id_categoria, label: c.nombre}))
            },
            { 
              name: "proveedor", 
              label: "Proveedor", 
              type: "select", 
              options: proveedores.map(p => ({value: p.id_proveedor, label: p.nombre}))
            },
          ]}
          onSave={async (updatedData) => {
            try {
              const token = getToken();
              const res = await fetch(`http://localhost:8000/api/productos/${editingProducto.id_producto}/gestion/`, {
                method: "PUT",
                headers: { 
                  Authorization: `Bearer ${token}`, 
                  "Content-Type": "application/json" 
                },
                body: JSON.stringify({
                  nombre: updatedData.nombre,
                  descripcion: updatedData.descripcion,
                  precio: Number(updatedData.precio),
                  stock_actual: Number(updatedData.stock_actual),
                  categoria: Number(updatedData.categoria),
                  proveedor: Number(updatedData.proveedor),
                }),
              });

              const data = await res.json();
              console.log("Respuesta backend:", res.status, data);

              if (res.ok) {
                showNotification("Producto actualizado exitosamente", "success")

                if (Number(updatedData.stock_actual) === 0) {
                  showNotification(
                    `Producto "${updatedData.nombre}" quedó sin stock`,
                    "error"
                  )
                } else if (Number(updatedData.stock_actual) <= 5) {
                  showNotification(
                    `Producto "${updatedData.nombre}" tiene stock bajo`,
                    "warning"
                  )
                }

                alert("Producto actualizado exitosamente");
                setEditingProducto(null);
                setFormData({
                  nombre: "",
                  descripcion: "",
                  precio: "",
                  stock_actual: "",
                  categoria: "",
                  proveedor: ""
                });
                fetchProductos();
              } else {
                alert(data.detail || data.error || "Error al actualizar");
              }
            } catch (err) {
              console.error(err);
              alert("Error al actualizar el producto");
            }
          }}
          onCancel={() => {
            setEditingProducto(null);
            setFormData({
              nombre: "",
              descripcion: "",
              precio: "",
              stock_actual: "",
              categoria: "",
              proveedor: ""
            });
          }}
        />
      )}

      {showImagenesModal && (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3>Imágenes de {productoSeleccionado.nombre}</h3>

        <div>
          {imagenesProducto.map(img => (
            <div key={img.id_archivo} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <img src={`http://localhost:8000${img.archivo}`} alt="" width="80" />
              <Button onClick={() => handleDeleteImagen(img.id_archivo)} variant="secondary">Eliminar</Button>
            </div>
          ))}
        </div>

        <form onSubmit={handleUploadImagen}>
          <input type="file" onChange={(e) => setArchivoSeleccionado(e.target.files[0])} />
          <Button type="submit" variant="primary">Subir Imagen</Button>
        </form>

        <Button onClick={() => setShowImagenesModal(false)} variant="secondary">Cerrar</Button>
      </div>
    </div>
  )}

    </div>
    </div>
  </>
)}
