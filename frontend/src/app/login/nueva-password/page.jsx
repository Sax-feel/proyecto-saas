"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Button from "../../../components/ui/Button/Button"
import FormField from "../../../components/ui/FormField/FormField"
import styles from "./NuevaContraseña.module.css"

export default function NuevaPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [token, setToken] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [validatingToken, setValidatingToken] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()

  // 1. Obtener token de la URL y validarlo
  useEffect(() => {
    const tokenFromUrl = searchParams.get("token")

    if (!tokenFromUrl) {
      setError("Token no encontrado. Por favor, usa el enlace del correo electrónico.")
      setValidatingToken(false)
      return
    }

    setToken(tokenFromUrl)

    // Validar token con el backend
    const validateToken = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/auth/password-reset/validate-token/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenFromUrl }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.detail || "Token inválido o expirado")
          setValidatingToken(false)
          return
        }

        if (data.data && data.data.email) {
          setEmail(data.data.email)
        }

        setValidatingToken(false)
      } catch (err) {
        setError("Error de conexión al validar el token")
        setValidatingToken(false)
      }
    }

    validateToken()
  }, [searchParams])

  const handleUpdate = async (e) => {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    if (!token) {
      setError("Token no disponible")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("http://localhost:8000/api/auth/password-reset/confirm/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          new_password: password,
          confirm_password: confirmPassword
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || data.error || "Error al actualizar la contraseña")
        setLoading(false)
        return
      }

      setMessage("✅ Contraseña actualizada correctamente. Redirigiendo al login...")

      setTimeout(() => {
        router.push("/login")
      }, 3000)

    } catch (err) {
      setError("❌ Error de conexión con el servidor. Verifica tu conexión a internet.")
    } finally {
      setLoading(false)
    }
  }

  if (validatingToken) {
    return (
      <div className={styles.container}>
        <div className={styles.contentWrapper}>
          <div className={styles.center}>
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Validando enlace de recuperación...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !token) {
    return (
      <div className={styles.container}>
        <div className={styles.contentWrapper}>
          <div className={styles.center}>
            <div className={styles.errorContainer}>
              <h1>Enlace inválido</h1>
              <p className={styles.error}>{error}</p>
              <Button onClick={() => router.push("/forgot-password")}>
                Solicitar nuevo enlace
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <div className={styles.left}>
          <div className={styles.brand}>
            <div className={styles.logo}>◎</div>
            SAASFLOW.
          </div>
        </div>

        <div className={styles.center}>
          <form className={styles.form} onSubmit={handleUpdate}>
            <div className={styles.header}>
              <h1>Nueva contraseña</h1>
              <p>
                {email
                  ? `Actualiza la contraseña para ${email}`
                  : "Crea una nueva contraseña segura"
                }
              </p>
            </div>

            {error && <div className={styles.errorMessage}>{error}</div>}
            {message && <div className={styles.successMessage}>{message}</div>}

            <FormField
              label="Nueva contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              helpText="Debe incluir mayúsculas, minúsculas y números"
            />

            <FormField
              label="Confirmar contraseña"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              required
            />

            <Button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              loading={loading}
            >
              {loading ? "Actualizando..." : "Actualizar contraseña"}
            </Button>

            <div className={styles.links}>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => router.push("/login")}
              >
                ← Volver al login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}