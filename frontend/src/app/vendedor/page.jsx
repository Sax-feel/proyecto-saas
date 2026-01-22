"use client"

import { useState, useEffect } from "react"
import Sidebar from "../../components/layout/Sidebar/Sidebar"
import { Building2, Mail, Phone, MapPin, FileText, Globe, Lock, Edit, Save, X, Trash2, AlertTriangle, ChartColumnIncreasing, Info, CalendarCheck, Loader2 } from "lucide-react"
import Button from "../../components/ui/Button/Button"
import Input from "../../components/ui/Input/Input"
import FormField from "../../components/ui/FormField/FormField"
import DataCard from "../../components/ui/DataCard/DataCard"
import styles from "./DashboardVendedor.module.css"

export default function EmpresaPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [saving, setSaving] = useState(false)


  // Estado para la empresa

  // ------------------- FUNCIONES -------------------
  //const getToken = () => localStorage.getItem("access")

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

  return (
    <div className={styles.dashboardContainer}>
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      <div className={`${styles.mainContent} ${sidebarCollapsed ? styles.collapsed : ""}`}>
        <div className={styles.headerSection}>
          <div>
            <h1 className={styles.title}>{empresa.nombre}</h1>
            <p className={styles.subtitle}>ID: {empresa.id_empresa} • Admin: {empresa.admin_registro.nombre}</p>
          </div>
          <div className={styles.actions}>
          </div>
        </div>
      </div>
    </div>
  )
}