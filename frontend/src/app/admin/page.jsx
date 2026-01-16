"use client";

import { useState, useEffect } from "react";
import styles from "./DashboardAdmin.module.css";

export default function DashboardAdmin() {
  // ----------------- Estados -----------------
  const [users, setUsers] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [showEmpresaForm, setShowEmpresaForm] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Formularios
  const [empresaForm, setEmpresaForm] = useState({
    nombre: "",
    nit: "",
    direccion: "",
    telefono: "",
    email: "",
  });

  const [adminForm, setAdminForm] = useState({
    email: "",
    password: "",
    empresa_id: "",
  });

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

      // Asegurarse de que users sea un array
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


  const fetchEmpresas = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch("http://localhost:8000/api/empresas/listar/", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        setEmpresas(data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchEmpresas();
  }, []);

  // ----------------- Formularios -----------------
  const handleEmpresaFormChange = (e) => {
    setEmpresaForm({ ...empresaForm, [e.target.name]: e.target.value });
  };
  const handleAdminFormChange = (e) => {
    setAdminForm({ ...adminForm, [e.target.name]: e.target.value });
  };

  const handleOpenEmpresaForm = () => setShowEmpresaForm(true);
  const handleCloseEmpresaForm = () => {
    setShowEmpresaForm(false);
    setEmpresaForm({ nombre: "", nit: "", direccion: "", telefono: "", email: "" });
  };

  const handleOpenAdminForm = () => setShowAdminForm(true);
  const handleCloseAdminForm = () => {
    setShowAdminForm(false);
    setAdminForm({ email: "", password: "", empresa_id: "" });
  };

  const handleRegistrarEmpresa = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();
      if (!empresaForm.nombre || !empresaForm.nit || !empresaForm.email) {
        alert("Complete los campos obligatorios (*)");
        return;
      }

      const res = await fetch("http://localhost:8000/api/empresas/registrar/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(empresaForm),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Empresa registrada exitosamente");
        handleCloseEmpresaForm();
        fetchEmpresas();
        fetchUsers();
      } else {
        alert(`Error: ${data.detail || data.error || "Desconocido"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error al registrar empresa");
    }
  };

  const handleRegistrarAdminEmpresa = async (e) => {
    e.preventDefault();
    try {
      const token = getToken();

      const res = await fetch("http://localhost:8000/api/usuarios-empresa/registrar/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminForm.email,
          password: adminForm.password,
          rol_nombre: "admin_empresa",
          empresa_id: parseInt(adminForm.empresa_id),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Admin de empresa registrado exitosamente");
        handleCloseAdminForm();
        fetchUsers();
      } else {
        alert(`Error: ${data.detail || data.error || "Desconocido"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error al registrar admin de empresa");
    }
  };

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

  const toggleEmpresaEstado = async (id, currentEstado) => {
    try {
      const token = getToken();
      const nuevoEstado = currentEstado === "activo" ? "inactivo" : "activo";

      const res = await fetch(`http://localhost:8000/api/empresas/${id}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (res.ok) fetchEmpresas();
      else {
        const data = await res.json();
        alert(`Error al cambiar estado: ${data.detail || data.error || "Desconocido"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error al cambiar estado de la empresa");
    }
  };

  // ----------------- Eliminar usuario -----------------
  const deleteUser = async (id_usuario) => {
    if (!confirm("¿Seguro quieres eliminar este usuario? Esta acción no se puede deshacer.")) return;

    try {
      const token = getToken();
      const res = await fetch(`http://localhost:8000/api/usuarios/${id_usuario}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json", // Algunas APIs no requieren Content-Type en DELETE, pero no hace daño
        },
      });

      if (res.ok) {
        alert("Usuario eliminado correctamente");
        fetchUsers(); // Refresca la tabla
      } else {
        const data = await res.json();
        alert(`Error al eliminar usuario: ${data.detail || data.error || "Desconocido"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error al eliminar usuario");
    }
  };


  // ----------------- Eliminar empresa -----------------
  const deleteEmpresa = async (id_empresa) => {
    if (!confirm("¿Seguro quieres eliminar esta empresa?")) return;

    try {
      const token = getToken();
      const res = await fetch(`http://localhost:8000/api/empresas/${id_empresa}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert("Empresa eliminada correctamente");
        fetchEmpresas();
      } else {
        const data = await res.json();
        alert(`Error al eliminar empresa: ${data.detail || data.error || "Desconocido"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error al eliminar empresa");
    }
  };



  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard Admin</h1>

      {loading && <div className={styles.loading}>Cargando usuarios...</div>}

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={fetchUsers}>Reintentar</button>
        </div>
      )}

      {/* -------------------- TABLA USUARIOS -------------------- */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Usuarios ({users.length})</h2>
          <button onClick={fetchUsers} className={styles.primaryBtn}>
            Actualizar
          </button>
        </div>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Empresa</th>
                <th>Registro</th>
                <th>Último Login</th>
                <th>Eliminar</th> {/* Nueva columna */}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && !loading ? (
                <tr>
                  <td colSpan="8" className={styles.empty}>
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id_usuario} className={styles.userRow}>
                    <td>{user.id_usuario}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`${styles.rolBadge} ${styles[user.rol]}`}>{user.rol}</span>
                    </td>
                    <td>
                      <span className={`${styles.estadoBadge} ${styles[user.estado]}`}>
                        {user.estado}
                      </span>
                      <button
                        className={styles.primaryBtn}
                        style={{ marginLeft: "0.5rem", padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => toggleUserEstado(user.id_usuario, user.estado)}
                      >
                        {user.estado === "activo" ? "Inactivar" : "Activar"}
                      </button>
                    </td>
                    <td>{getEmpresaUsuario(user)}</td>
                    <td>{formatDate(user.fecha_creacion)}</td>
                    <td>{user.ultimo_login ? formatDate(user.ultimo_login) : "Nunca"}</td>
                    <td>
                      <button
                        className={styles.deleteBtn}
                        style={{ backgroundColor: "#e53e3e", color: "#fff", padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => deleteUser(user.id_usuario)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* -------------------- TABLA EMPRESAS -------------------- */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Empresas ({empresas.length})</h2>
          <button onClick={fetchEmpresas} className={styles.primaryBtn}>
            Actualizar
          </button>
        </div>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>NIT</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Registro</th>
                <th>Eliminar</th> {/* Nueva columna */}
              </tr>
            </thead>
            <tbody>
              {empresas.length === 0 ? (
                <tr>
                  <td colSpan="7" className={styles.empty}>
                    No hay empresas registradas
                  </td>
                </tr>
              ) : (
                empresas.map((empresa) => (
                  <tr key={empresa.id_empresa}>
                    <td>{empresa.id_empresa}</td>
                    <td>{empresa.nombre}</td>
                    <td>{empresa.nit}</td>
                    <td>{empresa.email}</td>
                    <td>
                      <span className={`${styles.estadoBadge} ${styles[empresa.estado]}`}>
                        {empresa.estado}
                      </span>
                      <button
                        className={styles.primaryBtn}
                        style={{ marginLeft: "0.5rem", padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => toggleEmpresaEstado(empresa.id_empresa, empresa.estado)}
                      >
                        {empresa.estado === "activo" ? "Inactivar" : "Activar"}
                      </button>
                    </td>
                    <td>{formatDate(empresa.fecha_creacion)}</td>
                    <td>
                      <button
                        className={styles.deleteBtn}
                        style={{ backgroundColor: "#e53e3e", color: "#fff", padding: "0.3rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => deleteEmpresa(empresa.id_empresa)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* -------------------- ACCIONES -------------------- */}
      <section className={styles.actions}>
        <button
          onClick={handleOpenEmpresaForm}
          className={styles.primaryButton}
        >
          + Registrar Nueva Empresa
        </button>
        <button
          onClick={handleOpenAdminForm}
          className={styles.secondaryButton}
        >
          + Registrar Admin de Empresa
        </button>
      </section>

      {/* -------------------- MODAL REGISTRAR EMPRESA -------------------- */}
      {showEmpresaForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Registrar Nueva Empresa</h3>
              <button onClick={handleCloseEmpresaForm} className={styles.closeButton}>
                &times;
              </button>
            </div>
            <form onSubmit={handleRegistrarEmpresa} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Nombre de la Empresa *</label>
                <input
                  type="text"
                  name="nombre"
                  placeholder="Ej: Mi Empresa SA"
                  value={empresaForm.nombre}
                  onChange={handleEmpresaFormChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>NIT *</label>
                <input
                  type="text"
                  name="nit"
                  placeholder="Ej: 900123456-7"
                  value={empresaForm.nit}
                  onChange={handleEmpresaFormChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Dirección *</label>
                <input
                  type="text"
                  name="direccion"
                  placeholder="Ej: Calle 123 #45-67"
                  value={empresaForm.direccion}
                  onChange={handleEmpresaFormChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Teléfono *</label>
                <input
                  type="text"
                  name="telefono"
                  placeholder="Ej: 6012345678"
                  value={empresaForm.telefono}
                  onChange={handleEmpresaFormChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Email de la Empresa *</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Ej: contacto@empresa.com"
                  value={empresaForm.email}
                  onChange={handleEmpresaFormChange}
                  required
                />
              </div>

              <div className={styles.infoBox}>
                <p><strong>Registrada por:</strong> Tú (Admin del sistema)</p>
                <p><strong>Nota:</strong> Después de registrar la empresa, asigne un administrador usando la opción "Registrar Admin de Empresa".</p>
              </div>

              <div className={styles.modalActions}>
                <button type="submit" className={styles.submitButton}>
                  Registrar Empresa
                </button>
                <button
                  type="button"
                  onClick={handleCloseEmpresaForm}
                  className={styles.cancelButton}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL REGISTRAR ADMIN EMPRESA -------------------- */}
      {showAdminForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Registrar Admin de Empresa</h3>
              <button onClick={handleCloseAdminForm} className={styles.closeButton}>
                &times;
              </button>
            </div>
            <form onSubmit={handleRegistrarAdminEmpresa} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Ej: admin@nuevaempresa.com"
                  value={adminForm.email}
                  onChange={handleAdminFormChange}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Mínimo 8 caracteres"
                  value={adminForm.password}
                  onChange={handleAdminFormChange}
                  required
                  minLength="8"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Empresa *</label>
                <select
                  name="empresa_id"
                  value={adminForm.empresa_id}
                  onChange={handleAdminFormChange}
                  required
                >
                  <option value="">Seleccionar Empresa</option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id_empresa} value={empresa.id_empresa}>
                      {empresa.nombre} ({empresa.nit})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.modalActions}>
                <button type="submit" className={styles.submitButton}>
                  Registrar Admin
                </button>
                <button
                  type="button"
                  onClick={handleCloseAdminForm}
                  className={styles.cancelButton}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
