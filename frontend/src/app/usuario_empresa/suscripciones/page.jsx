"use client";

import { useState, useEffect } from "react";
import Sidebar from "../../../components/layout/Sidebar/Sidebar";
import Button from "../../../components/ui/Button/Button";
import styles from "./suscripciones.module.css";

export default function Suscripciones() {
  const [collapsed, setCollapsed] = useState(false);
  const [planes, setPlanes] = useState([]);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [comprobante, setComprobante] = useState(null);
  const [infoAdicional, setInfoAdicional] = useState("");
  const [suscripcionActual, setSuscripcionActual] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoSuscripciones, setCargandoSuscripciones] = useState(true);
  const [historialSuscripciones, setHistorialSuscripciones] = useState([]);

  // Obtener token
  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access");
    }
    return null;
  };

  // Cargar todos los planes disponibles
  const cargarPlanes = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/planes/", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === "success") {
          setPlanes(data.planes);
        }
      }
    } catch (error) {
      console.error("Error cargando planes:", error);
    }
  };

  // Cargar suscripciones de la empresa
  const cargarSuscripcionesActuales = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch("http://localhost:8000/api/suscripciones/mis-suscripciones/", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        
        // Si hay suscripciones, buscar la activa o pendiente
        if (data && data.length > 0) {
          const suscripciones = Array.isArray(data) ? data : [data];
          
          // Buscar suscripción activa
          const activa = suscripciones.find(s => s.estado === 'activo');
          
          // Buscar suscripción pendiente
          const pendiente = suscripciones.find(s => s.estado === 'pendiente');

          if (activa) {
            setSuscripcionActual({
              ...activa,
              tipo: 'activa'
            });
          } else if (pendiente) {
            setSuscripcionActual({
              ...pendiente,
              tipo: 'pendiente'
            });
          }

          // Guardar historial
          setHistorialSuscripciones(suscripciones);
        }
      }
    } catch (error) {
      console.error("Error cargando suscripciones:", error);
    } finally {
      setCargandoSuscripciones(false);
    }
  };

  useEffect(() => {
    const rolGuardado = localStorage.getItem("rol");
    // if (rolGuardado !== "admin_empresa") {
    //   router.push("/login");
    //   return;
    // }

    cargarPlanes();
    cargarSuscripcionesActuales();
  }, []);

  const abrirModal = (plan) => {
    if (suscripcionActual) {
      if (suscripcionActual.tipo === 'activa') {
        alert(`Ya tienes una suscripción activa: ${suscripcionActual.plan.nombre}.\nPara cambiar de plan, contacta a soporte.`);
        return;
      } else if (suscripcionActual.tipo === 'pendiente') {
        const confirmar = window.confirm(
          `Ya tienes una solicitud pendiente para el plan ${suscripcionActual.plan.nombre}.\n` +
          `¿Deseas actualizar tu solicitud con el plan ${plan.nombre}?`
        );

        if (!confirmar) return;
      }
    }

    setPlanSeleccionado(plan);
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setComprobante(null);
    setInfoAdicional("");
  };

  const handleEnviarComprobante = async () => {
    if (!planSeleccionado || !comprobante) return;

    const token = getToken();
    if (!token) {
      alert("No estás autenticado. Inicia sesión primero.");
      return;
    }

    setCargando(true);

    const formData = new FormData();
    formData.append("plan_nombre", planSeleccionado.nombre);
    formData.append("comprobante_pago", comprobante);
    formData.append("observaciones", infoAdicional);

    try {
      const res = await fetch("http://localhost:8000/api/suscripciones/solicitar/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      let data = {};
      try {
        data = await res.json();
      } catch (parseError) {
        console.error("Error parseando respuesta:", parseError);
      }

      if (!res.ok) {
        let errorMessage = "Error enviando la suscripción";
        
        if (data.detail) {
          if (typeof data.detail === 'object' && data.detail.error) {
            errorMessage = data.detail.error;
            if (data.detail.detalle) {
              errorMessage += `\n\nDetalles:\n`;
              if (typeof data.detail.detalle === 'object') {
                Object.entries(data.detail.detalle).forEach(([key, value]) => {
                  errorMessage += `${key}: ${value}\n`;
                });
              } else {
                errorMessage += data.detail.detalle;
              }
            }
          } 
          else if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          }
          else if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map(err => err.toString()).join('\n');
          }
          else if (typeof data.detail === 'object') {
            errorMessage = Object.entries(data.detail)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n');
          }
        } 
        else if (data.error) {
          errorMessage = data.error;
          if (data.detail) {
            errorMessage += `\n${data.detail}`;
          }
        }

        throw new Error(errorMessage);
      }

      // ÉXITO
      alert(`✅ ${data.message || "Solicitud de suscripción enviada correctamente"}\n\n` +
            `${data.detail || "Se ha enviado un correo a los administradores con tu comprobante."}\n` +
            "Recibirás una notificación cuando sea aprobada.");
      
      cerrarModal();
      
      await cargarSuscripcionesActuales();
      
    } catch (err) {
      console.error("Error detallado:", err);
      
      const errorMsg = err.message || err.toString();
      alert(`❌ Error al enviar la suscripción:\n\n${errorMsg}`);
      
    } finally {
      setCargando(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo es demasiado grande. Máximo 5MB");
      e.target.value = "";
      return;
    }

    const tiposPermitidos = ["application/pdf"];
    if (!tiposPermitidos.includes(file.type)) {
      alert("Formato de archivo no válido. Solo se aceptan archivos PDF");
      e.target.value = "";
      return;
    }

    setComprobante(file);
  };

  const eliminarComprobante = () => {
    setComprobante(null);
    const input = document.getElementById('comprobante');
    if (input) input.value = "";
  };

  // Función para formatear fecha
  const formatearFecha = (fechaString) => {
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (cargandoSuscripciones) {
    return (
      <div className={styles.dashboardContainer}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div className={`${styles.mainContent} ${collapsed ? styles.collapsed : ""}`}>
          <div className={styles.cargando}>
            <div className={styles.spinner}></div>
            <p>Cargando información de suscripciones...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className={`${styles.mainContent} ${collapsed ? styles.collapsed : ""}`}>
        {/* Header */}
        <div className={styles.headerSection}>
          <div>
            <h1 className={styles.title}>Suscripción</h1>
            <p className={styles.subtitle}>
              Elige el plan que mejor se adapte a las necesidades de tu empresa
            </p>
          </div>
        </div>

        {/* Mostrar suscripción actual si existe */}
        {suscripcionActual && (
          <div className={styles.suscripcionActualCard}>
            <h3 className={styles.suscripcionTitle}>📋 Tu suscripción actual</h3>
            <div className={styles.suscripcionInfo}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Plan:</span>
                  <span className={styles.infoValue}>{suscripcionActual.plan.nombre}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Estado:</span>
                  <span className={
                    suscripcionActual.estado === 'activo' ? styles.estadoActivo :
                    suscripcionActual.estado === 'pendiente' ? styles.estadoPendiente :
                    styles.estadoInactivo
                  }>
                    {suscripcionActual.estado}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Fecha de inicio:</span>
                  <span className={styles.infoValue}>{formatearFecha(suscripcionActual.fecha_inicio)}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Fecha de fin:</span>
                  <span className={styles.infoValue}>{formatearFecha(suscripcionActual.fecha_fin)}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Precio:</span>
                  <span className={styles.infoValue}>${suscripcionActual.plan.precio} USD</span>
                </div>
                {suscripcionActual.dias_restantes && suscripcionActual.dias_restantes > 0 && (
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Días restantes:</span>
                    <span className={styles.infoValue}>{suscripcionActual.dias_restantes}</span>
                  </div>
                )}
              </div>

              {suscripcionActual.estado === 'pendiente' && (
                <div className={styles.mensajePendiente}>
                  ⏳ Tu solicitud está en revisión. Recibirás una notificación cuando sea aprobada.
                </div>
              )}

              {suscripcionActual.estado === 'activo' && (
                <div className={styles.mensajeActivo}>
                  ✅ Tu suscripción está activa. Para cambiar de plan, contacta a soporte.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Historial de suscripciones */}
        {historialSuscripciones.length > 1 && (
          <div className={styles.historialSection}>
            <h3>📜 Historial de suscripciones</h3>
            <div className={styles.historialGrid}>
              {historialSuscripciones.map((susc, index) => (
                <div key={index} className={styles.historialCard}>
                  <div className={styles.historialHeader}>
                    <span className={styles.historialPlan}>{susc.plan.nombre}</span>
                    <span className={`${styles.historialEstado} ${
                      susc.estado === 'activo' ? styles.historialActivo :
                      susc.estado === 'pendiente' ? styles.historialPendiente :
                      styles.historialInactivo
                    }`}>
                      {susc.estado}
                    </span>
                  </div>
                  <div className={styles.historialBody}>
                    <p><strong>Fecha:</strong> {formatearFecha(susc.fecha_solicitud)}</p>
                    <p><strong>Precio:</strong> ${susc.plan.precio} USD</p>
                    {susc.fecha_aprobacion && (
                      <p><strong>Aprobado:</strong> {formatearFecha(susc.fecha_aprobacion)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid de planes */}
        <div className={styles.planesGrid}>
          {planes.map((plan, i) => (
            <div key={i} className={styles.planCard}>
              <h2>{plan.nombre}</h2>
              <p className={styles.descripcion}>{plan.descripcion}</p>
              <div className={styles.planDetails}>
                <p><strong>Precio:</strong> ${plan.precio} USD</p>
                <p><strong>Duración:</strong> {plan.duracion_dias} días</p>
                <p><strong>Límite de productos:</strong> {plan.limite_productos.toLocaleString()}</p>
                <p><strong>Límite de usuarios:</strong> {plan.limite_usuarios.toLocaleString()}</p>
                {plan.precio_mensual && (
                  <p><strong>Precio mensual:</strong> ${plan.precio_mensual} USD</p>
                )}
              </div>

              <Button
                onClick={() => abrirModal(plan)}
                disabled={suscripcionActual?.estado === 'activo' && plan.nombre !== suscripcionActual.plan.nombre}
                className={styles.suscribirseBtn}
              >
                {suscripcionActual?.estado === 'activo' && plan.nombre === suscripcionActual.plan.nombre
                  ? 'Suscripción Activa'
                  : 'Suscribirse'}
              </Button>

              {suscripcionActual?.estado === 'activo' && plan.nombre !== suscripcionActual.plan.nombre && (
                <p className={styles.mensajeCambio}>
                  Contacta soporte para cambiar de plan
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Modal */}
        {showModal && planSeleccionado && (
          <div className={styles.modalOverlay} onClick={cerrarModal}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <button className={styles.closeButton} onClick={cerrarModal}>×</button>

              <h2>Suscribirse al plan {planSeleccionado.nombre}</h2>

              {suscripcionActual?.tipo === 'pendiente' ? (
                <p className={styles.alertaActualizacion}>
                  ⚠️ <strong>Actualizando solicitud pendiente</strong><br />
                  Se reemplazará tu solicitud anterior para el plan {suscripcionActual.plan.nombre}
                </p>
              ) : (
                <p>Escanea el código QR para realizar el pago y adjunta tu comprobante</p>
              )}

              <div className={styles.qrContainer}>
                <img
                  src="/qr-placeholder.png"
                  alt="Código QR para pago"
                  className={styles.qrImage}
                />
                <p className={styles.monto}>Monto a pagar: <strong>${planSeleccionado.precio} USD</strong></p>
                {planSeleccionado.precio === 0 && (
                  <p className={styles.gratuito}>Este plan es gratuito, adjunta cualquier documento PDF como comprobante.</p>
                )}
              </div>

              <div className={styles.formField}>
                <label>Adjuntar comprobante (PDF, máximo 5MB)*</label>
                <div className={styles.fileUploadContainer}>
                  <input
                    id="comprobante"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className={styles.fileInput}
                    required
                  />
                  <label htmlFor="comprobante" className={styles.fileLabel}>
                    {comprobante ? (
                      <div className={styles.fileSelected}>
                        <span className={styles.fileIcon}>📎</span>
                        <span className={styles.fileName}>{comprobante.name}</span>
                        <span className={styles.fileSize}>
                          ({(comprobante.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    ) : (
                      <>
                        <span className={styles.fileIcon}>📤</span>
                        <span>Haz clic para seleccionar un archivo PDF</span>
                      </>
                    )}
                  </label>
                  {comprobante && (
                    <button
                      type="button"
                      className={styles.fileRemove}
                      onClick={eliminarComprobante}
                      aria-label="Eliminar archivo"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.formField}>
                <label>Información adicional (opcional)</label>
                <textarea
                  value={infoAdicional}
                  onChange={(e) => setInfoAdicional(e.target.value)}
                  placeholder="Ej: Número de transacción, banco, fecha del pago, observaciones..."
                  rows={3}
                  className={styles.textarea}
                />
              </div>

              <div className={styles.modalButtons}>
                <Button
                  onClick={handleEnviarComprobante}
                  disabled={!comprobante || cargando}
                  loading={cargando}
                >
                  {cargando ? 'Enviando...' :
                    suscripcionActual?.tipo === 'pendiente' ? 'Actualizar solicitud' :
                      'Enviar solicitud'}
                </Button>
                <Button variant="secondary" onClick={cerrarModal} disabled={cargando}>
                  Cancelar
                </Button>
              </div>

              <p className={styles.nota}>
                * Tu solicitud será revisada por un administrador.
                Recibirás una notificación por correo cuando sea aprobada.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}