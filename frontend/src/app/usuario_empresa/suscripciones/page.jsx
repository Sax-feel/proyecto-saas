"use client";

import { useState } from "react";
import FormField from "../../../components/ui/FormField/FormField";
import Input from "../../../components/ui/Input/Input";
import Button from "../../../components/ui/Button/Button";

import styles from "./suscripciones.module.css";

export default function Suscripciones() {
  const planes = [
    {
      nombre: "Free",
      precio: 0.0,
      duracion_dias: 30,
      limite_productos: 50,
      limite_usuarios: 3,
      descripcion: "Plan gratuito para empresas pequeñas",
    },
    {
      nombre: "Startup",
      precio: 29.99,
      duracion_dias: 30,
      limite_productos: 500,
      limite_usuarios: 10,
      descripcion: "Plan ideal para startups en crecimiento",
    },
    {
      nombre: "Business",
      precio: 99.99,
      duracion_dias: 30,
      limite_productos: 5000,
      limite_usuarios: 50,
      descripcion: "Para empresas establecidas",
    },
    {
      nombre: "Enterprise",
      precio: 299.99,
      duracion_dias: 30,
      limite_productos: 20000,
      limite_usuarios: 200,
      descripcion: "Solución completa para grandes empresas",
    },
  ];

  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [comprobante, setComprobante] = useState(null);
  const [infoAdicional, setInfoAdicional] = useState("");

  const abrirModal = (plan) => {
    setPlanSeleccionado(plan);
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setComprobante(null);
    setInfoAdicional("");
  };

  const handleEnviarComprobante = () => {
    if (!planSeleccionado) return; // evita que rompa si es null
    alert(`Comprobante enviado para el plan ${planSeleccionado.nombre}`);
    cerrarModal();
};

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setComprobante(e.target.files[0]);
    }
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
  <div className={styles.modalOverlay}>
    <div className={styles.modal}>
      <h2>Suscribirse al plan {planSeleccionado.nombre}</h2>
      <p>Escanea el código QR para realizar el pago y adjunta tu comprobante</p>

      <div className={styles.qrContainer}>
        <img
          src="/qr-placeholder.png"
          alt="Código QR para pago"
        />
        <p>Monto a pagar: ${planSeleccionado.precio} USD</p>
      </div>

      <FormField label="Adjuntar comprobante (PNG, JPG)">
        <div className={styles.fileUploadContainer}>
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
          <input
            id="comprobante"
            type="file"
            accept="image/png, image/jpeg, .pdf"
            onChange={handleFileChange}
            className={styles.fileInput}
          />
          {comprobante && (
            <button 
              type="button"
              className={styles.fileRemove}
              onClick={() => setComprobante(null)}
            >
              ✕
            </button>
          )}
        </div>
        <p className={styles.fileHelpText}>
          Formatos aceptados: PNG, JPG, PDF (Máx. 10MB)
        </p>
      </FormField>

      <FormField label="Información adicional">
        <textarea
          value={infoAdicional}
          onChange={(e) => setInfoAdicional(e.target.value)}
          placeholder="Agrega cualquier información sobre tu pago..."
          rows={3}
          className={styles.textarea}
        />
      </FormField>

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
