"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Button from "../../../../components/ui/Button/Button"
import FormField from "../../../../components/ui/FormField/FormField"
import styles from "./RegistroCliente.module.css"

export default function RegistroClienteForm() {
    const router = useRouter()
    const params = useParams()
    const idEmpresa = params.id
    
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        nit: "",
        nombre_cliente: "",
        direccion_cliente: "",
        telefono_cliente: "",
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [empresaInfo, setEmpresaInfo] = useState(null)

    // Obtener información de la empresa
    useEffect(() => {
        if (idEmpresa) {
            fetchEmpresaInfo()
        }
    }, [idEmpresa])

    const fetchEmpresaInfo = async () => {
        try {
            const res = await fetch(`http://localhost:8000/api/empresas/public/${idEmpresa}/`)
            const data = await res.json()
            
            if (res.ok) {
                setEmpresaInfo(data.empresa || data)
            }
        } catch (err) {
            console.log("No se pudo obtener información de la empresa:", err)
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
            const res = await fetch("http://localhost:8000/api/clientes/registrar-con-empresa/", {
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
                    id_empresa: parseInt(idEmpresa)  // Enviar ID de la empresa
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.detail || data.error || "Error en el registro")
            }

            setSuccess("¡Registro exitoso! Redirigiendo a la empresa...")

            if (data.tokens) {
                localStorage.setItem("access", data.tokens.access)
                localStorage.setItem("refresh", data.tokens.refresh)
                localStorage.setItem("rol", "cliente")
                localStorage.setItem("user_email", data.cliente.email)
                localStorage.setItem("id_empresa", idEmpresa)  // Guardar ID de empresa
            }

            // Redirigir a la página de la empresa
            setTimeout(() => {
                router.push(`/empresa/${idEmpresa}`)
            }, 2000)

        } catch (err) {
            setError(err.message || "Error en el registro. Intente nuevamente.")
        } finally {
            setLoading(false)
        }
    }

    const handleSeguirComprando = () => {
        router.push(`/empresa/${idEmpresa}`)
    }

    return (
        <div className={styles.container}>
            <div className={styles.formContainer}>
                <div className={styles.header}>
                    <h1>Registro de Cliente</h1>
                    {empresaInfo && (
                        <p className={styles.empresaInfo}>
                            Registrándose como cliente de: <strong>{empresaInfo.nombre}</strong>
                        </p>
                    )}
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

                    {/* Botón para seguir comprando sin registro */}
                    <div className={styles.alternativeSection}>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleSeguirComprando}
                            className={styles.comprarButton}
                        >
                            Seguir comprando sin registrarse
                        </Button>
                        <p className={styles.alternativeText}>
                            Podrás realizar compras sin crear una cuenta
                        </p>
                    </div>
                </form>
            </div>
        </div>
    )
}