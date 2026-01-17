"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Button from "../../../components/ui/Button/Button"
import FormField from "../../../components/ui/FormField/FormField"
import styles from "./RegistroCliente.module.css"

export default function RegistroClienteForm() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        nit: "",
        nombre_cliente: "",
        direccion_cliente: "",
        telefono_cliente: "",
        empresa_nombre: ""
    })

    const [empresas, setEmpresas] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [showPassword, setShowPassword] = useState(false)

    // Cargar empresas disponibles al montar el componente
    useEffect(() => {
        cargarEmpresas()
    }, [])

    const cargarEmpresas = async () => {
        try {
            const res = await fetch("http://localhost:8000/api/empresas/listar")
            const data = await res.json()
            if (res.ok && data) {
                setEmpresas(data)
            }
        } catch (err) {
            console.error("Error cargando empresas:", err)
        }
    }

    const handleChange = (field) => (e) => {
        setFormData({
            ...formData,
            [field]: e.target.value
        })
        if (error) setError("")
    }

    const validateForm = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
            return "Por favor ingrese un email válido"
        }

        if (formData.password.length < 8) {
            return "La contraseña debe tener al menos 8 caracteres"
        }

        if (!formData.nit.trim()) {
            return "El NIT es obligatorio"
        }

        if (!formData.nombre_cliente.trim()) {
            return "El nombre es obligatorio"
        }

        if (!formData.empresa_nombre.trim()) {
            return "Debe seleccionar una empresa"
        }

        return null
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setSuccess("")

        const validationError = validateForm()
        if (validationError) {
            setError(validationError)
            return
        }

        setLoading(true)

        try {
            const res = await fetch("http://localhost:8000/api/clientes/registrar/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    nit: formData.nit,
                    nombre_cliente: formData.nombre_cliente,
                    direccion_cliente: formData.direccion_cliente,
                    telefono_cliente: formData.telefono_cliente,
                    empresa_nombre: formData.empresa_nombre
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.detail || data.error || "Error en el registro")
            }

            setSuccess("¡Registro exitoso! Redirigiendo...")

            if (data.tokens) {
                localStorage.setItem("access", data.tokens.access)
                localStorage.setItem("refresh", data.tokens.refresh)
                localStorage.setItem("rol", "cliente")
                localStorage.setItem("user_email", data.cliente.email)
            }

            setTimeout(() => {
                router.push("/cliente")
            }, 2000)

        } catch (err) {
            setError(err.message || "Error en el registro. Intente nuevamente.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.formContainer}>
                <div className={styles.header}>
                    <h1>Registro de Cliente</h1>
                    <p>Complete el formulario para registrarse como cliente</p>
                </div>

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

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Información de acceso - EN UNA SOLA FILA */}
                    <div className={styles.section}>
                        <h2>Información de acceso</h2>
                        <div className={styles.row}>
                            <div className={styles.column}>
                                <FormField
                                    label="Correo electrónico *"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange("email")}
                                    placeholder="ejemplo@correo.com"
                                    required
                                />
                            </div>
                            <div className={styles.column}>
                                <FormField
                                    label="Contraseña *"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={handleChange("password")}
                                    placeholder="Mínimo 8 caracteres"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Datos personales - EN DOS COLUMNAS */}
                    <div className={styles.section}>
                        <h2>Datos personales</h2>
                        <div className={styles.row}>
                            <div className={styles.column}>
                                <FormField
                                    label="NIT o Cédula *"
                                    type="text"
                                    value={formData.nit}
                                    onChange={handleChange("nit")}
                                    placeholder="1234567890"
                                    required
                                />
                            </div>
                            <div className={styles.column}>
                                <FormField
                                    label="Nombre completo *"
                                    type="text"
                                    value={formData.nombre_cliente}
                                    onChange={handleChange("nombre_cliente")}
                                    placeholder="Juan Pérez"
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.row}>
                            <div className={styles.column}>
                                <FormField
                                    label="Dirección"
                                    type="text"
                                    value={formData.direccion_cliente}
                                    onChange={handleChange("direccion_cliente")}
                                    placeholder="Calle 123, Ciudad"
                                />
                            </div>
                            <div className={styles.column}>
                                <FormField
                                    label="Teléfono"
                                    type="tel"
                                    value={formData.telefono_cliente}
                                    onChange={handleChange("telefono_cliente")}
                                    placeholder="555-123-4567"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Selección de empresa */}
                    <div className={styles.section}>
                        <h2>Selección de empresa</h2>
                        <div className={styles.row}>
                            <div className={styles.fullColumn}>
                                <div className={styles.empresaField}>
                                    <label>Empresa a la que desea registrarse *</label>
                                    <select
                                        value={formData.empresa_nombre}
                                        onChange={handleChange("empresa_nombre")}
                                        className={styles.select}
                                        required
                                    >
                                        <option value="">Seleccione una empresa...</option>
                                        {empresas.map((empresa) => (
                                            <option key={empresa.id_empresa} value={empresa.nombre}>
                                                {empresa.nombre} {empresa.rubro ? `- ${empresa.rubro}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {empresas.length === 0 && (
                            <div className={styles.row}>
                                <div className={styles.fullColumn}>
                                    <p className={styles.infoMessage}>
                                        Cargando empresas disponibles...
                                    </p>
                                </div>
                            </div>
                        )}

                        {empresas.length > 0 && (
                            <div className={styles.row}>
                                <div className={styles.fullColumn}>
                                    <div className={styles.empresasCount}>
                                        <p>{empresas.length} empresas disponibles</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botón de registro */}
                    <div className={styles.submitSection}>
                        <Button
                            type="submit"
                            className={styles.submitButton}
                            disabled={loading}
                        >
                            {loading ? "Registrando..." : "Registrarse como Cliente"}
                        </Button>
                    </div>

                    {/* Enlace para login */}
                    <div className={styles.loginLink}>
                        <p className={styles.backLink}>
                            <a href="/login" className={styles.link}>
                                ← Volver al login general
                            </a>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    )
}