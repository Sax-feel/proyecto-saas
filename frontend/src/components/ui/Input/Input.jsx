import styles from "./Input.module.css"

export default function Input({ value, onChange, type = "text", placeholder, required = false }) {
  return (
    <input
      className={styles.input}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
    />
  )
}