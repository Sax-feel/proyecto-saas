"use client";

import Button from "../../button/Button";
import Input from "../../input/Input";
import FormField from "../../FormField/FormField";
import styles from "./ModalEmpresa.module.css";

export default function ModalEmpresa({ empresaForm, handleChange, handleClose, handleSubmit }) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>Registrar Nueva Empresa</h3>
          <button onClick={handleClose} className={styles.closeButton}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <FormField label="Nombre de la Empresa *">
            <Input
              type="text"
              name="nombre"
              value={empresaForm.nombre}
              onChange={handleChange}
              placeholder="Ej: Mi Empresa SA"
              required
            />
          </FormField>

          <FormField label="NIT *">
            <Input
              type="text"
              name="nit"
              value={empresaForm.nit}
              onChange={handleChange}
              placeholder="Ej: 900123456-7"
              required
            />
          </FormField>

          {/* Repite para direccion, telefono, email */}

          <div className={styles.modalActions}>
            <Button type="submit">Registrar Empresa</Button>
            <Button type="button" onClick={handleClose} variant="secondary">Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  );
}