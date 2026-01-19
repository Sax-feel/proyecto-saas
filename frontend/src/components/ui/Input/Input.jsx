import styles from "./Input.module.css"

export default function Input({ name, value, onChange, type = "text", placeholder, required = false, className }) {
  return (
    <input
      name={name}
      className={`${styles.input} ${className}`}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
    />
  )
}