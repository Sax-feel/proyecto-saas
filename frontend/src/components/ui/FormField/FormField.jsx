import styles from "./FormField.module.css"
import Input from "../Input/Input"

export default function FormField({ label, value, onChange, type = "text", placeholder, link, linkHref, required = false }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldRow}>
        <label>{label}</label>
        {link && (
          <a href={linkHref || "#"}>{link}</a>
        )}
      </div>
      <Input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
      />
    </div>
  )
}
