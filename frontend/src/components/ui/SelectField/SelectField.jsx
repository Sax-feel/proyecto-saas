"use client";

import styles from "./SelectField.module.css";

export default function SelectField({
  name,
  label,
  value,
  onChange,
  options = [],
  placeholder = "Seleccionar...",
  required = false,
}) {
  return (
    <div className={styles.field}>
      {label && <label>{label}</label>}
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className={styles.select}
        aria-label={label || placeholder}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
