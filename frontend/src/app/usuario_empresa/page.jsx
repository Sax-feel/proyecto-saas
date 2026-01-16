"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Button from "../../components/ui/Button/Button"
import FormField from "../../components/ui/FormField/FormField"
import styles from "./DashboardUsuarioEmpresa.module.css"
import Sidebar from "../../components/layout/Sidebar/Sidebar"

export default function EmpresaPage() {
  const router = useRouter()
  const [rol] = useState("Admin Empresa")

  const [empleados, setEmpleados] = useState([
    { email: "vendedor@empresa.com", rol: "Vendedor", activo: true },
    { email: "cliente@empresa.com", rol: "Cliente", activo: true },
  ])

  const [productos, setProductos] = useState([
    { nombre: "Producto A", stock: 10, precio: 25 },
  ])

  const [showEmpleadoForm, setShowEmpleadoForm] = useState(false)
  const [showProductoForm, setShowProductoForm] = useState(false)

  const [nuevoEmpleado, setNuevoEmpleado] = useState({ email: "", rol: "Vendedor" })
  const [nuevoProducto, setNuevoProducto] = useState({ nombre: "", stock: "", precio: "" })

  const [editEmpleadoIndex, setEditEmpleadoIndex] = useState(null)
  const [editProductoIndex, setEditProductoIndex] = useState(null)

  useEffect(() => {
    const rolGuardado = localStorage.getItem("rol")
    //if (rolGuardado !== "admin_empresa") router.push("/login")
  }, [])

  /* ====== HANDLERS ====== */

  const agregarEmpleado = (e) => {
    e.preventDefault()
    if (editEmpleadoIndex !== null) {
      // Editar existente
      const copia = [...empleados]
      copia[editEmpleadoIndex] = { ...nuevoEmpleado, activo: copia[editEmpleadoIndex].activo }
      setEmpleados(copia)
      setEditEmpleadoIndex(null)
    } else {
      // Agregar nuevo
      setEmpleados([...empleados, { ...nuevoEmpleado, activo: true }])
    }
    setNuevoEmpleado({ email: "", rol: "Vendedor" })
    setShowEmpleadoForm(false)
  }

  const toggleEmpleado = (index) => {
    const copia = [...empleados]
    copia[index].activo = !copia[index].activo
    setEmpleados(copia)
  }

  const eliminarEmpleado = (index) => {
    setEmpleados(empleados.filter((_, i) => i !== index))
  }

  const editarEmpleado = (index) => {
    setNuevoEmpleado({ email: empleados[index].email, rol: empleados[index].rol })
    setEditEmpleadoIndex(index)
    setShowEmpleadoForm(true)
  }

  const agregarProducto = (e) => {
    e.preventDefault()
    if (editProductoIndex !== null) {
      const copia = [...productos]
      copia[editProductoIndex] = { ...nuevoProducto }
      setProductos(copia)
      setEditProductoIndex(null)
    } else {
      setProductos([...productos, nuevoProducto])
    }
    setNuevoProducto({ nombre: "", stock: "", precio: "" })
    setShowProductoForm(false)
  }

  const eliminarProducto = (index) => {
    setProductos(productos.filter((_, i) => i !== index))
  }

  return (

    <div className={styles.container}>
      {/* Sidebar fijo */}
      <Sidebar />

    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard Admin Empresa</h1>
      <p className={styles.role}>Rol: {rol}</p>

      {/* SUSCRIPCIONES */}
      <section className={styles.section}>
        <h2>Suscripciones</h2>
        <Button onClick={() => router.push("/usuario_empresa/suscripciones")}>
          Ver suscripciones
        </Button>
      </section>

      {/* EMPLEADOS */}
      <section className={styles.section}>
        <h2>Usuarios de la empresa</h2>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map((emp, i) => (
              <tr key={i}>
                <td>{emp.email}</td>
                <td>{emp.rol}</td>
                <td>{emp.activo ? "Activo" : "Inactivo"}</td>
                <td style={{ display: "flex", gap: "0.5rem" }}>
                  <Button variant="secondary" onClick={() => toggleEmpleado(i)}>
                    {emp.activo ? "Desactivar" : "Activar"}
                  </Button>
                  <Button variant="secondary" onClick={() => editarEmpleado(i)}>Editar</Button>
                  <Button variant="secondary" onClick={() => eliminarEmpleado(i)}>Eliminar</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Button onClick={() => { setShowEmpleadoForm(true); setEditEmpleadoIndex(null) }}>
          Agregar usuario
        </Button>

        {showEmpleadoForm && (
          <form onSubmit={agregarEmpleado} className={styles.form}>
            <FormField
              label="Email"
              type="email"
              value={nuevoEmpleado.email}
              onChange={(e) =>
                setNuevoEmpleado({ ...nuevoEmpleado, email: e.target.value })
              }
              required
            />

            <select
              className={styles.select}
              value={nuevoEmpleado.rol}
              onChange={(e) =>
                setNuevoEmpleado({ ...nuevoEmpleado, rol: e.target.value })
              }
            >
              <option>Vendedor</option>
              <option>Cliente</option>
            </select>

            <Button type="submit">{editEmpleadoIndex !== null ? "Actualizar" : "Guardar"}</Button>
          </form>
        )}
      </section>

      {/* PRODUCTOS */}
      <section className={styles.section}>
        <h2>Productos</h2>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Stock</th>
              <th>Precio</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p, i) => (
              <tr key={i}>
                <td>{p.nombre}</td>
                <td>{p.stock}</td>
                <td>${p.precio}</td>
                <td style={{ display: "flex", gap: "0.5rem" }}>
                  <Button variant="secondary" onClick={() => eliminarProducto(i)}>Eliminar</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Button onClick={() => { setShowProductoForm(true); setEditProductoIndex(null) }}>
          Añadir producto
        </Button>

        {showProductoForm && (
          <form onSubmit={agregarProducto} className={styles.form}>
            <FormField
              label="Nombre"
              value={nuevoProducto.nombre}
              onChange={(e) =>
                setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })
              }
            />
            <FormField
              label="Stock"
              type="number"
              value={nuevoProducto.stock}
              onChange={(e) =>
                setNuevoProducto({ ...nuevoProducto, stock: e.target.value })
              }
            />
            <FormField
              label="Precio"
              type="number"
              value={nuevoProducto.precio}
              onChange={(e) =>
                setNuevoProducto({ ...nuevoProducto, precio: e.target.value })
              }
            />
            <Button type="submit">{editProductoIndex !== null ? "Actualizar" : "Guardar producto"}</Button>
          </form>
        )}
      </section>
    </div>
</div>
  )
}
