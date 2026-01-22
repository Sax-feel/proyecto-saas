'use client';

import styles from './ReservationItem.module.css';

export default function ReservationItem({ reserva, onSelect, isSelected, compact = false }) {
    const producto = reserva.producto_info || {};
    const cliente = reserva.cliente_info || {};

    const getStatusColor = (estado) => {
        switch (estado) {
            case 'pendiente': return '#f59e0b';
            case 'confirmada': return '#10b981';
            case 'cancelada': return '#ef4444';
            case 'expirada': return '#6b7280';
            default: return '#9ca3af';
        }
    };

    const getStatusText = (estado) => {
        switch (estado) {
            case 'pendiente': return 'Pendiente';
            case 'confirmada': return 'Confirmada';
            case 'cancelada': return 'Cancelada';
            case 'expirada': return 'Expirada';
            default: return estado;
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (compact) {
        return (
            <div className={styles.compactItem}>
                <div className={styles.compactInfo}>
                    <span className={styles.compactName}>{producto.nombre || 'Producto'}</span>
                    <span className={styles.compactQuantity}>{reserva.cantidad} unidades</span>
                </div>
                <div className={styles.compactMeta}>
                    <span
                        className={styles.compactStatus}
                        style={{ color: getStatusColor(reserva.estado) }}
                    >
                        {getStatusText(reserva.estado)}
                    </span>
                    <span className={styles.compactDate}>
                        {formatDate(reserva.fecha_reserva)}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className={`${styles.reservationItem} ${isSelected ? styles.selected : ''}`}>
            <div className={styles.itemHeader}>
                <h4 className={styles.productName}>{producto.nombre || 'Producto'}</h4>
                <div className={styles.itemActions}>
                    {onSelect && reserva.estado === 'pendiente' && (
                        <button
                            onClick={onSelect}
                            className={styles.selectButton}
                        >
                            {isSelected ? '✓ Seleccionado' : 'Seleccionar'}
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.itemDetails}>
                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Cantidad:</span>
                    <span className={styles.detailValue}>{reserva.cantidad} unidades</span>
                </div>
                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Precio unitario:</span>
                    <span className={styles.detailValue}>Bs. {producto.precio || '0.00'}</span>
                </div>
                <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Subtotal:</span>
                    <span className={styles.detailValue}>
                        Bs. {(producto.precio * reserva.cantidad).toFixed(2) || '0.00'}
                    </span>
                </div>
                {producto.empresa && (
                    <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Empresa:</span>
                        <span className={styles.detailValue}>{producto.empresa}</span>
                    </div>
                )}
            </div>

            <div className={styles.itemFooter}>
                <div className={styles.statusBadge}>
                    <span
                        className={styles.statusDot}
                        style={{ backgroundColor: getStatusColor(reserva.estado) }}
                    />
                    <span className={styles.statusText}>
                        {getStatusText(reserva.estado)}
                    </span>
                </div>

                <div className={styles.dateInfo}>
                    <span className={styles.dateLabel}>Reservado:</span>
                    <span className={styles.dateValue}>{formatDate(reserva.fecha_reserva)}</span>
                </div>

                {reserva.tiempo_restante && reserva.estado === 'pendiente' && (
                    <div className={styles.timeRemaining}>
                        <span className={styles.timeLabel}>Expira en:</span>
                        <span className={styles.timeValue}>{reserva.tiempo_restante}</span>
                    </div>
                )}
            </div>
        </div>
    );
}