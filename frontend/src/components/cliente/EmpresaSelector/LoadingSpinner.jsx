"use client";

import styles from "./LoadingSpinner.module.css";

export default function LoadingSpinner() {
    return (
        <div className={styles.spinnerContainer}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>Cargando empresas...</p>
        </div>
    );
}