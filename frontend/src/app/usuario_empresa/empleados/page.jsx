"use client"

import { useState, useEffect, useRef } from "react"
import Sidebar from "../../../components/layout/Sidebar/Sidebar"
import Button from "../../../components/ui/Button/Button"
import FormField from "../../../components/ui/FormField/FormField"
import styles from "./EmpleadosSection.module.css"

// ------------------- ENDPOINTS -------------------
const API_LIST = "http://localhost:8000/api/clientes/listar/"
const API_REGISTRAR_EXISTENTE = "http://localhost:8000/api/clientes/registrar/"

// ------------------- CLIENTE DE EJEMPLO -------------------
const CLIENTE_EJEMPLO = {
  id_usuario: 999,
  nombre_cliente: "Cliente Demo",
  telefono_cliente: "78945612",
  nit: "DEMO-123",
  estado: "activo",
}

export default function EmpleadosPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [menuAbierto, setMenuAbierto] = useState(null)

  const [form, setForm] = useState({ email: "" })
  const menuRef = useRef(null)

  // ------------------- TOKEN -------------------
  const getToken = () => localStorage.getItem("token")

  // ------------------- LISTAR CLIENTES -------------------
  const fetchClientes = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(API_LIST, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()

      if (Array.isArray(data) && data.length > 0) {
        setClientes(data)
      } else {
        setClientes([CLIENTE_EJEMPLO])
      }
    } catch (error) {
      console.error("Error al cargar clientes:", error)
      setClientes([CLIENTE_EJEMPLO]) // fallback visual
    }
    setLoading(false)
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
      if (!res.ok) throw new Error(data.detail || "Error")

      alert("Cliente suscrito correctamente")
      fetchClientes()
      setForm({ email: "" })
      setShowForm(false)
    } catch (err) {
      alert(err.message)
    }
  }

  // ------------------- ACTIVAR / DESACTIVAR -------------------
  const toggleCliente = async (clienteId, estadoActual) => {
    alert(
      `Simulación: cliente ${clienteId} pasa a ${
        estadoActual === "activo" ? "inactivo" : "activo"
      }`
    )
    setMenuAbierto(null)
  }

  // ------------------- ELIMINAR RELACIÓN -------------------
  const eliminarCliente = async (clienteId) => {
    if (!confirm("¿Eliminar cliente de la empresa?")) return
    alert(`Simulación: cliente ${clienteId} eliminado`)
    setMenuAbierto(null)
  }

  // ------------------- FILTRAR -------------------
  const clientesFiltrados = clientes.filter((c) =>
    c.nombre_cliente.toLowerCase().includes(busqueda.toLowerCase())
  )

  // Cerrar menú al hacer clic fuera - CORREGIDO
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Solo cerrar si no se hace clic en el botón de menú o en el menú mismo
      const isMenuButton = e.target.closest(`.${styles.menuButton}`)
      const isMenuDropdown = e.target.closest(`.${styles.menuDropdown}`)
      
      if (!isMenuButton && !isMenuDropdown && menuAbierto !== null) {
        setMenuAbierto(null)
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [menuAbierto])

  // ------------------- JSX -------------------
  return (
    <div className={styles.dashboardContainer}>
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      <div className={`${styles.mainContent} ${sidebarCollapsed ? styles.collapsed : ""}`}>
        <h1 className={styles.title}>Clientes</h1>

        <FormField
          label="Buscar cliente"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <Button onClick={() => setShowForm(true)}>
          Agregar cliente existente
        </Button>

        {loading ? (
          <p>Cargando...</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>NIT</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((c) => (
                <tr key={c.id_usuario}>
                  <td>{c.nombre_cliente}</td>
                  <td>{c.telefono_cliente}</td>
                  <td>{c.nit}</td>
                  <td>
                    <span className={`${styles.estadoBadge} ${
                      c.estado === "activo" ? styles.activo : styles.inactivo
                    }`}>
                      {c.estado}
                    </span>
                  </td>

                  {/* -------- MENÚ DE ACCIONES -------- */}
                  <td className={styles.actionsCell}>
                    <div style={{ position: "relative" }}>
                      <button
                        className={styles.menuButton}
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuAbierto(
                            menuAbierto === c.id_usuario ? null : c.id_usuario
                          )
                        }}
                      >
                        ⋮
                      </button>

                      {menuAbierto === c.id_usuario && (
                        <div 
                          className={styles.menuDropdown}
                          ref={menuRef}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button 
                            className={styles.menuItem}
                            onClick={() => {
                              alert("Editar (pendiente)")
                              setMenuAbierto(null)
                            }}
                          >
                            <span className={styles.menuIcon}>✏️</span>
                            <span>Editar</span>
                          </button>

                          <button 
                            className={styles.menuItem}
                            onClick={() => {
                              toggleCliente(c.id_usuario, c.estado)
                            }}
                          >
                            <span className={styles.menuIcon}>
                              {c.estado === "activo" ? "🚫" : "✅"}
                            </span>
                            <span>{c.estado === "activo" ? "Desactivar" : "Activar"}</span>
                          </button>

                          <button
                            className={`${styles.menuItem} ${styles.menuItemDanger}`}
                            onClick={() => {
                              if (confirm("¿Eliminar cliente de la empresa?")) {
                                eliminarCliente(c.id_usuario)
                              }
                            }}
                          >
                            <span className={styles.menuIcon}>🗑️</span>
                            <span>Eliminar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Button type="submit">Agregar</Button>
                  <Button variant="secondary" onClick={() => setShowForm(false)}>
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