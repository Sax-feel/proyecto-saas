"use client"

import { useState, useEffect } from "react"
import Sidebar from "../../../components/layout/Sidebar/Sidebar"
import Button from "../../../components/ui/Button/Button"
import FormField from "../../../components/ui/FormField/FormField"
import Modal from "../../../components/ui/Modal/Modal"
import styles from "./ProveedoresSection.module.css"

// ------------------- ENDPOINTS -------------------
const API_BASE = "http://localhost:8000/api/proveedores"
const API_LISTAR = `${API_BASE}/listar/`
const API_CREAR = `${API_BASE}/crear/`

export default function ProveedoresPage() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [proveedores, setProveedores] = useState([])
    const [loading, setLoading] = useState(true)
    const [busqueda, setBusqueda] = useState("")

    // Estados para modales
    const [showCrearModal, setShowCrearModal] = useState(false)
    const [showEditarModal, setShowEditarModal] = useState(false)
    const [showEliminarModal, setShowEliminarModal] = useState(false)

    // Estados para formularios
    const [formCrear, setFormCrear] = useState({
        nombre: "",
        telefono: "",
        email: "",
        direccion: ""
    })

    const [formEditar, setFormEditar] = useState({
        id_proveedor: null,
        nombre: "",
        telefono: "",
        email: "",
        direccion: ""
    })

    const [proveedorAEliminar, setProveedorAEliminar] = useState(null)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)

    // ------------------- TOKEN -------------------
    const getToken = () => localStorage.getItem("access")

    // ------------------- LISTAR PROVEEDORES -------------------
    const fetchProveedores = async () => {
        setLoading(true)
        setError(null)
        try {
            const token = getToken()
            const res = await fetch(API_LISTAR, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
            })

            if (!res.ok) {
                throw new Error(`Error ${res.status}: ${res.statusText}`)
            }

            const data = await res.json()

            if (data.status === "success" && Array.isArray(data.proveedores)) {
                setProveedores(data.proveedores)
            } else {
                console.error("Respuesta inesperada de la API:", data)
                setProveedores([])
            }
        } catch (error) {
            console.error("Error al cargar proveedores:", error)
            setError("No se pudieron cargar los proveedores. Verifica tu conexión.")
            setProveedores([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProveedores()
    }, [])

    // ------------------- CREAR PROVEEDOR -------------------
    const crearProveedor = async (e) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)

        // Validaciones básicas
        if (!formCrear.nombre.trim() || !formCrear.email.trim()) {
            setError("Nombre y email son campos obligatorios")
            return
        }

        try {
            const token = getToken()
            const res = await fetch(API_CREAR, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formCrear),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.detail || data.error || "Error al crear proveedor")
            }

            setSuccess("Proveedor creado exitosamente")

            // Limpiar formulario
            setFormCrear({
                nombre: "",
                telefono: "",
                email: "",
                direccion: ""
            })

            // Cerrar modal y actualizar lista
            setShowCrearModal(false)
            fetchProveedores()

        } catch (err) {
            setError(err.message || "Error al crear el proveedor")
        }
    }

    // ------------------- EDITAR PROVEEDOR (corregido) -------------------
    const editarProveedor = async (e) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)

        if (!formEditar.id_proveedor) {
            setError("ID de proveedor no válido")
            return
        }

        try {
            const token = getToken()
            const res = await fetch(`${API_BASE}/${formEditar.id_proveedor}/actualizar/`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    nombre: formEditar.nombre,
                    telefono: formEditar.telefono,
                    email: formEditar.email,
                    direccion: formEditar.direccion
                }),
            })

            // Primero verifica si la respuesta es JSON válido
            const contentType = res.headers.get("content-type")
            if (!contentType || !contentType.includes("application/json")) {
                // Si no es JSON, probablemente es un error 404/500 con HTML
                throw new Error(`El servidor respondió con: ${res.status} ${res.statusText}`)
            }

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.detail || data.error || `Error ${res.status}: ${res.statusText}`)
            }

            setSuccess("Proveedor actualizado exitosamente")

            // Cerrar modal y actualizar lista
            setShowEditarModal(false)
            fetchProveedores()

        } catch (err) {
            console.error("Error detallado al actualizar:", err)
            setError(err.message || "Error al actualizar el proveedor. Verifica que el endpoint exista.")
        }
    }
    // ------------------- ELIMINAR PROVEEDOR -------------------
    const eliminarProveedor = async () => {
        if (!proveedorAEliminar) return

        setError(null)
        setSuccess(null)

        try {
            const token = getToken()
            const res = await fetch(`${API_BASE}/${proveedorAEliminar}/eliminar/`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.detail || data.error || "Error al eliminar proveedor")
            }

            setSuccess("Proveedor eliminado exitosamente")

            // Cerrar modal y actualizar lista
            setShowEliminarModal(false)
            setProveedorAEliminar(null)
            fetchProveedores()

        } catch (err) {
            setError(err.message || "Error al eliminar el proveedor")
        }
    }

    // ------------------- MANEJAR EDICIÓN -------------------
    const manejarEdicion = (proveedor) => {
        setFormEditar({
            id_proveedor: proveedor.id_proveedor,
            nombre: proveedor.nombre || "",
            telefono: proveedor.telefono || "",
            email: proveedor.email || "",
            direccion: proveedor.direccion || ""
        })
        setShowEditarModal(true)
    }

    // ------------------- MANEJAR ELIMINACIÓN -------------------
    const manejarEliminacion = (proveedorId) => {
        setProveedorAEliminar(proveedorId)
        setShowEliminarModal(true)
    }

    // ------------------- FORMATEAR FECHA -------------------
    const formatFecha = (fechaString) => {
        if (!fechaString) return "No disponible"
        const fecha = new Date(fechaString)
        return fecha.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // ------------------- FILTRAR PROVEEDORES -------------------
    const proveedoresFiltrados = proveedores.filter((proveedor) => {
        if (!proveedor) return false

        const nombre = proveedor.nombre || ""
        const email = proveedor.email || ""
        const telefono = proveedor.telefono || ""
        const direccion = proveedor.direccion || ""

        const busquedaLower = busqueda.toLowerCase()
        return nombre.toLowerCase().includes(busquedaLower) ||
            email.toLowerCase().includes(busquedaLower) ||
            telefono.toLowerCase().includes(busquedaLower) ||
            direccion.toLowerCase().includes(busquedaLower)
    })

    // ------------------- JSX -------------------
    return (
        <div className={styles.dashboardContainer}>
            <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

            <div className={`${styles.mainContent} ${sidebarCollapsed ? styles.collapsed : ""}`}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Proveedores</h1>
                </div>

                {/* Mensajes de error/éxito */}
                {error && (
                    <div className={styles.errorMessage}>
                        <p>{error}</p>
                    </div>
                )}

                {success && (
                    <div className={styles.successMessage}>
                        <p>{success}</p>
                    </div>
                )}

                <div className={styles.controlsContainer}>
                    <div className={styles.searchContainer}>
                        <FormField
                            label="Buscar proveedor"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por nombre, email, teléfono o dirección..."
                            fullWidth
                        />
                    </div>
                    <div className={styles.actionsContainer}>
                        <Button
                            onClick={() => setShowCrearModal(true)}
                            className={styles.addButton}
                        >
                            + Nuevo Proveedor
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner}></div>
                        <p>Cargando proveedores...</p>
                    </div>
                ) : proveedores.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📋</div>
                        <h3>No hay proveedores registrados</h3>
                        <p>Usa el botón "Nuevo Proveedor" para comenzar a agregar proveedores.</p>
                    </div>
                ) : (
                    <div className={styles.tableContainer}>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Email</th>
                                        <th>Teléfono</th>
                                        <th>Dirección</th>
                                        <th>Fecha Registro</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {proveedoresFiltrados.map((proveedor) => (
                                        <tr key={proveedor.id_proveedor}>
                                            <td>
                                                <div className={styles.proveedorNombre}>
                                                    {proveedor.nombre || "Nombre no disponible"}
                                                </div>
                                            </td>
                                            <td>
                                                <div className={styles.proveedorEmail}>
                                                    {proveedor.email || "Email no disponible"}
                                                </div>
                                            </td>
                                            <td>{proveedor.telefono || "No disponible"}</td>
                                            <td>
                                                <div className={styles.direccionCell}>
                                                    {proveedor.direccion || "No disponible"}
                                                </div>
                                            </td>
                                            <td>{formatFecha(proveedor.fecha_creacion)}</td>
                                            <td>
                                                <div className={styles.actionsCell}>
                                                    <Button
                                                        variant="secondary"
                                                        size="small"
                                                        onClick={() => manejarEdicion(proveedor)}
                                                        className={styles.editButton}
                                                    >
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="small"
                                                        onClick={() => manejarEliminacion(proveedor.id_proveedor)}
                                                        className={styles.deleteButton}
                                                    >
                                                        Eliminar
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* -------- MODAL CREAR PROVEEDOR -------- */}
                {showCrearModal && (
                    <Modal
                        title="Nuevo Proveedor"
                        onClose={() => {
                            setShowCrearModal(false)
                            setError(null)
                            setSuccess(null)
                        }}
                        size="medium"
                    >
                        <form onSubmit={crearProveedor} className={styles.modalForm}>
                            <FormField
                                label="Nombre *"
                                value={formCrear.nombre}
                                onChange={(e) => setFormCrear({ ...formCrear, nombre: e.target.value })}
                                required
                                placeholder="Ej: Distribuidora XYZ"
                            />
                            <FormField
                                label="Email *"
                                type="email"
                                value={formCrear.email}
                                onChange={(e) => setFormCrear({ ...formCrear, email: e.target.value })}
                                required
                                placeholder="ejemplo@proveedor.com"
                            />
                            <FormField
                                label="Teléfono"
                                type="tel"
                                value={formCrear.telefono}
                                onChange={(e) => setFormCrear({ ...formCrear, telefono: e.target.value })}
                                placeholder="77777777"
                            />
                            <FormField
                                label="Dirección"
                                value={formCrear.direccion}
                                onChange={(e) => setFormCrear({ ...formCrear, direccion: e.target.value })}
                                placeholder="Calle Principal #123"
                            />

                            {error && <div className={styles.modalError}>{error}</div>}

                            <div className={styles.modalActions}>
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Creando..." : "Crear Proveedor"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setShowCrearModal(false)}
                                    disabled={loading}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </Modal>
                )}

                {/* -------- MODAL EDITAR PROVEEDOR -------- */}
                {showEditarModal && (
                    <Modal
                        title="Editar Proveedor"
                        onClose={() => {
                            setShowEditarModal(false)
                            setError(null)
                            setSuccess(null)
                        }}
                        size="medium"
                    >
                        <form onSubmit={editarProveedor} className={styles.modalForm}>
                            <FormField
                                label="Nombre *"
                                value={formEditar.nombre}
                                onChange={(e) => setFormEditar({ ...formEditar, nombre: e.target.value })}
                                required
                                placeholder="Ej: Distribuidora XYZ"
                            />
                            <FormField
                                label="Email *"
                                type="email"
                                value={formEditar.email}
                                onChange={(e) => setFormEditar({ ...formEditar, email: e.target.value })}
                                required
                                placeholder="ejemplo@proveedor.com"
                            />
                            <FormField
                                label="Teléfono"
                                type="tel"
                                value={formEditar.telefono}
                                onChange={(e) => setFormEditar({ ...formEditar, telefono: e.target.value })}
                                placeholder="77777777"
                            />
                            <FormField
                                label="Dirección"
                                value={formEditar.direccion}
                                onChange={(e) => setFormEditar({ ...formEditar, direccion: e.target.value })}
                                placeholder="Calle Principal #123"
                            />

                            {error && <div className={styles.modalError}>{error}</div>}

                            <div className={styles.modalActions}>
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Actualizando..." : "Actualizar"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setShowEditarModal(false)}
                                    disabled={loading}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </Modal>
                )}

                {/* -------- MODAL ELIMINAR PROVEEDOR -------- */}
                {showEliminarModal && (
                    <Modal
                        title="Confirmar Eliminación"
                        onClose={() => {
                            setShowEliminarModal(false)
                            setProveedorAEliminar(null)
                        }}
                        size="small"
                    >
                        <div className={styles.deleteModalContent}>
                            <div className={styles.deleteIcon}>⚠️</div>
                            <h3>¿Estás seguro de eliminar este proveedor?</h3>
                            <p>Esta acción no se puede deshacer. Todos los datos del proveedor serán eliminados permanentemente.</p>

                            {error && <div className={styles.modalError}>{error}</div>}

                            <div className={styles.modalActions}>
                                <Button
                                    variant="danger"
                                    onClick={eliminarProveedor}
                                    disabled={loading}
                                >
                                    {loading ? "Eliminando..." : "Sí, eliminar"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setShowEliminarModal(false)}
                                    disabled={loading}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </Modal>
                )}
            </div>
        </div>
    )
}