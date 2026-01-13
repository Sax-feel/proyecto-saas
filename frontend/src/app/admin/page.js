"use client";

import { useState, useEffect } from "react";
import styles from "./DashboardAdmin.module.css";

export default function DashboardAdmin() {
  const [users, setUsers] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [showEmpresaForm, setShowEmpresaForm] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);

  useEffect(() => {
  }, []);

  const handleOpenEmpresaForm = () => setShowEmpresaForm(true);
  const handleCloseEmpresaForm = () => setShowEmpresaForm(false);

  const handleOpenAdminForm = () => setShowAdminForm(true);
  const handleCloseAdminForm = () => setShowAdminForm(false);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard Admin</h1>

      {/* -------------------- TABLA USUARIOS -------------------- */}
      <section className={styles.section}>
        <h2>Usuarios</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Empresa</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="4" className={styles.empty}>
                  No hay usuarios aún
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id_usuario}>
                  <td>{user.email}</td>
                  <td>{user.rol}</td>
                  <td>{user.estado}</td>
                  <td>{user.empresa ? user.empresa.nombre : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* -------------------- TABLA EMPRESAS -------------------- */}
      <section className={styles.section}>
        <h2>Empresas</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>NIT</th>
              <th>Estado</th>
              <th>Admin</th>
            </tr>
          </thead>
          <tbody>
            {empresas.length === 0 ? (
              <tr>
                <td colSpan="4" className={styles.empty}>
                  No hay empresas aún
                </td>
              </tr>
            ) : (
              empresas.map((empresa) => (
                <tr key={empresa.id_empresa}>
                  <td>{empresa.nombre}</td>
                  <td>{empresa.nit}</td>
                  <td>{empresa.estado}</td>
                  <td>{empresa.admin ? empresa.admin.email : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className={styles.actions}>
        <button onClick={handleOpenEmpresaForm}>Registrar Empresa</button>
        <button onClick={handleOpenAdminForm}>Registrar Admin de Empresa</button>
      </section>

      {showEmpresaForm && (
        <div className={styles.modal}>
          <h3>Registrar Nueva Empresa</h3>
          <form>
            <input type="text" placeholder="Nombre Empresa" />
            <input type="text" placeholder="NIT" />
            <button type="submit">Guardar</button>
            <button type="button" onClick={handleCloseEmpresaForm}>
              Cancelar
            </button>
          </form>
        </div>
      )}

      {showAdminForm && (
        <div className={styles.modal}>
          <h3>Registrar Admin de Empresa</h3>
          <form>
            <input type="email" placeholder="Email" />
            <input type="password" placeholder="Password" />
            <select>
              <option value="">Seleccionar Empresa</option>
              {empresas.map((e) => (
                <option key={e.id_empresa} value={e.id_empresa}>
                  {e.nombre}
                </option>
              ))}
            </select>
            <button type="submit">Guardar</button>
            <button type="button" onClick={handleCloseAdminForm}>
              Cancelar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}