"use client"

import { useState } from "react"
import Link from "next/link"
import styles from "./RecuperarPassword.module.css"

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setMessage("")
    setIsLoading(true)

    try {
      const res = await fetch("http://localhost:8000/api/auth/password-reset/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setMessage("Si el correo existe, recibirás instrucciones para recuperar tu contraseña.")
        setEmail("")
      } else {
        const data = await res.json()
        setError(data.message || "Error al procesar la solicitud")
      }
    } catch (err) {
      setError("Error de conexión con el servidor")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Recuperar Contraseña</h1>
          <p>Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}
          {message && <div className={styles.success}>{message}</div>}

          <div className={styles.field}>
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@empresa.com"
              required
              className={styles.input}
            />
          </div>

          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? "Enviando..." : "Enviar enlace de recuperación"}
          </button>

          <div className={styles.backLink}>
            <Link href="/login">← Volver al inicio de sesión</Link>
          </div>
        </form>
      </div>
    </div>
  )
}