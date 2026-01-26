"use client"

import { useState, useEffect } from "react"
import Button from "../../../components/ui/Button/Button";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import Tables from "../../../components/ui/tables/table";
import SearchBar from "../../../components/ui/SearchBar/SearchBar";
import styles from "./Compras.module.css"

export default function ComprasSection() {
    const [compras, setCompras] = useState([])
    const [estadisticas, setEstadisticas] = useState(null)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Autenticacion
    const getToken = () => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("access")
        }
        return null;
    }

    // sidebar
    const [collapsed, setCollapsed] = useState(false)

    // buscador
    const [searchTerm, setSearchTerm] = useState("")

    // Filtrar compras
    const filteredCompras = compras.filter(compra => {
        if (!searchTerm) return true;

        const term = searchTerm.toLowerCase()

        // Buscar en diferentes campos
        const camposBusqueda = [
            compra.id_compra?.toString() || "",
            compra.precio_total?.toString() || "",
            compra.empresa_info?.nombre || "",
            compra.empresa_info?.nit || "",
            compra.vendedor_info?.email || "",
            // Buscar en detalles de compra
            ...(compra.detalles_compra || []).map(detalle =>
                detalle.producto_nombre || ""
            )
        ].join(" ").toLowerCase()

        return camposBusqueda.includes(term)
    })

    // Obtener Compras
    const fetchCompras = async () => {
        setLoading(true);
        try {
            const token = getToken();
            if (!token) throw new Error("No hay token");

            const res = await fetch("http://localhost:8000/api/compras/listar/", {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();
            console.log("Datos de compras:", data);

            if (!res.ok) throw new Error(data.detail || "Error al cargar compras");

            setCompras(Array.isArray(data.compras) ? data.compras : []);
            setEstadisticas(data.estadisticas || null);
            setError(null);
        } catch (err) {
            setError(`Error al cargar compras: ${err.message}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Ver desde el inicio las compras
    useEffect(() => {
        fetchCompras();
    }, []);

    // Formatear fecha
    const formatFecha = (fechaString) => {
        if (!fechaString) return "-";
        try {
            const fecha = new Date(fechaString);
            return fecha.toLocaleDateString("es-ES", {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (err) {
            return fechaString;
        }
    };

    // Formatear moneda
    const formatMoneda = (monto) => {
    // Validar si el monto es nulo o indefinido
    if (monto === null || monto === undefined) return "Bs 0.00";

    const numero = typeof monto === 'string' ? parseFloat(monto) : monto;

    // Si después de intentar convertir no es un número válido
    if (isNaN(numero)) return "Bs 0.00";

    return new Intl.NumberFormat('es-BO', {
        style: 'currency',
        currency: 'BOB',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numero).replace('BOB', 'Bs'); 
    // Usamos replace porque a veces el navegador renderiza "BOB" en lugar del símbolo
};

    // Obtener información resumida de productos

    const getProductosResumen = (detalles) => {
        console.log("detalles", detalles)
        if (!detalles.detalles_compra || detalles.detalles_compra.length === 0) return "Sin productos";

        const nombres = detalles.detalles_compra.map(d => d.producto_nombre || "Producto").join(", ");
        return nombres.length > 50 ? nombres.substring(0, 50) + "..." : nombres;
    };

    // tabla - Sin columna de acciones
    const columns = [
        {
            label: "Fecha",
            key: "fecha",
            render: (value) => formatFecha(value.fecha)
        },
        {
            label: "Precio de Compra",
            key: "precio_compra",
            render: (value) => formatMoneda(value.detalles_compra.map(d => d.precio_unitario) || "-")
        },
        {
            label: "Cantidad",
            key: "cantidad",
            render: (value) => value.detalles_compra.map(d => d.cantidad) || "-"
        },
        {
            label: "Total",
            key: "precio_total",
            render: (value) => formatMoneda(value.precio_total)
        },
        {
            label: "Proveedor",
            key: "proveedor_info",
            render: (value) => value.detalles_compra.map(d => d.proveedor_info.email) || "-"
        },
        {
            label: "Responsable",
            key: "vendedor_info",
            render: (value) => value.vendedor_info?.email || "-"
        },
        {
            label: "Productos",
            key: "detalles_compra",
            render: (value) => value.detalles_compra.map(d => d.producto_nombre) || "-"
        },
    ];

    /* ====== UI ====== */
    return (
        <div className={styles.dashboardContainer}>
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
            <div className={`${styles.mainContent} ${collapsed ? styles.collapsed : ""}`}>
                <h1 className={styles.title}>Historial de Compras</h1>
                {/* Compras */}
                <section className={styles.section}>
                    <div>
                        <h2>Compras Realizadas ({filteredCompras.length})</h2>
                        <div className={styles.headerActions}>
                            <Button onClick={fetchCompras} variant="secondary">
                                ↻ Actualizar
                            </Button>
                        </div>
                    </div>

                    {loading && (
                        <div className={styles.loadingContainer}>
                            <p>Cargando compras...</p>
                        </div>
                    )}

                    {error && (
                        <div className={styles.errorContainer}>
                            <p className={styles.errorText}>{error}</p>
                            <Button onClick={fetchCompras} variant="primary">
                                Reintentar
                            </Button>
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            <SearchBar
                                searchTerm={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por ID, producto, empresa, vendedor..."
                                fullWidth={true}
                            />

                            <Tables
                                columns={columns}
                                data={filteredCompras}
                                renderActions={null} // No renderizamos acciones
                                emptyMessage="No se encontraron compras"
                                rowKey="id_compra"
                            />
                        </>
                    )}
                </section>
            </div>
        </div>
    )
}