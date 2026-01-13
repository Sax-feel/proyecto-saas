"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./DashboardVendedor.module.css";

export default function VendedorPage() {
  const router = useRouter();

  const [empresa, setEmpresa] = useState({
    nombre: "SuperTienda",
    nit: "123456",
    estado: "Activo",
  });

  const [clientes, setClientes] = useState([
    { email: "cliente1@mail.com", nombre: "Cliente 1", estado: "Activo" },
    { email: "cliente2@mail.com", nombre: "Cliente 2", estado: "Activo" },
  ]);

  const [productos, setProductos] = useState([
    { nombre: "Producto A", stock: 10, precio: 25 },
    { nombre: "Producto B", stock: 5, precio: 15 },
  ]);

  // Verificar login y rol
  useEffect(() => {
    const rol = localStorage.getItem("rol");
    if (!rol || rol !== "vendedor") {
      router.push("/login");
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard Vendedor</h1>

      <section className={styles.section}>
        <h2>Empresa</h2>
        <p><strong>Nombre:</strong> {empresa.nombre}</p>
        <p><strong>NIT:</strong> {empresa.nit}</p>
        <p><strong>Estado:</strong> {empresa.estado}</p>
      </section>

      <section className={styles.section}>
        <h2>Clientes</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Nombre</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c, i) => (
              <tr key={i}>
                <td>{c.email}</td>
                <td>{c.nombre}</td>
                <td>{c.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.section}>
        <h2>Productos</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Stock</th>
              <th>Precio</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p, i) => (
              <tr key={i}>
                <td>{p.nombre}</td>
                <td>{p.stock}</td>
                <td>${p.precio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <button className={styles.logout} onClick={handleLogout}>Cerrar Sesión</button>
    </div>
  );
}
