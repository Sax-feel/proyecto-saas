import styles from "./notificacion.module.css"

export default function Notification({ notifications = [] }) {
  if (notifications.length === 0) return null

  return (
    <div className={styles.container}>
      {notifications.map(n => (
        <div
          key={n.id}
          className={`${styles.notification} ${styles[n.type]}`}
        >
          {n.message}
        </div>
      ))}
    </div>
  )
}
