"use client"

import { useState, useEffect } from "react"
import Sidebar from "../../components/layout/Sidebar/Sidebar"
import { Building2, Mail, Phone, MapPin, FileText, Globe, Lock, Edit, Save, X, Check, Loader2, AlertCircle } from "lucide-react"
import Button from "../../components/ui/Button/Button"
import Input from "../../components/ui/Input/Input"
import FormField from "../../components/ui/FormField/FormField"
import DataCard from "../../components/ui/DataCard/DataCard"
import styles from "./DashboardUsuarioEmpresa.module.css"

export default function EmpresaPage() {
  const [rol] = useState("Admin Empresa")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  // Estados para datos
  const [empresa, setEmpresa] = useState(null)
  const [tempEmpresa, setTempEmpresa] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Traer datos de la API al cargar la página
  useEffect(() => {
    fetchEmpresaData()
  }, [])

  const fetchEmpresaData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Suponiendo que tienes el ID del usuario/empresa en localStorage o contexto
      const userId = localStorage.getItem("userId") || 1 // Cambia esto según tu autenticación
      
      const response = await fetch(`http://localhost:8000/api/empresas/${userId}/`)
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudieron cargar los datos`)
      }
      
      const data = await response.json()
      
      setEmpresa(data)
      setTempEmpresa(data)
      
    } catch (error) {
      console.error("Error al cargar datos de la empresa:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Funciones para editar, cancelar y guardar
  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setTempEmpresa({ ...empresa })
    setIsEditing(false)
    setError(null)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      
      const response = await fetch(`http://localhost:8000/api/empresas/${empresa.id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tempEmpresa),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al guardar los cambios")
      }

      const updatedData = await response.json()
      setEmpresa(updatedData)
      setIsEditing(false)
      
      // Opcional: Mostrar notificación de éxito
      alert("Cambios guardados correctamente")
      
    } catch (error) {
      console.error("Error al guardar:", error)
      setError(error.message)
      // Revertir cambios en caso de error
      setTempEmpresa({ ...empresa })
    } finally {
      setSaving(false)
    }
  }

  // Guardar campo individual automáticamente
  const handleFieldChange = async (field, value) => {
    // Actualizar estado temporal
    setTempEmpresa(prev => ({ ...prev, [field]: value }))
    
    // Si no está en modo edición, guardar automáticamente
    if (!isEditing) {
      try {
        const response = await fetch(`http://localhost:8000/api/empresas/${empresa.id}/`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ [field]: value }),
        })

        if (response.ok) {
          const updatedData = await response.json()
          setEmpresa(updatedData)
          // Feedback visual opcional
        }
      } catch (error) {
        console.error(`Error al guardar ${field}:`, error)
      }
    }
  }

  // Datos para la sección Resumen
  const resumenData = empresa ? [
    { label: "Empresa", value: empresa.nombre, icon: Building2 },
    { label: "Email", value: empresa.email, icon: Mail },
    { label: "Teléfono", value: empresa.telefono, icon: Phone },
    { label: "Dirección", value: empresa.direccion, icon: MapPin },
    { label: "Sitio web", value: empresa.sitioWeb || "No especificado", icon: Globe },
    { label: "NIT", value: empresa.nit, icon: FileText },
    { label: "Estado", value: empresa.estado || "Activo", icon: Lock },
  ] : []

  if (loading) {
    return (
      <div className={styles.dashboardContainer}>
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
        <div className={`${styles.mainContent} ${sidebarCollapsed ? styles.collapsed : ""}`}>
          <div className={styles.loadingContainer}>
            <Loader2 className={styles.loadingSpinner} size={48} />
            <p>Cargando información de la empresa...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !empresa) {
    return (
      <div className={styles.dashboardContainer}>
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
        <div className={`${styles.mainContent} ${sidebarCollapsed ? styles.collapsed : ""}`}>
          <div className={styles.errorContainer}>
            <AlertCircle size={48} className={styles.errorIcon} />
            <h3>Error al cargar los datos</h3>
            <p>{error}</p>
            <Button onClick={fetchEmpresaData} className={styles.retryButton}>
              Reintentar
            </Button>
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
            <h1 className={styles.title}>Información de la Empresa</h1>
            <p className={styles.subtitle}>Administra los datos de tu empresa</p>
          </div>
          <div className={styles.actions}>
            {isEditing ? (
              <>
                <Button 
                  variant="success" 
                  className={styles.actionBtn} 
                  onClick={handleSave}
                  disabled={saving}
                  icon={saving ? <Loader2 size={16} className={styles.spinner} /> : <Save size={16} />}
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
                <Button 
                  variant="danger" 
                  className={styles.actionBtn} 
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <Button 
                className={styles.actionBtn} 
                onClick={handleEdit}
                icon={<Edit size={16} />}
              >
                Editar información
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

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

          {/* DATOS GENERALES */}
          <DataCard 
            title="Datos Generales" 
            description="Información básica de la empresa"
            isEditing={isEditing}
          >
            <div className={`${styles.cardContent} ${isEditing ? styles.editingMode : ""}`}>
              
              {/* Campo: Nombre */}
              <div className={styles.fieldGroup}>
                <div className={styles.fieldHeader}>
                  <Building2 className={styles.icon} size={18} />
                  <label className={styles.fieldLabel}>Nombre de la empresa</label>
                </div>
                {isEditing ? (
                  <Input
                    value={tempEmpresa?.nombre || ""}
                    onChange={(e) => handleFieldChange("nombre", e.target.value)}
                    placeholder="Nombre de la empresa"
                    className={styles.editableInput}
                  />
                ) : (
                  <div className={styles.readOnlyValueContainer}>
                    <span className={styles.readOnlyValue}>{empresa?.nombre || "No especificado"}</span>
                  </div>
                )}
              </div>

              {/* Campo: Email */}
              <div className={styles.fieldGroup}>
                <div className={styles.fieldHeader}>
                  <Mail className={styles.icon} size={18} />
                  <label className={styles.fieldLabel}>Email</label>
                </div>
                {isEditing ? (
                  <Input
                    type="email"
                    value={tempEmpresa?.email || ""}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                    placeholder="Email"
                    className={styles.editableInput}
                  />
                ) : (
                  <div className={styles.readOnlyValueContainer}>
                    <span className={styles.readOnlyValue}>{empresa?.email || "No especificado"}</span>
                  </div>
                )}
              </div>

              {/* Campo: Teléfono */}
              <div className={styles.fieldGroup}>
                <div className={styles.fieldHeader}>
                  <Phone className={styles.icon} size={18} />
                  <label className={styles.fieldLabel}>Teléfono</label>
                </div>
                {isEditing ? (
                  <Input
                    value={tempEmpresa?.telefono || ""}
                    onChange={(e) => handleFieldChange("telefono", e.target.value)}
                    placeholder="Teléfono"
                    className={styles.editableInput}
                  />
                ) : (
                  <div className={styles.readOnlyValueContainer}>
                    <span className={styles.readOnlyValue}>{empresa?.telefono || "No especificado"}</span>
                  </div>
                )}
              </div>

              {/* Campo: Dirección */}
              <div className={styles.fieldGroup}>
                <div className={styles.fieldHeader}>
                  <MapPin className={styles.icon} size={18} />
                  <label className={styles.fieldLabel}>Dirección</label>
                </div>
                {isEditing ? (
                  <Input
                    value={tempEmpresa?.direccion || ""}
                    onChange={(e) => handleFieldChange("direccion", e.target.value)}
                    placeholder="Dirección"
                    className={styles.editableInput}
                  />
                ) : (
                  <div className={styles.readOnlyValueContainer}>
                    <span className={styles.readOnlyValue}>{empresa?.direccion || "No especificado"}</span>
                  </div>
                )}
              </div>

              {/* Campo: Sitio web */}
              <div className={styles.fieldGroup}>
                <div className={styles.fieldHeader}>
                  <Globe className={styles.icon} size={18} />
                  <label className={styles.fieldLabel}>Sitio web</label>
                </div>
                {isEditing ? (
                  <Input
                    value={tempEmpresa?.sitioWeb || ""}
                    onChange={(e) => handleFieldChange("sitioWeb", e.target.value)}
                    placeholder="Sitio web"
                    className={styles.editableInput}
                  />
                ) : (
                  <div className={styles.readOnlyValueContainer}>
                    <span className={styles.readOnlyValue}>{empresa?.sitioWeb || "No especificado"}</span>
                  </div>
                )}
              </div>

              {/* Campo: NIT */}
              <div className={styles.fieldGroup}>
                <div className={styles.fieldHeader}>
                  <FileText className={styles.icon} size={18} />
                  <label className={styles.fieldLabel}>NIT</label>
                </div>
                {isEditing ? (
                  <Input
                    value={tempEmpresa?.nit || ""}
                    onChange={(e) => handleFieldChange("nit", e.target.value)}
                    placeholder="NIT"
                    className={styles.editableInput}
                  />
                ) : (
                  <div className={styles.readOnlyValueContainer}>
                    <span className={styles.readOnlyValue}>{empresa?.nit || "No especificado"}</span>
                  </div>
                )}
              </div>

              {/* Campo: Descripción */}
              <div className={styles.fieldGroup}>
                <div className={styles.fieldHeader}>
                  <label className={styles.fieldLabel}>Descripción</label>
                </div>
                {isEditing ? (
                  <FormField
                    value={tempEmpresa?.descripcion || ""}
                    onChange={(e) => handleFieldChange("descripcion", e.target.value)}
                    rows={3}
                    placeholder="Descripción de la empresa"
                    className={styles.editableTextarea}
                  />
                ) : (
                  <div className={styles.readOnlyValueContainer}>
                    <span className={styles.readOnlyValue}>{empresa?.descripcion || "No hay descripción"}</span>
                  </div>
                )}
              </div>
            </div>
          </DataCard>
        </div>
      </div>
    </div>
  )
}