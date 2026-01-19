"use client";

import styles from "./FormField.module.css";

export default function FormField({
  name,
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  link,
  linkHref,
  required = false,
}) {

  return (
    <div className={styles.field}>
      <div className={styles.fieldRow}>
        {label && <label>{label}</label>}
        {link && <a href={linkHref || "#"}>{link}</a>}
      </div>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={styles.input}
        aria-label={label || placeholder || "Input field"}
      />
    </div>
  );
}
