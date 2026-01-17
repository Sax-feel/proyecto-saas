"use client";

import { useState, useEffect } from "react";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import ActionMenu from "../../../components/ui/ActionMenu/ActionMenu";
import Input from "../../../components/ui/Input/Input";
import styles from "./clientes.module.css";

export default function DashboardClientesEmpresa() {
  // ================== ESTADOS ==================
  const [clientes, setClientes] = useState([]);
  const [auditorias, setAuditorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAuditorias, setLoadingAuditorias] = useState(false);
  const [error, setError] = useState(null);
  const [errorAuditorias, setErrorAuditorias] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  // ================== HELPERS ==================
  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("access") : null;

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ================== FILTRO CLIENTES ==================
  const filteredClientes = clientes.filter((cliente) => {
    const term = searchTerm.toLowerCase();

    return (
      (cliente.nombre_cliente || "").toLowerCase().includes(term) ||
      (cliente.nit || "").toLowerCase().includes(term) ||
      (cliente.telefono_cliente || "").toLowerCase().includes(term) ||
      (cliente.direccion_cliente || "").toLowerCase().includes(term)
    );
  });

  // ================== FETCH CLIENTES ==================
  const fetchClientes = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) throw new Error("No hay token");

      const res = await fetch(
        "http://localhost:8000/api/clientes/todos-clientes",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await res.json();
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
      if (!token) throw new Error("No hay token");

      const res = await fetch(
        "http://localhost:8000/api/clientes/auditorias/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error auditorías");

      setAuditorias(data.auditorias || []);
    } catch (err) {
      setErrorAuditorias(err.message);
    } finally {
      setLoadingAuditorias(false);
    }
  };

  useEffect(() => {
    fetchClientes();
    fetchAuditorias();
  }, []);

  // ================== ACCIONES ==================
  const toggleClienteEstado = async (id, estado) => {
    const token = getToken();
    const nuevoEstado = estado === "activo" ? "inactivo" : "activo";

    await fetch(`http://localhost:8000/api/clientes/${id}/`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ estado: nuevoEstado }),
    });

    fetchClientes();
    fetchAuditorias();
  };

  const deleteCliente = async (id) => {
    if (!confirm("¿Eliminar cliente?")) return;

    const token = getToken();
    await fetch(`http://localhost:8000/api/clientes/${id}/`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    fetchClientes();
    fetchAuditorias();
  };

  // ================== RENDER ==================
  return (
    <div className={styles.dashboardContainer}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className={`${styles.mainContent} ${collapsed ? styles.collapsed : ""}`}>
        <h1 className={styles.title}>Dashboard Clientes Empresa</h1>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Clientes ({filteredClientes.length})</h2>
            <button onClick={fetchClientes} className={styles.primaryBtn}>
              Actualizar
            </button>
          </div>

          <Input
            placeholder="Buscar clientes por nombre, NIT, teléfono o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />

          {loading && <p>Cargando clientes...</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}

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
                {filteredClientes.length === 0 ? (
                  <tr>
                    <td colSpan="5" className={styles.empty}>
                      No hay clientes que coincidan
                    </td>
                  </tr>
                ) : (
                  filteredClientes.map((c) => (
                    <tr key={c.nit}>
                      <td>{c.nit}</td>
                      <td>{c.nombre_cliente}</td>
                      <td>{c.direccion_cliente}</td>
                      <td>{c.telefono_cliente}</td>
                      <td>
                        <ActionMenu
                          id={c.id_usuario}
                          estado={c.estado}
                          onToggle={() =>
                            toggleClienteEstado(c.id_usuario, c.estado)
                          }
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
      </div>
    </div>
  );
}
