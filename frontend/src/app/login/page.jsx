"use client"

import LoginForm from "./LoginForm"
import styles from "./LoginPage.module.css"

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        <div className={styles.left}>
          <div className={styles.brand}>
            <div className={styles.logo}>◎</div>
            SAASFLOW.
          </div>
        </div>

        <div className={styles.center}>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
