"use client"

import { useState, useEffect } from "react"
import Button from "../../../components/ui/button/Button"
import FormField from "../../../components/ui/FormField/FormField"
import Sidebar from "../../../components/layout/Sidebar/Sidebar"
import styles from "./EmpleadosSection.module.css"

const API_LIST = "http://localhost:8000/api/clientes/listar/"
const API_REGISTRAR = "http://localhost:8000/api/clientes/registrar/"

export default function EmpleadosPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editIndex, setEditIndex] = useState(null)
  const [busqueda, setBusqueda] = useState("")
  const [form, setForm] = useState({
    nombre_cliente: "",
    email: "",
    telefono_cliente: "",
    nit: "",
    direccion_cliente: "",
    compras: 0,
    totalGastado: 0,
    etiquetas: "",
    activo: true
  })

  // ------------------- Listar clientes -------------------
  const fetchClientes = async () => {
    setLoading(true)
    try {
      const res = await fetch(API_LIST, { credentials: "include" })
      const data = await res.json()
      setClientes(Array.isArray(data) ? data : []) // aseguramos que sea array
    } catch (error) {
      console.error("Error al cargar clientes:", error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  // ------------------- Guardar / Actualizar -------------------
  const guardarCliente = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        etiquetas: form.etiquetas.split(",").map(e => e.trim())
      }

      let res
      if (editIndex !== null) {
        const cliente = clientes[editIndex]
        res = await fetch(`http://localhost:8000/api/clientes/${cliente.id_usuario}/`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include"
        })
      } else {
        res = await fetch(API_REGISTRAR, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include"
        })
      }

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP error ${res.status}: ${text}`)
      }

      const data = await res.json()

      if (editIndex !== null) {
        const copia = [...clientes]
        copia[editIndex] = data
        setClientes(copia)
      } else {
        setClientes([...clientes, data.cliente])
      }

      setForm({
        nombre_cliente: "",
        email: "",
        telefono_cliente: "",
        nit: "",
        direccion_cliente: "",
        compras: 0,
        totalGastado: 0,
        etiquetas: "",
        activo: true
      })
      setEditIndex(null)
      setShowForm(false)
    } catch (error) {
      console.error("Error al guardar cliente:", error)
      alert("Error al guardar cliente: " + error.message)
    }
  }

  // ------------------- Editar -------------------
  const editarCliente = (index) => {
    const c = clientes[index]
    setForm({
      nombre_cliente: c.nombre_cliente || "",
      email: c.email || "",
      telefono_cliente: c.telefono_cliente || "",
      nit: c.nit || "",
      direccion_cliente: c.direccion_cliente || "",
      compras: c.compras || 0,
      totalGastado: c.totalGastado || 0,
      etiquetas: c.etiquetas?.join(", ") || "",
      activo: c.activo
    })
    setEditIndex(index)
    setShowForm(true)
  }

  // ------------------- Activar / Desactivar -------------------
  const toggleCliente = async (index) => {
    const copia = [...clientes]
    const c = copia[index]
    try {
      const res = await fetch(`http://localhost:8000/api/clientes/${c.id_usuario}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !c.activo }),
        credentials: "include"
      })
      const data = await res.json()
      copia[index] = data
      setClientes(copia)
    } catch (error) {
      console.error("Error al cambiar estado:", error)
    }
  }

  // ------------------- Eliminar -------------------
  const eliminarCliente = async (index) => {
    const c = clientes[index]
    try {
      await fetch(`http://localhost:8000/api/clientes/${c.id_usuario}/`, {
        method: "DELETE",
        credentials: "include"
      })
      setClientes(clientes.filter((_, i) => i !== index))
    } catch (error) {
      console.error("Error al eliminar cliente:", error)
    }
  }

  // ------------------- Filtrar -------------------
  const clientesFiltrados = clientes.filter(c =>
    c.nombre_cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono_cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.nit?.toLowerCase().includes(busqueda.toLowerCase())
  )

  // ------------------- JSX -------------------
  return (
    <div className={styles.dashboardContainer}>
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      <div className={`${styles.mainContent} ${sidebarCollapsed ? styles.collapsed : ""}`}>
        <h1 className={styles.title}>Clientes</h1>

        <FormField
          label="Buscar cliente"
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <Button onClick={() => { setShowForm(true); setEditIndex(null) }}>Agregar cliente</Button>

        {loading ? (
          <p>Cargando...</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contacto</th>
                <th>Compras</th>
                <th>Total Gastado</th>
                <th>Estado</th>
                <th>Etiquetas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((c, i) => (
                <tr key={c.id_usuario}>
                  <td>{c.nombre_cliente}</td>
                  <td>{c.telefono_cliente}</td>
                  <td>{c.compras}</td>
                  <td>${c.totalGastado}</td>
                  <td>{c.activo ? "Activo" : "Inactivo"}</td>
                  <td>{c.etiquetas?.join(", ")}</td>
                  <td style={{ display: "flex", gap: "0.5rem" }}>
                    <Button variant="secondary" onClick={() => toggleCliente(i)}>
                      {c.activo ? "Desactivar" : "Activar"}
                    </Button>
                    <Button variant="secondary" onClick={() => editarCliente(i)}>Editar</Button>
                    <Button variant="secondary" onClick={() => eliminarCliente(i)}>Eliminar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ------------------- Formulario modal ------------------- */}
        {showForm && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h2>{editIndex !== null ? "Editar Cliente" : "Agregar Cliente"}</h2>
              <form onSubmit={guardarCliente} className={styles.form}>
                <FormField
                  label="Nombre"
                  type="text"
                  value={form.nombre_cliente}
                  onChange={(e) => setForm({ ...form, nombre_cliente: e.target.value })}
                  required
                />
                <FormField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
                <FormField
                  label="Teléfono"
                  type="text"
                  value={form.telefono_cliente}
                  onChange={(e) => setForm({ ...form, telefono_cliente: e.target.value })}
                />
                <FormField
                  label="NIT"
                  type="text"
                  value={form.nit}
                  onChange={(e) => setForm({ ...form, nit: e.target.value })}
                />
                <FormField
                  label="Dirección"
                  type="text"
                  value={form.direccion_cliente}
                  onChange={(e) => setForm({ ...form, direccion_cliente: e.target.value })}
                />
                <FormField
                  label="Compras"
                  type="number"
                  value={form.compras}
                  onChange={(e) => setForm({ ...form, compras: parseInt(e.target.value) })}
                />
                <FormField
                  label="Total Gastado"
                  type="number"
                  value={form.totalGastado}
                  onChange={(e) => setForm({ ...form, totalGastado: parseFloat(e.target.value) })}
                />
                <FormField
                  label="Etiquetas (separadas por coma)"
                  type="text"
                  value={form.etiquetas}
                  onChange={(e) => setForm({ ...form, etiquetas: e.target.value })}
                />

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <Button type="submit">{editIndex !== null ? "Actualizar" : "Guardar"}</Button>
                  <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}