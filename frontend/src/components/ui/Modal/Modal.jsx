"use client"

import { useEffect } from "react"
import styles from "./Modal.module.css"

export default function Modal({
    title,
    children,
    onClose,
    size = "medium"
}) {
    // Prevenir scroll cuando el modal está abierto
    useEffect(() => {
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = "unset"
        }
    }, [])

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    const sizeClass = styles[`modalSize${size.charAt(0).toUpperCase() + size.slice(1)}`]

    return (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
            <div className={`${styles.modal} ${sizeClass}`}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>{title}</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        ×
                    </button>
                </div>
                <div className={styles.modalContent}>
                    {children}
                </div>
            </div>
        </div>
    )
}