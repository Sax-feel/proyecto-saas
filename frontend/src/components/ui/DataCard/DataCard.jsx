import styles from "./DataCard.module.css"

export default function DataCard({ title, data, children }) {
  return (
    <div className={styles.card}>
      <h2 className={styles.title}>{title}</h2>

      <div className={styles.content}>
        {children ? children : data?.map((item, index) => (
          <div key={index} className={styles.row}>
            <span className={styles.label}>{item.label}</span>
            <span>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
