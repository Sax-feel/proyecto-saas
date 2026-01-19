"use client";

import { useState, useEffect } from "react";
import styles from "./EditForm.module.css";
import FormField from "../FormField/FormField";

export default function EditForm({
  title = "Editar",
  data = {},
  fields = [],
  onSave = () => {},
  onCancel = () => {},
}) {
  const [form, setForm] = useState({});

  useEffect(() => {
    setForm({ ...data });
  }, [data]);

  const handleChange = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <h3>{title}</h3>

        {fields.map((f) => (
          <FormField
            key={f.name}
            label={f.label}
            type={f.type || "text"}
            value={form[f.name] || ""}
            onChange={(e) => handleChange(f.name, e.target.value)}
            required={f.required}
          />
        ))}

        <div className={styles.modalActions}>
          <button
            className={styles.primaryBtn}
            onClick={() => onSave(form)}
          >
            Guardar
          </button>
          <button onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
