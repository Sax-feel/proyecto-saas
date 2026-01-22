"use client";

import { useState, useEffect } from "react";
import {Trash2} from "lucide-react"
import styles from "./historial.module.css";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import SearchBar from "../../../components/ui/SearchBar/SearchBar";
import Tables from "../../../components/ui/tables/table";

export default function DashboardHistorial(){
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState(false);
    const [error, setError] = useState(null);

//token
const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("access") : null;

//Buscador
const [searchTerm, setSearchTerm] = useState("")
const filteredHistorial = (historial || []).filter(h => {
    const term = searchTerm.toLowerCase();
    return (
        h.empresa_info?.nombre?.toLowerCase().includes(term) ||
        h.vendedor_info?.email?.toLowerCase().includes(term)
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

//Obtener las Historial
const fetchVentas = async () => {
    setLoading(true);
    try {
        const token = getToken();
        if(!token) throw new Error ("No hay Token");

        const res = await fetch(
            "http://localhost:8000/api/compras/listar/",
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(JSON.stringify(data));

        const historialArray = data.compras || [];
        setHistorial(historialArray)

        setError(null);
    } catch (err) {
        setError(`Error al cargar productos:\n${err.message}`);
    } finally {
        setLoading(false);
    }
};

//Eliminar Historia
const handleEliminarVenta = async (id) => {
  const confirmar = window.confirm(
    "¿Estás seguro de eliminar el historial ?\nEsta acción no se puede deshacer."
  );
  if (!confirmar) return;

  try {
    const token = getToken();
    if (!token) throw new Error("No autenticado");

    const res = await fetch(`http://localhost:8000/api/compras/${id}/eliminar/`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (res.ok) {
      setHistorial(prev => prev.filter(h => h.id_compra !== id));
      alert(data.message || "Historia eliminada correctamente");
    } else {
      alert(data.detail || data.error || "Error al eliminar la compra");
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
        label: "Precio Total",
        key: "precio_total",
    },
    {
        label: "Fecha del Historial",
        key: "fecha",
    },
    {
        label: "Detalles",
        key: "detalles",
        render: row => (
            row.detalles_compra?.map(d => (
                <div key={d.id_producto}>
                    {d.producto_nombre} / Cant: {d.cantidad} / Unit: {d.precio_unitario}Bs
                </div>
            )) || "-"
        )
    },
    {
        label: "Vendedor",
        key: "vendedor_info.email",
        render: (row) => row.vendedor_info?.email || "-"
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
            onClick={() => handleEliminarVenta(row.id_compra)}
            title="Eliminar Historial"
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
        <h1 className={styles.title}>Dashboard Historial</h1>

            {/* ---------------- CLIENTES ---------------- */}
            <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2>Historial ({filteredHistorial.length})</h2>
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
                data={filteredHistorial}
                rowKey="id_compra"
            />
            </section>
        </div>
    </div>
    );
}