"use client";

import { useState, useEffect } from "react";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import Tables from "../../../components/ui/tables/table";
import Button from "../../../components/ui/Button/Button";
import FormField from "../../../components/ui/FormField/FormField";
import Input from "../../../components/ui/Input/Input";
import ActionMenu from "../../../components/ui/ActionMenu/ActionMenu";
import EditForm from "../../../components/ui/EditForm/EditForm";
import styles from "./Empresas.module.css";

export default function EmpresasPage() {
  // ----------------- Estados -----------------
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [planes, setPlanes] = useState([]);
  const [loadingPlanes, setLoadingPlanes] = useState(false);
  const [errorPlanes, setErrorPlanes] = useState(null);
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

  // ----------------- Fetch Planes -----------------
  const fetchPlanes = async () => {
    setLoadingPlanes(true);
    setErrorPlanes(null);

    try {
      const token = getToken();
      if (!token) throw new Error("No hay token de autenticación");

      const res = await fetch("http://localhost:8000/api/planes/", {
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
      console.log("Planes recibidos:", data);
      setPlanes(data || []);

      // Si no hay planes, mantener el valor por defecto
      if (data && data.length > 0) {
        // Opcional: seleccionar el primer plan por defecto
        setEmpresaForm(prev => ({
          ...prev,
          plan_nombre: data[0].nombre || "Free"
        }));
      }

    } catch (err) {
      console.error("Error fetching planes:", err);
      setErrorPlanes(`Error al cargar planes: ${err.message}`);
    } finally {
      setLoadingPlanes(false);
    }
  };

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
    fetchPlanes();
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
    } 

    if (empresaForm.telefono.trim()) {
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
  const fetchRegistrarEmpresa = async (e) => {
    e.preventDefault();
    console.log("asdfasdf");

    

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

      const res = await fetch("http://localhost:8000/api/empresas/registrar/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(empresaData),
      });

      const data = await res.json();

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

  const [editForm, setEditForm] = useState({});
  const [editingEmpresa, setEditingEmpresa] = useState(null);
  const renderActions = (row) => (
    <ActionMenu
      id={row.id_empresa}
      estado={row.estado}
      onToggle={() => toggleEmpresaEstado(row.id_empresa, row.estado)}
      onEliminar={() => deleteEmpresa(row.id_empresa)}
      onEditar={() => {
        setEditingEmpresa(row);
        
        setEditForm({
          nombre: row.nombre,
          nit: row.nit,
          direccion: row.direccion,
          rubro: row.rubro,
          telefono: row.telefono,
          email: row.email,
        });
      }}
    />
  );


  // ----------------- Render -----------------
  return (
    <div className={styles.dashboardContainer}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className={`${styles.mainContent} ${collapsed ? styles.collapsed : ""}`}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerText}>
              <h1 className={styles.title}>Gestión de Empresas</h1>
              <p className={styles.subtitle}>Administra las empresas registradas en el sistema</p>
            </div>

            <div className={styles.statsContainer}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Empresas Totales</span>
                <span className={styles.statNumber}>{empresas.length}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Activas</span>
                <span className={styles.statNumber}>
                  {empresas.filter(e => e.estado === "activo").length}
                </span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Rubros</span>
                <span className={styles.statNumber}>
                  {Array.from(new Set(empresas.map(e => e.rubro).filter(Boolean))).length}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.headerActions}>
          <div className={styles.searchContainer}>
            <Input
              placeholder="Buscar empresas por nombre, NIT, rubro o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.buttonsContainer}>
            <Button
              variant="primary"
              onClick={handleOpenForm}
              type="button"
              className={styles.actionButton}
            >
              Registrar Nueva Empresa
            </Button>
            <Button
              variant="outline"
              onClick={fetchEmpresas}
              disabled={loading}
              type="button"
              className={styles.actionButton}
            >
              Actualizar Lista
            </Button>
          </div>
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
                    name="nombre"
                    label="Nombre de la Empresa *"
                    value={empresaForm.nombre}
                    placeholder="Ej: Mi Empresa S.A."
                    error={formErrors.nombre}
                    onChange={handleChange}
                    required={true}
                  >
                  </FormField>

                  <FormField
                    name="nit"
                    label="NIT *"
                    value={empresaForm.nit}
                    placeholder="Ej: 900123456-7"
                    error={formErrors.nit}
                    onChange={handleChange}
                    required={true}
                  >
                  </FormField>

                  <FormField
                    name="email"
                    label="Email *"
                    value={empresaForm.email}
                    placeholder="empresa@ejemplo.com"
                    error={formErrors.email}
                    onChange={handleChange}
                    required={true}
                    type="email"
                  >
                  </FormField>

                  <FormField
                    name="rubro"
                    label="Rubro"
                    value={empresaForm.rubro}
                    placeholder="Tecnología"
                    error={formErrors.rubro}
                    onChange={handleChange}
                    helpText="Ej: Tecnología, Retail, Servicios, etc."
                  >
                  </FormField>

                  <FormField
                    name="direccion"
                    label="Dirección"
                    value={empresaForm.direccion}
                    placeholder="Calle 123 #45-67"
                    error={formErrors.direccion}
                    onChange={handleChange}
                  >
                  </FormField>

                  <FormField
                    name="telefono"
                    label="Teléfono"
                    value={empresaForm.telefono}
                    placeholder="6012345678"
                    error={formErrors.telefono}
                    onChange={handleChange}
                  >
                  </FormField>
                </div>
                {/*-------------------- */}
                <div className={styles.fullWidthField}>
                  <div className={styles.selectInputWrapper}>
                    <label>Plan de Suscripción *</label>

                    {loadingPlanes ? (
                      <div className={styles.loadingSelect}>
                        <p>Cargando planes...</p>
                      </div>
                    ) : errorPlanes ? (
                      <div className={styles.errorSelect}>
                        <p style={{ color: "#ef4444", fontSize: "0.875rem" }}>
                          {errorPlanes}
                        </p>
                        <button
                          onClick={fetchPlanes}
                          type="button"
                          style={{
                            padding: "8px 16px",
                            backgroundColor: "#f3f4f6",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.875rem"
                          }}
                        >
                          Reintentar
                        </button>
                      </div>
                    ) : planes.length === 0 ? (
                      <select
                        name="plan_nombre"
                        value={empresaForm.plan_nombre}
                        onChange={handleChange}
                        className={styles.selectInput}
                        disabled={true}
                      >
                        <option value="">No hay planes disponibles</option>
                      </select>
                    ) : (
                      <select
                        name="plan_nombre"
                        value={empresaForm.plan_nombre}
                        onChange={handleChange}
                        className={styles.selectInput}
                        disabled={submitting}
                      >
                        {/* Opción por defecto */}
                        <option value="">Seleccione un plan</option>

                        {/* Mapear planes del endpoint */}
                        {planes.planes.map((plan) => (
                          <option
                            key={plan.nombre}
                            value={plan.nombre}
                            title={plan.descripcion || `Precio: ${plan.precio_mensual || plan.precio}`}
                          >
                            {plan.nombre} - {plan.descripcion || "Sin descripción"}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Info adicional sobre el plan seleccionado */}
                    {empresaForm.plan_nombre && !loadingPlanes && !errorPlanes && planes.length > 0 && (
                      <div className={styles.planInfo}>
                        {(() => {
                          const planSeleccionado = planes.find(p => p.nombre === empresaForm.plan_nombre);
                          if (planSeleccionado) {
                            return (
                              <>
                                <p><strong>Detalles del plan:</strong></p>
                                <ul>
                                  <li>Precio: {planSeleccionado.precio_mensual || `${planSeleccionado.precio}`}</li>
                                  {planSeleccionado.limite_productos && (
                                    <li>Límite de productos: {planSeleccionado.limite_productos}</li>
                                  )}
                                  {planSeleccionado.limite_usuarios && (
                                    <li>Límite de usuarios: {planSeleccionado.limite_usuarios}</li>
                                  )}
                                  {planSeleccionado.duracion_dias && (
                                    <li>Duración: {planSeleccionado.duracion_dias} días</li>
                                  )}
                                </ul>
                              </>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                {/*-------------------- */}

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
                    disabled={submitting}
                    type="submit"
                  >
                    {submitting ? "Registrando..." : "Registrar Empresa"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingEmpresa && (
          <EditForm
            data={{
              nombre: editingEmpresa.nombre,
              nit: editingEmpresa.nit,
              direccion: editingEmpresa.direccion,
              rubro: editingEmpresa.rubro,
              telefono: editingEmpresa.telefono,
              email: editingEmpresa.email,
            }}
            fields={[
              { name: "nombre", label: "Nombre de la Empresa" },
              { name: "nit", label: "NIT" },
              { name: "direccion", label: "Dirección" },
              { name: "rubro", label: "Rubro" },
              { name: "telefono", label: "Teléfono" },
              { name: "email", label: "Email" },
            ]}
            onSave={async (formData) => {
              try {
                const token = getToken();
                
                const res = await fetch(`http://localhost:8000/api/empresas/${editingEmpresa.id_empresa}/`, {
                  method: "PUT",
                  headers: { 
                    Authorization: `Bearer ${token}`, 
                    "Content-Type": "application/json" 
                  },
                  body: JSON.stringify(formData),
                });

                if (res.ok) {
                  setEditingEmpresa(null);
                  fetchEmpresas(); // Recargar la lista
                } else {
                  const errorData = await res.json();
                  alert(`Error: ${errorData.detail || "No se pudo actualizar"}`);
                }
              } catch (err) {
                console.error("Error al actualizar empresa:", err);
                alert("Error de conexión");
              }
            }}
            onCancel={() => setEditingEmpresa(null)}
          />
        )}
      </div>
    </div>
  );
}