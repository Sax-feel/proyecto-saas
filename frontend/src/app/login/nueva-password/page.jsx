"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Button from "../../../components/ui/Button/Button"
import FormField from "../../../components/ui/FormField/FormField"
import styles from "./NuevaContraseña.module.css"

export default function NuevaPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const router = useRouter()

  const handleUpdate = async (e) => {
    e.preventDefault()
    setError("")
    setMessage("")

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    // ======================
    // Demo visual: comentar fetch temporalmente
    // ======================
    /*
    try {
      const res = await fetch("http://localhost:8000/api/auth/password-reset/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || "Error al actualizar la contraseña")
        return
      }

      setMessage("Contraseña actualizada correctamente")
      setTimeout(() => router.push("/login"), 2000)
    } catch (err) {
      setError("Error de conexión con el servidor")
    }
    */

    // Simular éxito visual
    setMessage("Contraseña actualizada correctamente (modo demo)")
    // setTimeout(() => router.push("/login"), 2000)
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
              <p>Crea una contraseña segura para tu cuenta</p>
            </div>

            {error && <p className={styles.error}>{error}</p>}
            {message && <p className={styles.success}>{message}</p>}

            <FormField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <FormField
              label="Confirmar contraseña"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button type="submit">Actualizar contraseña</Button>
          </form>
        </div>
      </div>
    </div>
  )
}