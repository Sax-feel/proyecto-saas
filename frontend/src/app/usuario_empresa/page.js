"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./DashboardUsuarioEmpresa.module.css";

export default function EmpresaPage() {
  const router = useRouter();
  
  // Mock data
  const [empresa, setEmpresa] = useState({
    nombre: "SuperTienda",
    nit: "123456",
    estado: "Activo",
  });

  const [empleados, setEmpleados] = useState([
    { email: "vendedor1@mail.com", rol: "Vendedor", estado: "Activo" },
    { email: "cliente1@mail.com", rol: "Cliente", estado: "Activo" },
  ]);

  const [productos, setProductos] = useState([
    { nombre: "Producto A", stock: 10, precio: 25 },
    { nombre: "Producto B", stock: 5, precio: 15 },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [nuevoEmpleado, setNuevoEmpleado] = useState({ email: "", password: "", rol: "vendedor" });

  // Verificar que esté logueado y con rol correcto
  useEffect(() => {
    const rol = localStorage.getItem("rol");
    if (!rol || rol !== "admin_empresa") {
      router.push("/login");
    }
  }, []);

  const handleAgregarEmpleado = (e) => {
    e.preventDefault();
    setEmpleados([...empleados, { ...nuevoEmpleado, estado: "Activo" }]);
    setNuevoEmpleado({ email: "", password: "", rol: "vendedor" });
    setShowModal(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard Usuario Empresa</h1>

      {/* Sección Empresa */}
      <section className={styles.section}>
        <h2>Información de la Empresa</h2>
        <p><strong>Nombre:</strong> {empresa.nombre}</p>
        <p><strong>NIT:</strong> {empresa.nit}</p>
        <p><strong>Estado:</strong> {empresa.estado}</p>
      </section>

      {/* Sección Empleados */}
      <section className={styles.section}>
        <h2>Empleados</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map((emp, i) => (
              <tr key={i}>
                <td>{emp.email}</td>
                <td>{emp.rol}</td>
                <td>{emp.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className={styles.button} onClick={() => setShowModal(true)}>Agregar Empleado</button>
      </section>

      {/* Modal para nuevo empleado */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Registrar Nuevo Empleado</h3>
            <form onSubmit={handleAgregarEmpleado} className={styles.form}>
              <label>Email:</label>
              <input 
                type="email" 
                value={nuevoEmpleado.email} 
                onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, email: e.target.value})}
                required
              />
              <label>Password:</label>
              <input 
                type="password" 
                value={nuevoEmpleado.password} 
                onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, password: e.target.value})}
                required
              />
              <label>Rol:</label>
              <select
                value={nuevoEmpleado.rol}
                onChange={(e) => setNuevoEmpleado({...nuevoEmpleado, rol: e.target.value})}
              >
                <option value="vendedor">Vendedor</option>
                <option value="cliente">Cliente</option>
              </select>
              <div className={styles.modalButtons}>
                <button type="submit" className={styles.button}>Registrar</button>
                <button type="button" className={styles.buttonCancel} onClick={() => setShowModal(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sección Productos */}
      <section className={styles.section}>
        <h2>Productos Existentes</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Stock</th>
              <th>Precio</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((prod, i) => (
              <tr key={i}>
                <td>{prod.nombre}</td>
                <td>{prod.stock}</td>
                <td>${prod.precio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <button className={styles.logout} onClick={handleLogout}>Cerrar Sesión</button>
    </div>
  );
}
