import Link from 'next/link';
import styles from './EmpresaCard.module.css';

export default function EmpresaCard({ empresa }) {
    const getEstadoColor = (estado) => {
        switch (estado) {
            case 'activo':
                return styles.estadoActivo;
            case 'inactivo':
                return styles.estadoInactivo;
            case 'pendiente':
                return styles.estadoPendiente;
            default:
                return styles.estadoDefault;
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getSuscripcionStatus = () => {
        const info = empresa.suscripciones_info;
        if (info.activas > 0) return 'Activa';
        if (info.pendientes > 0) return 'Pendiente';
        return 'Inactiva';
    };

    const getSuscripcionColor = () => {
        const info = empresa.suscripciones_info;
        if (info.activas > 0) return styles.suscripcionActiva;
        if (info.pendientes > 0) return styles.suscripcionPendiente;
        return styles.suscripcionInactiva;
    };

    return (
        <Link
            href={`/empresa/${empresa.id_empresa}`}
            className={styles.empresaCard}
        >
            <div className={styles.cardHeader}>
                <div className={styles.empresaInfo}>
                    <h3 className={styles.empresaNombre}>{empresa.nombre}</h3>
                    <span className={`${styles.estadoBadge} ${getEstadoColor(empresa.estado)}`}>
                        {empresa.estado}
                    </span>
                </div>
                
            </div>

            <div className={styles.cardBody}>
                <div className={styles.infoRow}>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>NIT:</span>
                        <span className={styles.infoValue}>{empresa.nit}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Rubro:</span>
                        <span className={styles.infoValue}>{empresa.rubro || 'No especificado'}</span>
                    </div>
                </div>

                <div className={styles.infoRow}>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Email:</span>
                        <span className={styles.infoValue}>{empresa.email}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Teléfono:</span>
                        <span className={styles.infoValue}>{empresa.telefono}</span>
                    </div>
                </div>

                <div className={styles.infoRow}>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Dirección:</span>
                        <span className={styles.infoValue}>{empresa.direccion}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Clientes:</span>
                        <span className={styles.infoValue}>{empresa.cantidad_clientes}</span>
                    </div>
                </div>
            </div>

            <div className={styles.cardFooter}>
                <span className={styles.viewDetails}>
                    Ver detalles →
                </span>
            </div>
        </Link>
    );
}