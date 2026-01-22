"use client";

import { useState, useEffect } from "react";
import styles from "./ventas.module.css";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import SearchBar from "../../../components/ui/SearchBar/SearchBar";
import Tables from "../../../components/ui/tables/table";

export default function DashboardVentas(){
    const [ventas, setVentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [collapsed, setCollapsed] = useState(false);
    const [error, setError] = useState(null);

//Guardar Datos
const [ventaData, setVentaData] = useState({
    id_venta: "",
    usuario_empresa: "",
    cliente: "",
    fecha_venta: "",
    precio_total: "",
    cliente_info: "",
    vendedor_info: "",
    empresa_info: ""
});

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

        console.log(data.ventas)
        const ventasArray = data.ventas
        console.log("arraty",ventasArray[0].cliente_info.nombre)
        console.log(typeof ventasArray)
        setVentas(ventasArray)
        console.log("v", ventas);

        setError(null);
    } catch (err) {
        setError(`Error al cargar productos:\n${err.message}`);
    } finally {
        setLoading(false);
    }
};

//recarga
useEffect(() => {
    fetchVentas();
}, []);

//tabla
const columns = [
  {
    label: "Vendedor",
    key: ".vendedor_info.email",
  },
  {
    label: "Cliente",
    key: "cliente_info.nombre",
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