"use client"

import { useState, useEffect } from "react"
import Button from "../../../components/ui/Button/Button";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import Tables from "../../../components/ui/tables/table";
import SearchBar from "../../../components/ui/SearchBar/SearchBar";
import FormField from "../../../components/ui/FormField/FormField";
import SelectField from "../../../components/ui/SelectField/SelectField";
import { Plus } from "lucide-react"
import styles from "./productosVendedor.module.css"

export default function ProductosVendedor() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para formulario de añadir stock
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
    return ["nombre", "descripcion", "categoria", "proveedor"].some((key) =>
      String(producto[key]).toLowerCase().includes(term)
    );
  });

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
      setError(null);
    } catch (err) {
      setError(`Error al cargar productos:\n${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Obtener Proveedores
  const [proveedores, setProveedores] = useState([]);
  const fetchProveedores = async () => {
    const token = getToken();
    try {
      const res = await fetch("http://localhost:8000/api/proveedores/listar/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setProveedores(Array.isArray(data.proveedores) ? data.proveedores : []);
    } catch (err) {
      console.error("Error al cargar proveedores:", err);
      setProveedores([]);
    }
  };

  // Añadir Stock - Abrir formulario
  const handleAumentarStock = (producto) => {
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
        alert("Proveedor registrado exitosamente");
        
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
        alert("Compra realizada exitosamente");
        
        // Actualizar la lista de productos
        fetchProductos();
        
        // Cerrar el formulario
        handleCloseAñadirStockForm();
      } else {
        // Mostrar error del backend
        const errorMsg = data.detail || data.error || "Error desconocido";
        alert(`Error: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Error al realizar compra:", err);
      alert(`Error: ${err.message}`);
    }
  };

  //ver desde el inicio los productos
  useEffect(() => {
    fetchProductos();
  }, []);

  //tabla
  const columns = [
    { label: "Nombre", key: "nombre" },
    { label: "Descripción", key: "descripcion" },
    { label: "Categoría", key: "categoria" },
    { label: "Proveedor", key: "proveedor" },
    { label: "Precio", key: "precio" },
    { label: "Stock Actual", key: "stock_actual" },
    { label: "Stock Minimo", key: "stock_minimo" },
  ]

  const renderActions = (row) => (
    <div style={{ display: "flex", gap: "8px" }}>
      <Button onClick={() => handleAumentarStock(row)} variant="secondary">
        Aumentar Stock
      </Button>
    </div>
  );

  /* ====== UI ====== */
  return (
    <div className={styles.dashboardContainer}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`${styles.mainContent} ${collapsed ? styles.collapsed : ""}`}>
        <h1 className={styles.title}>Gestión de Productos</h1>

        {/* Productos */}
        <section className={styles.section}>
          <div>
            <h2>Productos ({filteredProductos.length})</h2>
            <div className={styles.headerActions}>
              {/* Puedes agregar otros botones aquí si los necesitas */}
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
      </div>
    </div>
  )
}