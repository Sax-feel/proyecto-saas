"use client";

import { useState, useEffect } from "react";
import {Trash2} from "lucide-react"
import styles from "./ventas.module.css";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import SearchBar from "../../../components/ui/SearchBar/SearchBar";
import Tables from "../../../components/ui/tables/table";

export default function DashboardVentas(){
    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState(false);
    const [error, setError] = useState(null);

//token
const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("access") : null;

//Buscador
const [searchTerm, setSearchTerm] = useState("")
const filteredVentas = ventas.filter(v => {
  const term = searchTerm.toLowerCase();
  return (
    v.cliente_info?.nombre?.toLowerCase().includes(term) ||
    v.empresa_info?.nombre?.toLowerCase().includes(term) ||
    v.vendedor_info?.email?.toLowerCase().includes(term)
  );
});

//Formato de FECHA
const formatDate = (dateString) => {
  if (!dateString) return "-";
  const dateObj = new Date(dateString);
  return isNaN(dateObj.getTime()) 
    ? "-" 
    : dateObj.toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

//Obtener las Ventas
const fetchVentas = async () => {
    setLoading(true);
    try {
        const token = getToken();
        if(!token) throw new Error ("No hay Token");

        const res = await fetch(
            "http://localhost:8000/api/ventas/listar-ventas/",
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));

        const ventasArray = data.ventas
        setVentas(ventasArray)

        setError(null);
    } catch (err) {
        setError(`Error al cargar productos:\n${err.message}`);
    } finally {
        setLoading(false);
    }
};

//Eliminar Venta
const handleEliminarVenta = async (id) => {
  const confirmar = window.confirm(
    "¿Estás seguro de eliminar esta venta?\nEsta acción no se puede deshacer."
  );
  if (!confirmar) return;

  try {
    const token = getToken();
    if (!token) throw new Error("No autenticado");

    const res = await fetch(`http://localhost:8000/api/ventas/${id}/eliminar/`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (res.ok) {
      setVentas(prev => prev.filter(v => v.id_venta !== id));
      alert(data.message || "Venta eliminada correctamente");
    } else {
      alert(data.detail || data.error || "Error al eliminar la venta");
    }

  } catch (err) {
    alert(err.message);
  }
};

//recarga
useEffect(() => {
    fetchVentas();
}, []);

//tabla
const columns = [
  {
    label: "Detalles",
    key: "detalles",
    render: row => (
      row.detalles_venta?.map(d => (
        <div key={d.id_producto}>
          {d.producto_nombre} / Cant: {d.cantidad} / Categoria: {d.categoria}Bs
        </div>
      )) || "-"
    )
  },
  {
    label: "Vendedor",
    key: "vendedor_email",
    render: (row) => row.vendedor_info?.email || "-"
  },
  {
    label: "Cliente",
    key: "cliente_info.nombre",
    render: (row) => row.cliente_info?.nombre || "-"
  },
  {
    label: "Fecha de la Venta",
    key: "fecha_venta",
  },
  {
    label: "Precio Total",
    key: "precio_total",
  },
  {
    label: "Empresa",
    key: "empresa_info.nombre",
    render: (row) => row.empresa_info?.nombre || "-"
  },
  {
    label: "Acciones",
    key: "acciones",
    render: (row) => (
      <button
        onClick={() => handleEliminarVenta(row.id_venta)}
        title="Eliminar venta"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#e53935",
          fontSize: "18px",
        }}
      >
        <Trash2 />
      </button>
    )
  },

];

return(
    <div className={styles.dashboardContainer}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`${styles.mainContent} ${collapsed ? styles.collapsed : ""}`}>
        <h1 className={styles.title}>Dashboard Ventas</h1>

            {/* ---------------- CLIENTES ---------------- */}
            <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2>Ventas ({filteredVentas.length})</h2>
                <div className={styles.headerActions}>
                </div>
            </div>

            <SearchBar
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar clientes por nombre del cliente o por nombre de la empresa..."
                fullWidth={true}
            />

            <Tables
                columns={columns}
                data={filteredVentas}
                rowKey="id_venta"
            />
            </section>
        </div>
    </div>
    );
}