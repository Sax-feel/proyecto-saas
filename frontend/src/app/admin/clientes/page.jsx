"use client";

import { useState, useEffect } from "react";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import ActionMenu from "../../../components/ui/ActionMenu/ActionMenu";
import styles from "./clientes.module.css";

export default function DashboardClientesEmpresa() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [clienteForm, setClienteForm] = useState({ email: "", password: "" });

  // Sidebar
  const [collapsed, setCollapsed] = useState(false);

  // Función para obtener token
  const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("access") : null);

  // Formato de fecha
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  // ================== FETCH CLIENTES ==================
  const fetchClientes = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) throw new Error("No hay token de autenticación");

      const res = await fetch("http://localhost:8000/api/clientes/listar/", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      const data = await res.json();
      console.log("RESPUESTA DEL BACKEND (listar):", data);

      if (!res.ok) throw new Error(JSON.stringify(data));

      setClientes(Array.isArray(data) ? data : data.clientes || []);
      setError(null);
    } catch (err) {
      setError(`Error al cargar clientes:\n${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClientes(); }, []);

  // ================== CAMBIAR ESTADO ==================
  const toggleClienteEstado = async (id, currentEstado) => {
    try {
      const token = getToken();
      const nuevoEstado = currentEstado === "activo" ? "inactivo" : "activo";
      const res = await fetch(`http://localhost:8000/api/clientes/${id}/`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      const data = await res.json();
      console.log("RESPUESTA DEL BACKEND (toggle estado):", data);

      if (res.ok) fetchClientes();
      else alert(`Error al cambiar estado:\n${JSON.stringify(data)}`);
    } catch (err) {
      alert(`Error al cambiar estado:\n${err.message}`);
    }
  };

  // ================== ELIMINAR CLIENTE ==================
  const deleteCliente = async (id) => {
    if (!confirm("¿Seguro quieres eliminar este cliente?")) return;
    try {
      const token = getToken();
      const res = await fetch(`http://localhost:8000/api/clientes/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) { 
        alert("Cliente eliminado"); 
        fetchClientes(); 
      } else {
        const data = await res.json();
        alert(`Error al eliminar cliente:\n${JSON.stringify(data)}`);
      }
    } catch (err) {
      alert(`Error al eliminar cliente:\n${err.message}`);
    }
  };

  // ================== RENDER ==================
  return (
    <div className={styles.dashboardContainer}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div className={`${styles.mainContent} ${collapsed ? styles.collapsed : ""}`}>
        <h1 className={styles.title}>Dashboard Clientes Empresa</h1>

        {loading && <div>Cargando clientes...</div>}
        {error && <div style={{ color: "red", whiteSpace: "pre-wrap" }}>{error} <button onClick={fetchClientes}>Reintentar</button></div>}

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Clientes ({clientes.length})</h2>
            <button onClick={fetchClientes} className={styles.primaryBtn}>Actualizar</button>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>Registro</th>
                  <th>Último Login</th>
                  <th>Eliminar</th>
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.empty}>No hay clientes registrados</td>
                  </tr>
                ) : (
                  clientes.map(c => (
                    <tr key={c.id_cliente}>
                      <td>{c.id_cliente}</td>
                      <td>{c.email}</td>
                      <td>
                        <span className={`${styles.estadoBadge} ${styles[c.estado]}`}>{c.estado}</span>
                      </td>
                      <td>{formatDate(c.fecha_creacion)}</td>
                      <td>{c.ultimo_login ? formatDate(c.ultimo_login) : "Nunca"}</td>
                      
                      {/* Aquí combinamos Estado + Eliminar en un solo ActionMenu */}
                      <td className={styles.actionsCell}>
                        <ActionMenu
                          id={c.id_cliente}
                          estado={c.estado}
                          onEditar={() => alert("Editar cliente (pendiente)")}
                          onToggle={toggleClienteEstado}
                          onEliminar={deleteCliente}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
