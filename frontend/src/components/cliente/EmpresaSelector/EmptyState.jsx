"use client";

import Link from "next/link";
import styles from "./EmptyState.module.css";

export default function EmptyState() {
    return (
        <div className={styles.emptyContainer}>
            <div className={styles.emptyIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                    <line x1="15" y1="3" x2="15" y2="21"></line>
                </svg>
            </div>
            <h3 className={styles.emptyTitle}>No tienes empresas registradas</h3>
            <p className={styles.emptyDescription}>
                No estás registrado en ninguna empresa actualmente.
            </p>
            <div className={styles.emptyActions}>
                <Link href="/clientes/registro" className={styles.primaryButton}>
                    Regístrate en una empresa
                </Link>
                <Link href="/empresas" className={styles.secondaryButton}>
                    Ver empresas disponibles
                </Link>
            </div>
        </div>
    );
}