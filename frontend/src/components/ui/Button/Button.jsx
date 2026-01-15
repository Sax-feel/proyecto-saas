import styles from "./Button.module.css"

export default function Button({ children, type = "button", onClick }) {
  return (
    <button type={type} className={styles.primaryBtn} onClick={onClick}>
      {children}
    </button>
  )
}
