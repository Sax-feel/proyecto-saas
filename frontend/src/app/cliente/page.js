"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./DashboardCliente.module.css";

export default function ClientePage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState([]);

  useEffect(() => {
    // Validar sesión
    const access = localStorage.getItem("access");
    const rol = localStorage.getItem("rol");

    if (!access || rol !== "cliente") {
      router.push("/login");
      return;
    }

    // ejemplo estático
    setEmpresas([
      { id: 1, nombre: "Empresa A", nit: "123456789", estado: "Activo" },
      { id: 2, nombre: "Empresa B", nit: "987654321", estado: "Inactivo" },
      { id: 3, nombre: "Empresa C", nit: "456789123", estado: "Activo" },
    ]);
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Mis Empresas</h1>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>NIT</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {empresas.map((empresa) => (
            <tr key={empresa.id}>
              <td>{empresa.id}</td>
              <td>{empresa.nombre}</td>
              <td>{empresa.nit}</td>
              <td>{empresa.estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
