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
const filteredProductos = ventas.filter(ventas => {
    const term = searchTerm.toLowerCase()
    return ["cliente", "fecha_venta", "usuario_empresa"].some((key) =>
      String(ventas[key]).toLowerCase().includes(term)
    );
});

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

        const ventasArray = Array.isArray(data) ? data : data.ventas || []
        setVentas(ventasArray)
        setError(null);
    } catch (err) {
        setError(`Error al cargar productos:\n${err.message}`);
    } finally {
        setLoading(false);
    }
}

//recarga
useEffect(() => {
    fetchVentas();
}, []);

//tabla
const columns = [
    { key: "usuario_empresa", label: "Usuario de Empresa"},
    { key: "cliente", label:"Cliente"},
    { key: "fecha_venta", label:"Fecha de Venta"},
    { key: "precio_total", label:"Precio Total"},
    { key: "cliente_info", label:"Informacion del Cliente"},
    { key: "vendedor_info", label:"Informacion del Vendedor"},
    { key: "empresa_info", label:"Informacion de la Empresa"},
]

return(
    <div className={styles.dashboardContainer}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`${styles.mainContent} ${collapsed ? styles.collapsed : ""}`}>
        <h1 className={styles.title}>Dashboard Ventas</h1>

            {/* ---------------- CLIENTES ---------------- */}
            <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2>Ventas ({filteredProductos.length})</h2>
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
                data={filteredProductos}
                rowKey="id_producto"
            />
            </section>
        </div>
    </div>
    );
}