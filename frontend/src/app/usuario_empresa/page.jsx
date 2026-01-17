"use client"

import { useState, useEffect } from "react"
import Sidebar from "../../components/layout/Sidebar/Sidebar"
import { Building2, Mail, Phone, MapPin, FileText, Globe, Lock, Edit, Save, X } from "lucide-react"
import Button from "../../components/ui/Button/Button"
import Input from "../../components/ui/Input/Input"
import FormField from "../../components/ui/FormField/FormField"
import DataCard from "../../components/ui/DataCard/DataCard"
import styles from "./DashboardUsuarioEmpresa.module.css"

export default function EmpresaPage() {
  const [rol] = useState("Admin Empresa")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [empresa, setEmpresa] = useState({
    nombre: "TechCorp Solutions",
    email: "contacto@techcorp.com",
    direccion: "Av. Insurgentes Sur 1234, CDMX",
    sitioWeb: "https://techcorp.com",
    descripcion: "Empresa líder en soluciones tecnológicas para negocios",
    telefono: "+52 55 1234 5678",
    nit: "TCO123456ABC",
    estado: "Activo",
  })

  const [tempEmpresa, setTempEmpresa] = useState({ ...empresa })

  // Traer datos de la API al cargar la página
  useEffect(() => {
    fetch("http://localhost:8000/api/empresas/1/")
      .then(res => res.json())
      .then(data => {
        const empresaData = {
          nombre: data.nombre || "TechCorp Solutions",
          email: data.email || "contacto@techcorp.com",
          direccion: data.direccion || "Av. Insurgentes Sur 1234, CDMX",
          sitioWeb: data.sitioWeb || "https://techcorp.com",
          descripcion: data.descripcion || "Empresa líder en soluciones tecnológicas para negocios",
          telefono: data.telefono || "+52 55 1234 5678",
          nit: data.nit || "TCO123456ABC",
          estado: data.estado || "Activo",
        }
        setEmpresa(empresaData)
        setTempEmpresa(empresaData)
      })
      .catch(error => {
        console.error("Error al cargar datos de la empresa:", error)
      })
  }, [])

  // Funciones para editar, cancelar y guardar
  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setTempEmpresa({ ...empresa })
    setIsEditing(false)
  }

  const handleSave = () => {
    setEmpresa({ ...tempEmpresa })
    setIsEditing(false)
    alert("Cambios guardados correctamente")
  }

  // Datos estáticos para la sección Resumen
  const resumenData = [
    { label: "Empresa", value: empresa.nombre, icon: Building2 },
    { label: "Email", value: empresa.email, icon: Mail },
    { label: "Teléfono", value: empresa.telefono, icon: Phone },
    { label: "Dirección", value: empresa.direccion, icon: MapPin },
    { label: "Sitio web", value: empresa.sitioWeb, icon: Globe },
    { label: "RFC", value: empresa.nit, icon: FileText },
    { label: "Estado", value: empresa.estado, icon: Lock },
  ]

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
                  icon={<Save size={16} />}
                >
                  Guardar cambios
                </Button>
                <Button 
                  variant="danger" 
                  className={styles.actionBtn} 
                  onClick={handleCancel}
                  icon={<X size={16} />}
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

        <div className={styles.cardsContainer}>
        {/* RESUMEN - ARRIBA (ESTÁTICO) */}
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

        {/* DATOS GENERALES - ABAJO (EDITABLE) */}
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
                  value={tempEmpresa.nombre}
                  onChange={(e) => setTempEmpresa({ ...tempEmpresa, nombre: e.target.value })}
                  placeholder="Nombre de la empresa"
                  className={styles.editableInput}
                />
              ) : (
                <div className={styles.readOnlyValueContainer}>
                  <span className={styles.readOnlyValue}>{tempEmpresa.nombre}</span>
                  <div className={styles.lockIndicator}>
                  </div>
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
                  value={tempEmpresa.email}
                  onChange={(e) => setTempEmpresa({ ...tempEmpresa, email: e.target.value })}
                  placeholder="Email"
                  className={styles.editableInput}
                />
              ) : (
                <div className={styles.readOnlyValueContainer}>
                  <span className={styles.readOnlyValue}>{tempEmpresa.email}</span>
                  <div className={styles.lockIndicator}>
                  </div>
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
                  value={tempEmpresa.direccion}
                  onChange={(e) => setTempEmpresa({ ...tempEmpresa, direccion: e.target.value })}
                  placeholder="Dirección"
                  className={styles.editableInput}
                />
              ) : (
                <div className={styles.readOnlyValueContainer}>
                  <span className={styles.readOnlyValue}>{tempEmpresa.direccion}</span>
                  <div className={styles.lockIndicator}>
                  </div>
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
                  value={tempEmpresa.sitioWeb}
                  onChange={(e) => setTempEmpresa({ ...tempEmpresa, sitioWeb: e.target.value })}
                  placeholder="Sitio web"
                  className={styles.editableInput}
                />
              ) : (
                <div className={styles.readOnlyValueContainer}>
                  <span className={styles.readOnlyValue}>{tempEmpresa.sitioWeb}</span>
                  <div className={styles.lockIndicator}>
                  </div>
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
                  value={tempEmpresa.descripcion}
                  onChange={(e) => setTempEmpresa({ ...tempEmpresa, descripcion: e.target.value })}
                  rows={3}
                  placeholder="Descripción"
                  className={styles.editableTextarea}
                />
              ) : (
                <div className={styles.readOnlyValueContainer}>
                  <span className={styles.readOnlyValue}>{tempEmpresa.descripcion}</span>
                  <div className={styles.lockIndicator}>
                  </div>
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