"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Button from "../../components/ui/Button/Button"
import FormField from "../../components/ui/FormField/FormField"
import styles from "./LoginPage.module.css";
import Link from "next/link"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")

    try {
      const res = await fetch("http://localhost:8000/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError("Credenciales inválidas")
        return
      }

      localStorage.setItem("access", data.tokens.access)
      localStorage.setItem("refresh", data.tokens.refresh)
      const rol = data.user.rol.toLowerCase()
      localStorage.setItem("rol", rol)
      localStorage.setItem("user_email", data.user.email)

      if (rol === "admin") router.push("/admin")
      else if (rol === "cliente") router.push("/cliente")
      else if (rol === "admin_empresa") router.push("/usuario_empresa")
      else if (rol === "vendedor") router.push("/vendedor/productos_vendedor")
      else router.push("/login")

    } catch (err) {
      setError("Error de conexión con el servidor")
    }
  }

  return (
    <form className={styles.form} onSubmit={handleLogin}> {/* Usamos styles.form */}
      <div className={styles.header}>
        <h1>Inicie sesión en su cuenta</h1>
        <p>Ingrese su correo electrónico a continuación para iniciar sesión en su cuenta.</p>
      </div>

      {/* ERROR - también podemos usar una clase CSS para esto */}
      {error && (
        <p className={styles.errorMessage}>
          {error}
        </p>
      )}

      <FormField
        label="Correo electrónico"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="correo@empresa.com"
        required
      />

      <FormField
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="********"
        link="¿Olvidaste tu contraseña?"
        linkHref="/login/recuperar-password"
        required
      />

      <Button type="submit">Login</Button>
      {/* Enlace para login como cliente */}
      <div className={styles.clientLoginSection}>
        <div className={styles.separator}>
          <span>O</span>
        </div>
        
        <p className={styles.clientLoginText}>
          ¿Desea ser cliente de alguna empresa?
        </p>
        <Link href="/login/registro-cliente" className={styles.registerLink}>
            Regístrese aquí
        </Link>
      </div>
    </form>
  )
}