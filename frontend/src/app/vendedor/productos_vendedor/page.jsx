"use client"

import { useState, useEffect } from "react"
import Button from "../../../components/ui/Button/Button";
import ActionMenu from "../../../components/ui/ActionMenu/ActionMenu";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import Tables from "../../../components/ui/tables/table";
import styles from "./productosVendedor.module.css"
import SearchBar from "../../../components/ui/SearchBar/SearchBar";

export default function ProductosVendedor() {
  const [productos, setProductos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editIndex, setEditIndex] = useState(null)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para formularios
  const [showProductosForm, setShowProductosForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Nuevo estado para saber si estamos editando
  const [productoEditando, setProductoEditando] = useState(null); // Producto que se está editando

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    stock_actual: "",
    stock_minimo: "",
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
    return ["nombre", "descripcion", "categoria", "proveedor"].some((key) =>
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

  //Aumentar STOCK
  const handleAumentarStock = async (producto) => {
    const cantidad = parseInt(prompt("Cantidad a agregar al stock:"));
    const precio = prompt("Precio unitario:");

    if (!cantidad || cantidad <= 0 || !precio) {
      showNotification("Datos inválidos", "error");
      return;
    }

    try {
      const token = getToken();

      const res = await fetch("http://localhost:8000/api/compras/realizar/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          detalles: [
            {
              id_producto: producto.id_producto,
              cantidad: cantidad,
              precio_unitario: precio,
            },
          ],
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Error al aumentar stock");

      showNotification("Stock aumentado correctamente", "success");

      fetchProductos();

    } catch (err) {
      showNotification(err.message, "error");
    }
  };


  //Obtener Proveedores
  const [proveedores, setProveedores] = useState([]);
  const fetchProveedores = async () => {
    const token = getToken();
    const res = await fetch("http://localhost:8000/api/proveedores/public/listar/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setProveedores(Array.isArray(data.proveedores) ? data.proveedores : []);
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
          <h1 className={styles.title}> Gestion de Productos</h1>

          {/* Productos */}
          <section className={styles.section}>
            <div>
              <h2>Productos ({filteredProductos.length})</h2>
              <div className={styles.headerActions}>
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
            </section>
        </div>
      </div>
  )
}