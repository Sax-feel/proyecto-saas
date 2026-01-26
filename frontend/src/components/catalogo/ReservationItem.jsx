'use client';

import { useState } from 'react';
import styles from './ReservationItem.module.css';
import { Trash2 } from 'lucide-react';

export default function ReservationItem({ 
    reserva, 
    compact = false,
    onDelete, // Nuevo prop para manejar eliminación
    showDeleteButton = false // Controla si mostrar botón de eliminar
}) {
    const producto = reserva.producto_info || {};
    const id_usuario = reserva.id_usuario || {};
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

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

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta reserva? Esta acción no se puede deshacer.')) {
            return;
        }

        setIsDeleting(true);
        setDeleteError(null);

        try {
            // Usar el endpoint sin validaciones
            const response = await fetch(
                `http://localhost:8000/api/reservas/eliminar-reserva-sin-validacion/${id_usuario}/${producto.id}/`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || data.error || 'Error al eliminar la reserva');
            }

            // Notificar al componente padre que se eliminó la reserva
            if (onDelete) {
                onDelete(reserva);
            }

            alert('Reserva eliminada exitosamente');

        } catch (err) {
            console.error('Error eliminando reserva:', err);
            setDeleteError(err.message);
            alert(`Error al eliminar reserva: ${err.message}`);
        } finally {
            setIsDeleting(false);
        }
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
                {showDeleteButton && (
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className={styles.deleteButtonCompact}
                    >
                        {isDeleting ? 'Eliminando...' : '✕'}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={styles.reservationItem}>
            {deleteError && (
                <div className={styles.errorMessage}>
                    {deleteError}
                </div>
            )}

            <div className={styles.itemHeader}>
                <h4 className={styles.productName}>{producto.nombre || 'Producto'}</h4>
                <div className={styles.itemActions}>
                    {showDeleteButton && (
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className={styles.deleteButton}
                        >
                            <Trash2 size={20}/>
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
            </div>
        </div>
    );
}