"use client";

import { useState, useEffect } from "react";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import ActionMenu from "../../../components/ui/ActionMenu/ActionMenu";
import styles from "./clientes.module.css";

export default function DashboardClientesEmpresa() {
  const [clientes, setClientes] = useState([]);
  const [auditorias, setAuditorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAuditorias, setLoadingAuditorias] = useState(false);
  const [error, setError] = useState(null);
  const [errorAuditorias, setErrorAuditorias] = useState(null);
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
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // ================== FETCH CLIENTES ==================
  const fetchClientes = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) throw new Error("No hay token de autenticación");

      const res = await fetch("http://localhost:8000/api/clientes/todos-clientes", {
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

  // ================== FETCH AUDITORÍAS ==================
  const fetchAuditorias = async () => {
    setLoadingAuditorias(true);
    setErrorAuditorias(null);

    try {
      const token = getToken();
      if (!token) throw new Error("No hay token de autenticación");

      const res = await fetch("http://localhost:8000/api/clientes/auditorias/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      const data = await res.json();
      console.log("RESPUESTA AUDITORÍAS:", data);

      if (!res.ok) {
        throw new Error(data.detail || `Error ${res.status}: ${JSON.stringify(data)}`);
      }

      // El endpoint devuelve { auditorias: [], status: "success" }
      if (data.auditorias && Array.isArray(data.auditorias)) {
        setAuditorias(data.auditorias);
      } else {
        setAuditorias([]);
      }

    } catch (err) {
      console.error("Error al cargar auditorías:", err);
      setErrorAuditorias(`Error al cargar auditorías: ${err.message}`);
    } finally {
      setLoadingAuditorias(false);
    }
  };

  // Cargar ambos al iniciar
  useEffect(() => {
    fetchClientes();
    fetchAuditorias();
  }, []);

  // ================== FUNCIONES DE CLIENTES ==================
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

      if (res.ok) {
        fetchClientes();
        // Actualizar auditorías después de un cambio
        setTimeout(() => fetchAuditorias(), 500);
      } else {
        alert(`Error al cambiar estado:\n${JSON.stringify(data)}`);
      }
    } catch (err) {
      alert(`Error al cambiar estado:\n${err.message}`);
    }
  };

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
        // Actualizar auditorías después de eliminar
        setTimeout(() => fetchAuditorias(), 500);
      } else {
        const data = await res.json();
        alert(`Error al eliminar cliente:\n${JSON.stringify(data)}`);
      }
    } catch (err) {
      alert(`Error al eliminar cliente:\n${err.message}`);
    }
  };

  // Función para mostrar nombre del cliente de auditoría
  const getClienteNombre = (clienteInfo, detalles) => {
    if (clienteInfo && clienteInfo.nombre) {
      return clienteInfo.nombre;
    }
    if (detalles && detalles.nombre) {
      return detalles.nombre;
    }
    return "Cliente desconocido";
  };

  // Función para mostrar NIT del cliente de auditoría
  const getClienteNIT = (clienteInfo, detalles) => {
    if (clienteInfo && clienteInfo.nit) {
      return clienteInfo.nit;
    }
    if (detalles && detalles.nit) {
      return detalles.nit;
    }
    return "-";
  };

  // ================== RENDER ==================
  return (
    <div className={styles.dashboardContainer}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className={`${styles.mainContent} ${collapsed ? styles.collapsed : ""}`}>
        <h1 className={styles.title}>Dashboard Clientes Empresa</h1>

        {/* Sección de Clientes */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Clientes ({clientes.length})</h2>
            <button onClick={fetchClientes} className={styles.primaryBtn}>Actualizar</button>
          </div>

          {loading && <div>Cargando clientes...</div>}
          {error && <div style={{ color: "red", whiteSpace: "pre-wrap" }}>{error} <button onClick={fetchClientes}>Reintentar</button></div>}

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>NIT</th>
                  <th>Nombre</th>
                  <th>Dirección</th>
                  <th>Teléfono</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 ? (
                  <tr>
                    <td colSpan="5" className={styles.empty}>No hay clientes registrados</td>
                  </tr>
                ) : (
                  clientes.map(c => (
                    <tr key={c.nit}>
                      <td>{c.nit}</td>
                      <td>{c.nombre_cliente}</td>
                      <td>{c.direccion_cliente}</td>
                      <td>{c.telefono_cliente}</td>
                      <td className={styles.actionsCell}>
                        <ActionMenu
                          id={c.id_usuario}
                          estado={c.estado || "activo"}
                          onEditar={() => alert("Editar cliente (pendiente)")}
                          onToggle={() => toggleClienteEstado(c.id_usuario, c.estado || "activo")}
                          onEliminar={() => deleteCliente(c.id_usuario)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sección de Auditorías */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Auditorías de Clientes ({auditorias.length})</h2>
            <button
              onClick={fetchAuditorias}
              className={styles.primaryBtn}
              disabled={loadingAuditorias}
            >
              {loadingAuditorias ? "Cargando..." : "Actualizar Auditorías"}
            </button>
          </div>

          {loadingAuditorias && <div>Cargando auditorías...</div>}
          {errorAuditorias && <div style={{ color: "red", whiteSpace: "pre-wrap" }}>{errorAuditorias} <button onClick={fetchAuditorias}>Reintentar</button></div>}

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Acción</th>
                  <th>Cliente</th>
                  <th>NIT</th>
                  <th>Detalles</th>
                  <th>Usuario</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {auditorias.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.empty}>No hay registros de auditoría</td>
                  </tr>
                ) : (
                  auditorias.map(audit => (
                    <tr key={audit.id}>
                      <td>{audit.id}</td>
                      <td>
                        <span className={`${styles.badge} ${audit.accion === 'CREADO' ? styles.badgeSuccess :
                            audit.accion === 'ACTUALIZADO' ? styles.badgeWarning :
                              audit.accion === 'ELIMINADO' ? styles.badgeError :
                                styles.badgeInfo
                          }`}>
                          {audit.accion}
                        </span>
                      </td>
                      <td>{getClienteNombre(audit.cliente_info, audit.detalles)}</td>
                      <td>{getClienteNIT(audit.cliente_info, audit.detalles)}</td>
                      <td>
                        {audit.detalles_formateados ||
                          (audit.detalles && typeof audit.detalles === 'object'
                            ? `Tel: ${audit.detalles.telefono || '-'}, Dir: ${audit.detalles.direccion || '-'}`
                            : 'Sin detalles')}
                      </td>
                      <td>{audit.usuario_email || 'Sistema'}</td>
                      <td>{formatDate(audit.fecha)}</td>
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