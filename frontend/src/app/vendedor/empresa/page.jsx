"use client"

import { useState, useEffect } from "react"
import Sidebar from "../../../components/layout/Sidebar/Sidebar"
import { Building2, Mail, Phone, MapPin, FileText, Globe, Lock, Edit, Save, X, Trash2, AlertTriangle, ChartColumnIncreasing, Info, CalendarCheck, Loader2 } from "lucide-react"
import Button from "../../../components/ui/Button/Button"
import Input from "../../../components/ui/Input/Input"
import DataCard from "../../../components/ui/DataCard/DataCard"
import styles from "./Empresa.module.css"

export default function EmpresaPage() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [saving, setSaving] = useState(false)


    // Estado para la empresa
    const [empresa, setEmpresa] = useState(null)
    const [tempEmpresa, setTempEmpresa] = useState(null)

    // ------------------- FUNCIONES -------------------
    const getToken = () => localStorage.getItem("access")

    // 1. Obtener la empresa del usuario
    const fetchMiEmpresa = async () => {
        setLoading(true)
        setError(null)
        try {
            const token = getToken()
            const res = await fetch("http://localhost:8000/api/empresas/mi-empresa/", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
            })

            if (!res.ok) {
                throw new Error(`Error ${res.status}: ${res.statusText}`)
            }

            const data = await res.json()
            setEmpresa(data)
            setTempEmpresa(data)
        } catch (err) {
            console.error("Error al cargar empresa:", err)
            setError("No se pudo cargar la información de la empresa")
        } finally {
            setLoading(false)
        }
    }

    // Cargar datos al montar el componente
    useEffect(() => {
        fetchMiEmpresa()
    }, [])

    // Funciones para editar y cancelar
    const handleEdit = () => {
        setIsEditing(true)
        setTempEmpresa({ ...empresa })
    }

    const handleCancel = () => {
        setTempEmpresa({ ...empresa })
        setIsEditing(false)
        setError(null)
    }

    // Si está cargando
    if (loading) {
        return (
            <div className={styles.dashboardContainer}>
                <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
                <div className={`${styles.mainContent} ${sidebarCollapsed ? styles.collapsed : ""}`}>
                    <div className={styles.loadingContainer}>
                        <p>Cargando información de la empresa...</p>
                    </div>
                </div>
            </div>
        )
    }

    // Si hay error
    if (error || !empresa) {
        return (
            <div className={styles.dashboardContainer}>
                <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
                <div className={`${styles.mainContent} ${sidebarCollapsed ? styles.collapsed : ""}`}>
                    <div className={styles.errorContainer}>
                        <AlertTriangle size={48} className={styles.errorIcon} />
                        <h2>Error al cargar la empresa</h2>
                        <p>{error || "No se encontró información de la empresa"}</p>
                        <Button onClick={fetchMiEmpresa} className={styles.retryButton}>
                            Reintentar
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Datos estáticos para la sección Resumen
    const resumenData = [
        { label: "Empresa", value: empresa.nombre, icon: Building2 },
        { label: "Email", value: empresa.email, icon: Mail },
        { label: "Teléfono", value: empresa.telefono, icon: Phone },
        { label: "Dirección", value: empresa.direccion, icon: MapPin },
        { label: "NIT", value: empresa.nit, icon: FileText },
        { label: "Estado", value: empresa.estado, icon: Lock },
        { label: "Fecha creación", value: new Date(empresa.fecha_creacion).toLocaleDateString(), icon: FileText },
    ]

    return (
        <div className={styles.dashboardContainer}>
            <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

            <div className={`${styles.mainContent} ${sidebarCollapsed ? styles.collapsed : ""}`}>
                {/* Header */}
                <div className={styles.headerSection}>
                    <div>
                        <h1 className={styles.title}>{empresa.nombre}</h1>
                        <p className={styles.subtitle}>ID: {empresa.id_empresa} • Admin: {empresa.admin_registro.nombre}</p>
                    </div>
                </div>

                {/* Tarjetas de información */}
                <div className={styles.cardsContainer}>
                    {/* RESUMEN */}
                    <DataCard title="Resumen">
                        <div className={styles.cardContent}>
                            {resumenData.map((item) => (
                                <div key={item.label} className={styles.resumenRow}>
                                    <item.icon className={styles.resumenIcon} size={18} />
                                    <div className={styles.resumenItem}>
                                        <span className={styles.resumenLabel}>{item.label}</span>
                                        <span className={styles.resumenValue}>{item.value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </DataCard>

                    {/* DATOS EDITABLES */}
                    <DataCard
                        title="Datos Generales"
                        description="Información básica de la empresa"
                    >
                        <div className={`${styles.cardContent} ${isEditing ? styles.editingMode : ""}`}>
                            {/* Campo: Nombre */}
                            <div className={styles.fieldGroup}>
                                <div className={styles.fieldHeader}>
                                    <Building2 className={styles.icon} size={18} />
                                    <label className={styles.fieldLabel}>Nombre de la empresa</label>
                                </div>
                                    <div className={styles.readOnlyValueContainer}>
                                        <span className={styles.readOnlyValue}>{empresa.nombre}</span>
                                    </div>
                            </div>

                            {/* Campo: Email */}
                            <div className={styles.fieldGroup}>
                                <div className={styles.fieldHeader}>
                                    <Mail className={styles.icon} size={18} />
                                    <label className={styles.fieldLabel}>Email</label>
                                </div>
                                    <div className={styles.readOnlyValueContainer}>
                                        <span className={styles.readOnlyValue}>{empresa.email}</span>
                                    </div>
                            </div>

                            {/* Campo: Dirección */}
                            <div className={styles.fieldGroup}>
                                <div className={styles.fieldHeader}>
                                    <MapPin className={styles.icon} size={18} />
                                    <label className={styles.fieldLabel}>Dirección</label>
                                </div>
                                    <div className={styles.readOnlyValueContainer}>
                                        <span className={styles.readOnlyValue}>{empresa.direccion}</span>
                                    </div>
                            </div>

                            {/* Campo: Teléfono */}
                            <div className={styles.fieldGroup}>
                                <div className={styles.fieldHeader}>
                                    <Phone className={styles.icon} size={18} />
                                    <label className={styles.fieldLabel}>Teléfono</label>
                                </div>
                                    <div className={styles.readOnlyValueContainer}>
                                        <span className={styles.readOnlyValue}>{empresa.telefono}</span>
                                    </div>
                            </div>

                            {/* Campo: NIT */}
                            <div className={styles.fieldGroup}>
                                <div className={styles.fieldHeader}>
                                    <FileText className={styles.icon} size={18} />
                                    <label className={styles.fieldLabel}>NIT</label>
                                </div>
                                    <div className={styles.readOnlyValueContainer}>
                                        <span className={styles.readOnlyValue}>{empresa.nit}</span>
                                    </div>
                            </div>
                        </div>
                    </DataCard>

                    {/* ESTADÍSTICAS */}
                    {empresa.cantidad_clientes && (
                        <DataCard title="Estadísticas">
                            <div className={styles.cardContent}>
                                <div className={styles.statsContainer}>
                                    <div className={styles.fieldHeader}>
                                        <ChartColumnIncreasing className={styles.icon} size={18} />
                                        <span className={styles.fieldLabel}>Clientes totales</span>
                                        <span className={styles.fieldLabel}>{empresa.cantidad_clientes}</span>
                                    </div>
                                    <div className={styles.fieldHeader}>
                                        <Info className={styles.icon} size={18} />
                                        <span className={styles.fieldLabel}>Estado</span>
                                        <span className={styles.fieldLabel}>
                                            {empresa.estado}
                                        </span>
                                    </div>
                                    <div className={styles.fieldHeader}>
                                        <CalendarCheck className={styles.icon} size={18} />
                                        <span className={styles.fieldLabel}>Creada el</span>
                                        <span className={styles.fieldLabel}>
                                            {new Date(empresa.fecha_creacion).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </DataCard>
                    )}
                </div>
            </div>
        </div>
    )
}