"use client";

import { useState, useEffect } from "react";
import styles from "./EditForm.module.css";
import FormField from "../FormField/FormField";
import SelectField from "../SelectField/SelectField"; // <-- importar SelectField

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    handleChange(name, value);
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <h3>{title}</h3>

        {fields.map((f) => {
          if (f.type === "select") {
            return (
              <SelectField
                key={f.name}
                label={f.label}
                name={f.name}
                value={form[f.name] || ""}
                onChange={handleInputChange}
                options={f.options || []}
                required={f.required}
              />
            );
          }

          return (
            <FormField
              key={f.name}
              label={f.label}
              type={f.type || "text"}
              name={f.name}
              value={form[f.name] || ""}
              onChange={handleInputChange}
              required={f.required}
            />
          );
        })}

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
