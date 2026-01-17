"use client"

import { useState } from "react"
import Button from "../../../components/ui/Button/Button";
import FormField from "../../../components/ui/FormField/FormField"
import styles from "./productos.module.css"

export default function ProductosSection() {
  const [productos, setProductos] = useState([
    { nombre: "Producto A", stock: 10, precio: 25 },
  ])

  const [showForm, setShowForm] = useState(false)
  const [editIndex, setEditIndex] = useState(null)

  const [form, setForm] = useState({
    nombre: "",
    stock: "",
    precio: "",
  })

  /* ====== LÓGICA ====== */

  const guardarProducto = (e) => {
    e.preventDefault()

    if (editIndex !== null) {
      const copia = [...productos]
      copia[editIndex] = { ...form }
      setProductos(copia)
    } else {
      setProductos([...productos, form])
    }

    setForm({ nombre: "", stock: "", precio: "" })
    setEditIndex(null)
    setShowForm(false)
  }

  const eliminarProducto = (index) => {
    setProductos(productos.filter((_, i) => i !== index))
  }

  /* ====== UI ====== */

  return (
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
              <td>
                <Button
                  variant="secondary"
                  onClick={() => eliminarProducto(i)}
                >
                  Eliminar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Button onClick={() => { setShowForm(true); setEditIndex(null) }}>
        Añadir producto
      </Button>

      {showForm && (
        <form onSubmit={guardarProducto} className={styles.form}>
          <FormField
            label="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
          <FormField
            label="Stock"
            type="number"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
          />
          <FormField
            label="Precio"
            type="number"
            value={form.precio}
            onChange={(e) => setForm({ ...form, precio: e.target.value })}
          />
          <Button type="submit">
            {editIndex !== null ? "Actualizar" : "Guardar producto"}
          </Button>
        </form>
      )}
    </section>
  )
}
