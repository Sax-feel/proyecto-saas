"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import ReCAPTCHA from "react-google-recaptcha"
import Button from "../../components/ui/Button/Button"
import FormField from "../../components/ui/FormField/FormField"
import styles from "./LoginPage.module.css";
import Link from "next/link"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()
  const [captchaToken, setCaptchaToken] = useState(null)

  const handleLogin = async (e) => {
  e.preventDefault()
  setError("")

  if (!captchaToken) {
    setError("Por favor confirme que no es un robot")
    return
  }

  try {
    const res = await fetch("http://localhost:8000/api/auth/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        recaptcha_token: captchaToken
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.detail || "Credenciales inválidas")
      return
    }

    const rol = data.user?.rol?.toLowerCase()
    if (!rol) {
      setError("No se pudo determinar el rol del usuario")
      return
    }

    localStorage.setItem("access", data.tokens.access)
    localStorage.setItem("refresh", data.tokens.refresh)
    localStorage.setItem("rol", rol)
    localStorage.setItem("user_email", data.user.email)

    switch (rol) {
      case "admin":
        router.push("/admin")
        break
      case "cliente":
        router.push("/cliente")
        break
      case "admin_empresa":
        router.push("/usuario_empresa")
        break
      case "vendedor":
        router.push("/vendedor/productos_vendedor")
        break
      default:
        setError("Rol desconocido, no se puede redirigir")
    }

  } catch (err) {
    console.error("Error en login:", err)
    setError("Error de conexión con el servidor")
  }
}


  return (
    <form className={styles.form} onSubmit={handleLogin}>
      <div className={styles.header}>
        <h1>Inicie sesión en su cuenta</h1>
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

      <ReCAPTCHA
        sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
        onChange={(token) => setCaptchaToken(token)}
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