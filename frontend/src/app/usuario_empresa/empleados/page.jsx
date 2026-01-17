"use client"

import { useState, useEffect } from "react"
import Sidebar from "../../../components/layout/Sidebar/Sidebar"
import Button from "../../../components/ui/Button/Button"
import FormField from "../../../components/ui/FormField/FormField"
import styles from "./EmpleadosSection.module.css"

// ------------------- ENDPOINTS -------------------
const API_LIST = "http://localhost:8000/api/relaciones/mis-clientes/"
const API_REGISTRAR_EXISTENTE = "http://localhost:8000/api/clientes/registrar-existente/"
const API_ACTUALIZAR_ESTADO = "http://localhost:8000/api/relaciones/actualizar-estado/"

export default function EmpleadosPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [form, setForm] = useState({ email: "" })

  // ------------------- TOKEN -------------------
  const getToken = () => localStorage.getItem("access")

  // ------------------- LISTAR CLIENTES -------------------
  const fetchClientes = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(API_LIST, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      })
      
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`)
      }
      
      const data = await res.json()

      // Verificar que sea un array
      if (Array.isArray(data)) {
        setClientes(data)
      } else {
        console.error("La API no devolvió un array:", data)
        setClientes([])
      }
    } catch (error) {
      console.error("Error al cargar clientes:", error)
      setClientes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  // ------------------- AGREGAR CLIENTE EXISTENTE -------------------
  const agregarClienteExistente = async (e) => {
    e.preventDefault()
    try {
      const token = getToken()
      const res = await fetch(API_REGISTRAR_EXISTENTE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: form.email }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error || "Error desconocido")

      alert("Cliente suscrito correctamente")
      fetchClientes()
      setForm({ email: "" })
      setShowForm(false)
    } catch (err) {
      alert(err.message)
    }
  }

  // ------------------- ACTUALIZAR ESTADO -------------------
  const actualizarEstadoCliente = async (relacionId, estadoActual) => {
    try {
      // Determinar nuevo estado (toggle)
      let nuevoEstado = "activo"
      if (estadoActual === "activo") {
        nuevoEstado = "inactivo"
      } else if (estadoActual === "inactivo") {
        nuevoEstado = "activo"
      } else {
        nuevoEstado = "activo" // Para cualquier otro estado, establecer como activo
      }

      const token = getToken()
      const res = await fetch(`${API_ACTUALIZAR_ESTADO}${relacionId}/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error || "Error al actualizar estado")

      // Actualizar estado localmente
      setClientes(prevClientes => 
        prevClientes.map(cliente => 
          cliente.id_tiene === relacionId 
            ? { ...cliente, estado: nuevoEstado }
            : cliente
        )
      )
      
      alert(`Estado actualizado a: ${nuevoEstado}`)
    } catch (err) {
      alert(err.message || "Error al actualizar el estado")
    }
  }

  // ------------------- FILTRAR -------------------
  const clientesFiltrados = clientes.filter((c) => {
    if (!c || !c.cliente) return false
    
    const nombre = c.cliente.nombre_cliente || ""
    const email = c.cliente.id_usuario?.email || ""
    
    const busquedaLower = busqueda.toLowerCase()
    return nombre.toLowerCase().includes(busquedaLower) || 
           email.toLowerCase().includes(busquedaLower)
  })

  // ------------------- JSX -------------------
  return (
    <div className={styles.dashboardContainer}>
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      <div className={`${styles.mainContent} ${sidebarCollapsed ? styles.collapsed : ""}`}>
        <h1 className={styles.title}>Clientes</h1>

        <div className={styles.searchContainer}>
          <FormField
            label="Buscar cliente"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o email..."
          />
        </div>

        <div className={styles.actionsContainer}>
          <Button onClick={() => setShowForm(true)}>
            Agregar cliente existente
          </Button>
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <p>Cargando clientes...</p>
          </div>
        ) : clientes.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No hay clientes registrados en esta empresa.</p>
            <p>Usa el botón "Agregar cliente existente" para comenzar.</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>NIT</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((c) => {
                  // Verificar que el objeto tenga la estructura esperada
                  if (!c || !c.cliente) {
                    console.warn("Cliente con estructura inválida:", c)
                    return null
                  }

                  return (
                    <tr key={c.id_tiene || c.id_cliente}>
                      <td>
                        <div className={styles.clienteNombre}>
                          {c.cliente.nombre_cliente || "Nombre no disponible"}
                        </div>
                      </td>
                      <td>
                        <div className={styles.clienteEmail}>
                          {c.cliente.id_usuario?.email || "Email no disponible"}
                        </div>
                      </td>
                      <td>{c.cliente.telefono_cliente || "No disponible"}</td>
                      <td>{c.cliente.nit || "No disponible"}</td>
                      <td>
                        <div className={styles.estadoContainer}>
                          <span className={`${styles.estadoBadge} ${
                            (c.estado || "inactivo") === "activo" 
                              ? styles.activo 
                              : (c.estado || "inactivo") === "pendiente"
                              ? styles.pendiente
                              : styles.inactivo
                          }`}>
                            {c.estado || "inactivo"}
                          </span>
                          <button
                            className={`${styles.estadoToggleBtn} ${
                              (c.estado || "inactivo") === "activo" 
                                ? styles.toggleToInactive 
                                : styles.toggleToActive
                            }`}
                            onClick={() => actualizarEstadoCliente(c.id_tiene, c.estado)}
                            title={
                              (c.estado || "inactivo") === "activo" 
                                ? "Desactivar cliente" 
                                : "Activar cliente"
                            }
                          >
                            {(c.estado || "inactivo") === "activo" ? "🚫" : "✅"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* -------- MODAL AGREGAR CLIENTE -------- */}
        {showForm && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h2>Agregar cliente existente</h2>
              <form onSubmit={agregarClienteExistente}>
                <FormField
                  label="Email del cliente"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ email: e.target.value })}
                  required
                  placeholder="ejemplo@correo.com"
                />
                <div className={styles.modalActions}>
                  <Button type="submit">Agregar</Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}