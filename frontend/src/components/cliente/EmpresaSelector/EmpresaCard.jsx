"use client";

import Link from "next/link";
import styles from "./EmpresaCard.module.css";

export default function EmpresaCard({ empresa }) {
    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h3 className={styles.empresaNombre}>{empresa.nombre}</h3>
                <span className={`${styles.estadoBadge} ${styles[empresa.estado]}`}>
                    {empresa.estado}
                </span>
            </div>

            <div className={styles.cardBody}>
                <div className={styles.infoRow}>
                    <span className={styles.label}>NIT:</span>
                    <span className={styles.value}>{empresa.nit}</span>
                </div>

                <div className={styles.infoRow}>
                    <span className={styles.label}>Rubro:</span>
                    <span className={styles.value}>{empresa.rubro || "No especificado"}</span>
                </div>

                <div className={styles.infoRow}>
                    <span className={styles.label}>Teléfono:</span>
                    <span className={styles.value}>{empresa.telefono}</span>
                </div>

                <div className={styles.infoRow}>
                    <span className={styles.label}>Email:</span>
                    <span className={styles.value}>{empresa.email}</span>
                </div>
            </div>

            <div className={styles.cardFooter}>
                <Link href={`/cliente/select-empresa?empresa_id=${empresa.id_empresa}`} className={styles.selectButton}>
                    Seleccionar Empresa
                </Link>
            </div>
        </div>
    );
}