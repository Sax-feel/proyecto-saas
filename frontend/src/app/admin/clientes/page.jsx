"use client";

import { useState, useEffect } from "react";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import ActionMenu from "../../../components/ui/ActionMenu/ActionMenu";
import Button from "../../../components/ui/Button/Button";
import SearchBar from "../../../components/ui/SearchBar/SearchBar";
import Tables from "../../../components/ui/tables/table";
import EditForm from "../../../components/ui/EditForm/EditForm";
import styles from "./clientes.module.css";

export default function DashboardClientesEmpresa() {
  const [clientes, setClientes] = useState([]);
  const [auditorias, setAuditorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAuditorias, setLoadingAuditorias] = useState(false);
  const [error, setError] = useState(null);
  const [errorAuditorias, setErrorAuditorias] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const [editingCliente, setEditingCliente] = useState(null);
  const [editForm, setEditForm] = useState({});

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

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) throw new Error("No hay token");

      const res = await fetch(
        "http://localhost:8000/api/clientes/todos-clientes",
        { headers: { Authorization: `Bearer ${token}` } }
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

  const fetchAuditorias = async () => {
    setLoadingAuditorias(true);
    setErrorAuditorias(null);
    try {
      const token = getToken();
      if (!token) throw new Error("No hay token");

      const res = await fetch(
        "http://localhost:8000/api/clientes/auditorias/",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error auditorías");

      // El endpoint devuelve { auditorias: [], status: "success" }
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

  const toggleClienteEstado = async (id, estado) => {
    const token = getToken();
    const nuevoEstado = estado === "activo" ? "inactivo" : "activo";

    await fetch(`http://localhost:8000/api/clientes/${id}/`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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

  // Filtro
  const filteredClientes = clientes.filter((cliente) => {
    const term = searchTerm.toLowerCase();
    return ["nombre_cliente", "nit", "empresa_nombre", "empresa_id"].some((key) =>
      String(cliente[key] || "").toLowerCase().includes(term)
    );
  });

  // ---------------- RENDER ----------------
  return (
    <div className={styles.dashboardContainer}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`${styles.mainContent} ${collapsed ? styles.collapsed : ""}`}>
        <h1 className={styles.title}>Dashboard Clientes Empresa</h1>

        {/* ---------------- CLIENTES ---------------- */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Clientes ({filteredClientes.length})</h2>
            <div className={styles.headerActions}>
              <Button onClick={fetchClientes} variant="secondary">
                Actualizar
              </Button>
            </div>
          </div>

          <SearchBar
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar clientes por nombre del cliente o por nombre de la empresa..."
            fullWidth={true}
          />

          {loading && <p>Cargando clientes...</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}

          <Tables
            columns={[
              { key: "nit", label: "NIT/CI" },
              { key: "nombre_cliente", label: "Nombre" },
              { key: "empresa_nombre", label: "Nombre Empresa" },
              { key: "empresa_id", label: "ID Empresa" },
            ]}
            data={filteredClientes}
            renderActions={(c) => (
              <ActionMenu
                id={c.id_usuario}
                estado={c.estado}
                onToggle={() => toggleClienteEstado(c.id_usuario, c.estado)}
                onEliminar={() => deleteCliente(c.id_usuario)}
                onEditar={() => {
                  setEditingCliente(c);
                  setEditForm({
                    nit: c.nit,
                    nombre_cliente: c.nombre_cliente,
                    empresa_nombre: c.empresa_nombre,
                    empresa_id: c.empresa_id,
                  });
                }}
              />
            )}
          />
        </section>

        {/* ---------------- AUDITORÍAS ---------------- */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Auditorías ({auditorias.length})</h2>
            <Button onClick={fetchAuditorias} disabled={loadingAuditorias}>
              {loadingAuditorias ? "Cargando..." : "Actualizar Auditorías"}
            </Button>
          </div>

          {loadingAuditorias && <p>Cargando auditorías...</p>}
          {errorAuditorias && <p style={{ color: "red" }}>{errorAuditorias}</p>}

          <Tables
            columns={[
              { key: "id", label: "ID" },
              { key: "accion", label: "Acción", render: (row) => (
                  <span className={`estadoBadge ${row.accion === "CREADO" ? "activo" : row.accion === "ELIMINADO" ? "inactivo" : ""}`}>
                    {row.accion}
                  </span>
                )
              },
              { key: "cliente", label: "Cliente", render: (row) =>
                  row.cliente_info?.nombre || row.detalles?.nombre || "Cliente desconocido"
              },
              { key: "nit", label: "NIT", render: (row) =>
                  row.cliente_info?.nit || row.detalles?.nit || "-"
              },
              { key: "detalles", label: "Detalles", render: (row) =>
                  row.detalles_formateados || (row.detalles?.telefono ? `Tel: ${row.detalles.telefono}, Dir: ${row.detalles.direccion || '-'}` : "Sin detalles")
              },
              { key: "usuario", label: "Usuario", render: (row) => row.usuario_email || "Sistema" },
              { key: "fecha", label: "Fecha", render: (row) => formatDate(row.fecha) },
            ]}
            data={auditorias}
          />
        </section>

        {/* ---------------- EDITAR CLIENTE ---------------- */}
        {editingCliente && (
          <EditForm
            data={editingCliente}
            fields={[
              { name: "nit", label: "NIT" },
              { name: "nombre_cliente", label: "Nombre" },
            ]}
            onSave={async (formData) => {
              const token = getToken();
              await fetch(`http://localhost:8000/api/clientes/${editingCliente.id_usuario}/`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(formData),
              });
              setEditingCliente(null);
              fetchClientes();
              fetchAuditorias();
            }}
            onCancel={() => setEditingCliente(null)}
          />
        )}
      </div>
    </div>
  );
}