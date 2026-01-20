"use client";

import { useState, useEffect } from "react";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import ActionMenu from "../../../components/ui/ActionMenu/ActionMenu";
import Button from "../../../components/ui/Button/Button";
import SearchBar from "../../../components/ui/SearchBar/SearchBar";
import Tables from "../../../components/ui/tables/table";
import EditForm from "../../../components/ui/EditForm/EditForm";
import FormField from "../../../components/ui/FormField/FormField";
import SelectField from "../../../components/ui/SelectField/SelectField";
import styles from "./admins_empresa.module.css";

export default function DashboardAdminEmpresa() {
  // ----------------- Estados -----------------
  const [users, setUsers] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);

  const [adminForm, setAdminForm] = useState({
    email: "",
    password: "",
    empresa_id: "",
  });

  // ----------------- Helpers -----------------
  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("access") : null;

  // ----------------- Fetch Users -----------------
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) throw new Error("No autenticado");

      const res = await fetch("http://localhost:8000/api/usuarios-empresa/listar/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);

      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ----------------- Fetch Empresas -----------------
  const fetchEmpresas = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch("http://localhost:8000/api/empresas/listar/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        setEmpresas(Array.isArray(data) ? data : []);
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
  const handleAdminFormChange = (e) => {
    setAdminForm({
      ...adminForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleOpenAdminForm = () => setShowAdminForm(true);

  const handleCloseAdminForm = () => {
    setShowAdminForm(false);
    setAdminForm({ email: "", password: "", empresa_id: "" });
  };

  const handleRegistrarAdminEmpresa = async (e) => {
    e.preventDefault();

    try {
      const token = getToken();
      if (!token) throw new Error("No autenticado");

      const res = await fetch(
        "http://localhost:8000/api/usuarios-empresa/registrar/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: adminForm.email,
            password: adminForm.password,
            rol_nombre: "admin_empresa",
            empresa_id: Number(adminForm.empresa_id),
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert("Admin de empresa registrado exitosamente");
        handleCloseAdminForm();
        fetchUsers();
      } else {
        alert(data.detail || data.error || "Error desconocido");
      }
    } catch (err) {
      console.error(err);
      alert("Error al registrar admin de empresa");
    }
  };

  // ----------------- Tabla -----------------
  const columns = [
    { label: "nombre", key: "nombre" },
    { label: "Email", key: "email" },
    { label: "Rol", key: "rol" },
    { label: "Estado", key: "estado" },
    { label: "Registro", key: "fecha_creacion" },
    { label: "Último Login", key: "ultimo_login" },
    { label: "Acciones", key: "acciones" },
  ];

  const rows = Array.isArray(users)
    ? users.map((u) => ({
        ...u,
        acciones: (
          <ActionMenu>
            <span>ID: {u.id_usuario}</span>
          </ActionMenu>
        ),
      }))
    : [];

  // ----------------- Render -----------------
  return (
    <div className={styles.dashboardContainer}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className={`${styles.mainContent} ${collapsed ? styles.collapsed : ""}`}>
        <h1>Admin de Empresas</h1>

        {loading && <p>Cargando usuarios...</p>}
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <Button onClick={handleOpenAdminForm}>
            + Registrar Admin de Empresa
          </Button>
        </div>

        <Tables columns={columns} rows={rows} data={users}/>

        {showAdminForm && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h3>Registrar Admin de Empresa</h3>

              <form onSubmit={handleRegistrarAdminEmpresa}>
                <FormField
                  type="email"
                  name="email"
                  label="Email"
                  placeholder="Email"
                  value={adminForm.email}
                  onChange={handleAdminFormChange}
                  required
                />
                <FormField
                  type="password"
                  name="password"
                  label="Password"
                  placeholder="Password"
                  value={adminForm.password}
                  onChange={handleAdminFormChange}
                  required
                />

                <SelectField
                  label="Empresa"
                  name="empresa_id"
                  value={adminForm.empresa_id}
                  onChange={handleAdminFormChange}
                  options={empresas.map(e => ({ value: e.id_empresa, label: e.nombre }))}
                  required
                />

                <div className={styles.modalActions}>
                  <button type="submit">Registrar</button>
                  <button type="button" onClick={handleCloseAdminForm}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
