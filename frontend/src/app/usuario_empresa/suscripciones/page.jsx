"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FormField from "../../../components/ui/FormField/FormField";
import Input from "../../../components/ui/Input/Input";
import Button from "../../../components/ui/Button/Button";
import styles from "./suscripciones.module.css";

export default function Suscripciones() {
  const router = useRouter();

const planes = [
  {
    nombre: "Free",
    precio: 0.0,
    duracion_dias: 30,
    limite_productos: 50,
    limite_usuarios: 10,
    descripcion: "Plan gratuito para empresas pequeñas",
  },
  {
    nombre: "Basico",
    precio: 29.99,
    duracion_dias: 30,
    limite_productos: 500,
    limite_usuarios: 50,
    descripcion: "Plan ideal para startups en crecimiento",
  },
  {
    nombre: "Estandar",
    precio: 99.99,
    duracion_dias: 30,
    limite_productos: 5000,
    limite_usuarios: 200,
    descripcion: "Para empresas establecidas",
  },
  {
    nombre: "Premium",
    precio: 299.99,
    duracion_dias: 30,
    limite_productos: 20000,
    limite_usuarios: 500,
    descripcion: "Solución completa para grandes empresas",
  },
];

  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [comprobante, setComprobante] = useState(null);
  const [infoAdicional, setInfoAdicional] = useState("");

  useEffect(() => {
    const rolGuardado = localStorage.getItem("rol");
    if (rolGuardado !== "admin_empresa") router.push("/login");
  }, [router]);

  const abrirModal = (plan) => {
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

  const token = localStorage.getItem("access");
  if (!token) {
    alert("No estás autenticado. Inicia sesión primero.");
    return;
  }

  const formData = new FormData();
  formData.append("plan_nombre", planSeleccionado.nombre);
  formData.append("comprobante_pago", comprobante);
  formData.append("observaciones", infoAdicional);

  try {
    const res = await fetch("http://localhost:8000/api/suscripciones/solicitar/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`, // necesario para auth
      },
      body: formData,
    });

    // Si el backend no devuelve JSON en errores, usa try-catch
    let data;
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) throw new Error(data.detail || "Error enviando la suscripción");

    alert("Suscripción enviada correctamente 😎");
    cerrarModal();
  } catch (err) {
    console.error(err);
    alert("Error al enviar la suscripción: " + err.message);
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

    // Validar tipo de archivo
    const tiposPermitidos = ["application/pdf"];
    if (!tiposPermitidos.includes(file.type)) {
        alert("Formato de archivo no válido. Usa PDF");
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

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Suscripción</h1>
      <p className={styles.subtitle}>
        Elige el plan que mejor se adapte a las necesidades de tu empresa
      </p>

      <div className={styles.planesGrid}>
        {planes.map((plan, i) => (
          <div key={i} className={styles.planCard}>
            <h2>{plan.nombre}</h2>
            <p className={styles.descripcion}>{plan.descripcion}</p>
            <p>
              <strong>Precio:</strong> ${plan.precio} USD
            </p>
            <p>
              <strong>Duración:</strong> {plan.duracion_dias} días
            </p>
            <p>
              <strong>Límite de productos:</strong> {plan.limite_productos}
            </p>
            <p>
              <strong>Límite de usuarios:</strong> {plan.limite_usuarios}
            </p>
            <Button onClick={() => abrirModal(plan)}>Suscribirse</Button>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && planSeleccionado && (
        <div className={styles.modalOverlay} onClick={cerrarModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Suscribirse al plan {planSeleccionado.nombre}</h2>
            <p>Escanea el código QR para realizar el pago y adjunta tu comprobante</p>

            <div className={styles.qrContainer}>
              <img
                src="/qr-placeholder.png"
                alt="Código QR para pago"
              />
              <p>Monto a pagar: ${planSeleccionado.precio} USD</p>
            </div>

            <div className={styles.formField}>
              <label>Adjuntar comprobante (PDF)</label>
              <div className={styles.fileUploadContainer}>
                <input
                  id="comprobante"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
                <label htmlFor="comprobante" className={styles.fileLabel}>
                  {comprobante ? (
                    <div className={styles.fileSelected}>
                      <span className={styles.fileIcon}>📎</span>
                      <span>{comprobante.name}</span>
                    </div>
                  ) : (
                    <>
                      <span className={styles.fileIcon}>📤</span>
                      <span>Haz clic para seleccionar un archivo</span>
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
              <p className={styles.fileHelpText}>
                Formatos aceptados: PDF (Máx. 10MB)
              </p>
            </div>

            <div className={styles.formField}>
              <label>Información adicional</label>
              <textarea
                value={infoAdicional}
                onChange={(e) => setInfoAdicional(e.target.value)}
                placeholder="Agrega cualquier información sobre tu pago..."
                rows={3}
                className={styles.textarea}
              />
            </div>

            <div className={styles.modalButtons}>
              <Button 
                onClick={handleEnviarComprobante}
                disabled={!comprobante}
              >
                Enviar comprobante
              </Button>
              <Button variant="secondary" onClick={cerrarModal}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}