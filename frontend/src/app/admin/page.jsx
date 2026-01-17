"use client";

import { useState, useEffect } from "react";
import Tables from "../../components/ui/tables/table";
import Sidebar from "../../components/layout/Sidebar/Sidebar";
import styles from "./DashboardAdmin.module.css";

export default function DashboardAdmin() {
  // ----------------- Estados -----------------
  const [users, setUsers] = useState([]);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ----------------- Estado del sidebar -----------------
  const [collapsed, setCollapsed] = useState(false);

  // ----------------- Funciones básicas -----------------
  const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("access") : null);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getEmpresaUsuario = (user) => user.empresas_nombres || "-";

  // ----------------- Fetch API -----------------
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) throw new Error("No hay token de autenticación");

      const res = await fetch("http://localhost:8000/api/usuarios/todos/", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const usersArray = Array.isArray(data) ? data : data.usuarios ? data.usuarios : [data];
      setUsers(usersArray);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(`Error al cargar usuarios: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ----------------- Cambiar estado -----------------
  const toggleUserEstado = async (id, currentEstado) => {
    try {
      const token = getToken();
      const nuevoEstado = currentEstado === "activo" ? "inactivo" : "activo";

      const res = await fetch(`http://localhost:8000/api/usuarios/${id}/`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (res.ok) fetchUsers();
      else {
        const data = await res.json();
        alert(`Error al cambiar estado: ${data.detail || data.error || "Desconocido"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error al cambiar estado del usuario");
    }
  };

  // ----------------- Eliminar usuario -----------------
  const deleteUser = async (id_usuario) => {
    if (!confirm("¿Seguro quieres eliminar este usuario? Esta acción no se puede deshacer.")) return;

    try {
      const token = getToken();
      const res = await fetch(`http://localhost:8000/api/usuarios/${id_usuario}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (res.ok) {
        alert("Usuario eliminado correctamente");
        fetchUsers();
      } else {
        const data = await res.json();
        alert(`Error al eliminar usuario: ${data.detail || data.error || "Desconocido"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error al eliminar usuario");
    }
  };

  // ----------------- Columnas tabla -----------------
  const userColumns = [
    { key: "id_usuario", label: "ID" },
    { key: "email", label: "Email" },
    { key: "rol", label: "Rol", render: (row) => <span className={`${styles.rolBadge} ${styles[row.rol]}`}>{row.rol}</span> },
    { 
      key: "estado", 
      label: "Estado",
      render: (row) => (
        <>
          <span className={`${styles.estadoBadge} ${styles[row.estado]}`}>{row.estado}</span>
          <button
            className={styles.primaryBtn}
            style={{ marginLeft: "0.5rem", padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
            onClick={() => toggleUserEstado(row.id_usuario, row.estado)}
          >
            {row.estado === "activo" ? "Inactivar" : "Activar"}
          </button>
        </>
      )
    },
    { key: "empresa", label: "Empresa", render: (row) => getEmpresaUsuario(row) },
    { key: "fecha_creacion", label: "Registro", render: (row) => formatDate(row.fecha_creacion) },
    { key: "ultimo_login", label: "Último Login", render: (row) => row.ultimo_login ? formatDate(row.ultimo_login) : "Nunca" },
  ];

  const renderUserActions = (row) => (
    <button
      className={styles.deleteBtn}
      style={{ backgroundColor: "#e53e3e", color: "#fff", padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
      onClick={() => deleteUser(row.id_usuario)}
    >
      Eliminar
    </button>
  );

  // ----------------- Render -----------------
  return (
<div className={styles.container}>
  <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
  <div className={`${styles.center} ${collapsed ? styles.collapsed : ""}`}>
    <h1 className={styles.title}>Dashboard Admin</h1>

    {loading && <div>Cargando usuarios...</div>}
    {error && <div>{error}</div>}

    <section className={styles.section}>
      <Tables
        columns={userColumns}
        data={users}
        renderActions={renderUserActions}
        emptyMessage="No hay usuarios registrados"
        rowKey="id_usuario"
      />
    </section>
  </div>
</div>



  );
}
