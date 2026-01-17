"use client";

import { useState, useEffect } from "react";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import Tables from "../../../components/ui/tables/table";
import Button from "../../../components/ui/Button/Button";
import FormField from "../../../components/ui/FormField/FormField";
import Input from "../../../components/ui/Input/Input";
import ActionMenu from "../../../components/ui/ActionMenu/ActionMenu";
import styles from "./Empresas.module.css";

export default function EmpresasPage() {
  // ----------------- Estados -----------------
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showEmpresaForm, setShowEmpresaForm] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const [empresaForm, setEmpresaForm] = useState({
    nombre: "",
    nit: "",
    direccion: "",
    telefono: "",
    email: "",
    rubro: "",
    plan_nombre: "Free",
  });

  const [formErrors, setFormErrors] = useState({});

  // ----------------- Helpers -----------------
  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Función auxiliar para obtener la clase CSS del plan
  const getPlanClass = (planNombre) => {
    const plan = (planNombre || "").toLowerCase();
    switch (plan) {
      case "free": return styles.planFree;
      case "startup": return styles.planStartup;
      case "business": return styles.planBusiness;
      case "enterprise": return styles.planEnterprise;
      default: return styles.planDefault;
    }
  };

  // Estado para el buscador
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrado de empresas
  const filteredEmpresas = empresas.filter((empresa) => {
    const term = searchTerm.toLowerCase();
    return (
      empresa.nombre.toLowerCase().includes(term) ||
      empresa.nit.toLowerCase().includes(term) ||
      (empresa.rubro || "").toLowerCase().includes(term) ||
      empresa.email.toLowerCase().includes(term)
    );
  });

  // ----------------- Fetch Empresas -----------------
  const fetchEmpresas = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) throw new Error("No hay token de autenticación");

      const res = await fetch("http://localhost:8000/api/empresas/listar/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || `Error ${res.status}`);
      }

      const data = await res.json();
      setEmpresas(data || []);
      setError(null);
    } catch (err) {
      setError(`Error al cargar empresas: ${err.message}`);
      console.error("Error fetching empresas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  // ----------------- Manejo del Formulario -----------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmpresaForm({ ...empresaForm, [name]: value });

    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: "" });
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!empresaForm.nombre.trim()) {
      errors.nombre = "El nombre es obligatorio";
    } else if (empresaForm.nombre.trim().length < 2) {
      errors.nombre = "El nombre debe tener al menos 2 caracteres";
    }

    if (!empresaForm.nit.trim()) {
      errors.nit = "El NIT es obligatorio";
    }

    if (!empresaForm.email.trim()) {
      errors.email = "El email es obligatorio";
    } else if (!/^\S+@\S+\.\S+$/.test(empresaForm.email)) {
      errors.email = "Email inválido";
    }

    if (empresaForm.telefono && !/^[\d\s\-()+]{8,15}$/.test(empresaForm.telefono)) {
      errors.telefono = "Teléfono inválido";
    }

    if (empresaForm.rubro && empresaForm.rubro.trim().length > 100) {
      errors.rubro = "El rubro no puede exceder 100 caracteres";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenForm = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log("Abriendo formulario de empresa");
    setShowEmpresaForm(true);
  };

  const handleCloseForm = () => {
    setShowEmpresaForm(false);
    setEmpresaForm({
      nombre: "",
      nit: "",
      direccion: "",
      telefono: "",
      email: "",
      rubro: "",
      plan_nombre: "Free",
    });
    setFormErrors({});
    setSuccessMessage(null);
  };

  // ----------------- Registrar Empresa -----------------
  const fetchRegistrarEmpresa = async () => {

    console.log("Intentando registrar empresa:", empresaForm);

    if (!validateForm()) {
      console.log("Validación fallida:", formErrors);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error("No hay token de autenticación");
      }

      const empresaData = {
        nombre: empresaForm.nombre.trim(),
        nit: empresaForm.nit.trim(),
        direccion: empresaForm.direccion.trim(),
        telefono: empresaForm.telefono.trim(),
        email: empresaForm.email.trim(),
        rubro: empresaForm.rubro.trim(),
        plan_nombre: empresaForm.plan_nombre,
      };

      console.log("Enviando datos:", empresaData);

      const res = await fetch("http://localhost:8000/api/empresas/registrar/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(empresaData),
      });

      const data = await res.json();
      console.log("Respuesta API:", { status: res.status, data });

      if (res.ok) {
        setSuccessMessage("Empresa registrada exitosamente!");

        setTimeout(() => {
          handleCloseForm();
          fetchEmpresas();
        }, 1500);

      } else {
        const errorMsg = data.detail || data.error || "Error desconocido";
        console.error("Error en respuesta:", errorMsg);

        if (data.email && data.email.includes("ya existe")) {
          setFormErrors({ ...formErrors, email: "Este email ya está registrado" });
        } else if (data.nit && data.nit.includes("ya existe")) {
          setFormErrors({ ...formErrors, nit: "Este NIT ya está registrado" });
        } else {
          setError(`Error del servidor: ${errorMsg}`);
        }
      }

    } catch (err) {
      console.error("Error al registrar empresa:", err);
      setError(`Error de conexión: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------- Operaciones CRUD -----------------
  const toggleEmpresaEstado = async (id, estado) => {
    try {
      const token = getToken();
      const nuevoEstado = estado === "activo" ? "inactivo" : "activo";

      // Usar PUT si ese es el método que espera tu backend
      const res = await fetch(`http://localhost:8000/api/empresas/${id}/cambiar-estado/`, {
        method: "PUT", // Cambiado a PUT
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (res.ok) {
        fetchEmpresas();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.detail || "No se pudo cambiar el estado"}`);
      }
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      alert("Error de conexión");
    }
  };
  const deleteEmpresa = async (id) => {
    if (!confirm("¿Está seguro de eliminar esta empresa? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      const token = getToken();
      const res = await fetch(`http://localhost:8000/api/empresas/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchEmpresas();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.detail || "No se pudo eliminar"}`);
      }
    } catch (err) {
      console.error("Error al eliminar empresa:", err);
      alert("Error de conexión");
    }
  };

  // ----------------- Configuración de Tabla -----------------
  const columns = [
    { key: "id_empresa", label: "ID" },
    { key: "nombre", label: "Nombre" },
    { key: "nit", label: "NIT" },
    {
      key: "rubro",
      label: "Rubro",
      render: (row) => row.rubro ? <span className={styles.rubroText}>{row.rubro}</span> : "-"
    },
    { key: "email", label: "Email" },
    {
      key: "estado",
      label: "Estado",
      render: (row) => (
        <span className={`${styles.estadoBadge} ${row.estado === "activo" ? styles.activo : styles.inactivo}`}>
          {row.estado}
        </span>
      ),
    },
    {
      key: "plan_nombre",
      label: "Plan",
      render: (row) => (
        <span className={`${styles.planBadge} ${getPlanClass(row.plan_nombre)}`}>
          {row.plan_nombre || "Free"}
        </span>
      ),
    },
    {
      key: "fecha_creacion",
      label: "Registro",
      render: (row) => formatDate(row.fecha_creacion),
    },
  ];

  const renderActions = (row) => (
    <ActionMenu
      id={row.id_empresa}
      estado={row.estado}
      onEditar={() => alert(`Editar empresa ${row.nombre} (funcionalidad pendiente)`)}
      onToggle={() => toggleEmpresaEstado(row.id_empresa, row.estado)}
      onEliminar={() => deleteEmpresa(row.id_empresa)}
    />
  );

  // ----------------- Render -----------------
  return (
    <div className={styles.dashboardContainer}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className={`${styles.mainContent} ${collapsed ? styles.collapsed : ""}`}>
        <header className={styles.header}>
          <h1 className={styles.title}>Gestión de Empresas</h1>
          <p className={styles.subtitle}>Administra las empresas registradas en el sistema</p>
        </header>

        {error && (
          <div className={styles.errorAlert}>
            <span>{error}</span>
            <button onClick={fetchEmpresas} className={styles.retryButton}>
              Reintentar
            </button>
          </div>
        )}

        <div className={styles.statsContainer}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{empresas.length}</span>
            <span className={styles.statLabel}>Empresas Totales</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>
              {empresas.filter(e => e.estado === "activo").length}
            </span>
            <span className={styles.statLabel}>Activas</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>
              {Array.from(new Set(empresas.map(e => e.rubro).filter(Boolean))).length}
            </span>
            <span className={styles.statLabel}>Rubros Diferentes</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Input
            placeholder="Buscar empresas por nombre, NIT, rubro o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <div style={{ position: 'relative', zIndex: 10 }}>
            <Button
              variant="primary"
              onClick={handleOpenForm}
              type="button"
            >
              Registrar Nueva Empresa
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={fetchEmpresas}
            disabled={loading}
            type="button"
          >
            Actualizar Lista
          </Button>
        </div>

        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <p>Cargando empresas...</p>
            </div>
          ) : empresas.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No hay empresas registradas</p>
              <Button variant="primary" onClick={handleOpenForm} type="button">
                Registrar la primera empresa
              </Button>
            </div>
          ) : (
            <Tables
              columns={columns}
              data={filteredEmpresas}
              renderActions={renderActions}
              rowKey="id_empresa"
            />
          )}
        </div>

        {/* Modal de Registro de Empresa */}
        {showEmpresaForm && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h3>Registrar Nueva Empresa</h3>
                <Button
                  variant="text"
                  onClick={handleCloseForm}
                  className={styles.closeButton}
                  disabled={submitting}
                  type="button"
                >
                  &times;
                </Button>
              </div>

              <form onSubmit={fetchRegistrarEmpresa} className={styles.form}>
                <div className={styles.formGrid}>
                  <FormField
                    label="Nombre de la Empresa *"
                    error={formErrors.nombre}
                    required
                  >
                    <Input
                      name="nombre"
                      value={empresaForm.nombre}
                      onChange={handleChange}
                      placeholder="Ej: Mi Empresa S.A."
                      disabled={submitting}
                      maxLength={100}
                    />
                  </FormField>

                  <FormField
                    label="NIT *"
                    error={formErrors.nit}
                    required
                  >
                    <Input
                      name="nit"
                      value={empresaForm.nit}
                      onChange={handleChange}
                      placeholder="Ej: 900123456-7"
                      disabled={submitting}
                      maxLength={20}
                    />
                  </FormField>

                  <FormField
                    label="Email *"
                    error={formErrors.email}
                    required
                  >
                    <Input
                      name="email"
                      type="email"
                      value={empresaForm.email}
                      onChange={handleChange}
                      placeholder="empresa@ejemplo.com"
                      disabled={submitting}
                    />
                  </FormField>

                  <FormField
                    label="Rubro"
                    error={formErrors.rubro}
                    helpText="Ej: Tecnología, Retail, Servicios, etc."
                  >
                    <Input
                      name="rubro"
                      value={empresaForm.rubro}
                      onChange={handleChange}
                      placeholder="Tecnología"
                      disabled={submitting}
                      maxLength={100}
                    />
                  </FormField>

                  <FormField
                    label="Dirección"
                    error={formErrors.direccion}
                  >
                    <Input
                      name="direccion"
                      value={empresaForm.direccion}
                      onChange={handleChange}
                      placeholder="Calle 123 #45-67"
                      disabled={submitting}
                    />
                  </FormField>

                  <FormField
                    label="Teléfono"
                    error={formErrors.telefono}
                  >
                    <Input
                      name="telefono"
                      value={empresaForm.telefono}
                      onChange={handleChange}
                      placeholder="6012345678"
                      disabled={submitting}
                    />
                  </FormField>
                </div>

                <div className={styles.fullWidthField}>
                  <FormField label="Plan de Suscripción">
                    <select
                      name="plan_nombre"
                      value={empresaForm.plan_nombre}
                      onChange={handleChange}
                      className={styles.selectInput}
                      disabled={submitting}
                    >
                      <option value="Free">Free - Básico</option>
                      <option value="Startup">Startup - Emprendedores</option>
                      <option value="Business">Business - Empresas</option>
                      <option value="Enterprise">Enterprise - Corporativo</option>
                    </select>
                  </FormField>
                </div>

                <div className={styles.infoBox}>
                  <p><strong>Nota:</strong> Los campos marcados con * son obligatorios.</p>
                  <p>La empresa se creará con un administrador por defecto (admin@empresa.com).</p>
                </div>

                {successMessage && (
                  <div className={styles.successMessage}>
                    <span>✓</span> {successMessage}
                  </div>
                )}

                <div className={styles.formActions}>
                  <Button
                    variant="outline"
                    onClick={handleCloseForm}
                    type="button"
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={fetchRegistrarEmpresa}
                    disabled={loading}
                    type="button"
                  >
                    Registrar Empresa
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}