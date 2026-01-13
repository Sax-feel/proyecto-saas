"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:8000/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError("Credenciales inválidas");
        return;
      }

      localStorage.setItem("access", data.tokens.access);
      localStorage.setItem("refresh", data.tokens.refresh);

      // DATOS DE USUARIO
      const rol = data.user.rol.toLowerCase();
      const emailUser = data.user.email;

      localStorage.setItem("rol", rol);
      localStorage.setItem("user_email", emailUser);

      // REDIRECCIÓN POR ROL
      if (rol === "admin") {
        router.push("/admin");
      } else if (rol === "cliente") {
        router.push("/cliente");
      } else if (rol === "admin_empresa") {
        router.push("/usuario_empresa");
      } else if (rol === "vendedor") {
        router.push("/vendedor");
      } else {
        console.warn("Rol no reconocido:", rol);
        router.push("/login");
      }

    } catch (err) {
      setError("Error de conexión con el servidor");
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleLogin} className={styles.form}>
        {error && <p className={styles.error}>{error}</p>}

        <h1 className={styles.title}>Login</h1>

        <label className={styles.label}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
          placeholder="user@email.com"
          required
        />

        <label className={styles.label}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          placeholder="******"
          required
        />

        <button type="submit" className={styles.button}>
          Login
        </button>
      </form>
    </div>
  );
}
