'use client';

import { useState } from 'react';
import styles from './ConfirmPurchase.module.css';

export default function ConfirmPurchase({ items, clienteId, onClose, onSuccess, empresaId }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const calcularTotal = () => {
        return items.reduce((total, item) => {
            return total + (item.precio_unitario * item.cantidad);
        }, 0);
    };

    const handleConfirm = async () => {
        if (!items.length || !clienteId) return;

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('access');

            const detalles = items.map(item => ({
                id_producto: item.id_producto,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario.toString()
            }));

            const response = await fetch('http://localhost:8000/api/ventas/realizar-compra/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    detalles,
                    cliente_id: clienteId
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('¡Venta realizada exitosamente!');
                onSuccess();
                onClose();
            } else {
                setError(data.detail || data.error || 'Error al procesar la venta');
            }
        } catch (err) {
            setError('Error de conexión al procesar la venta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.confirmOverlay}>
            <div className={styles.confirmModal}>
                <div className={styles.modalHeader}>
                    <h3>Confirmar Venta</h3>
                    <button onClick={onClose} className={styles.closeButton}>
                        &times;
                    </button>
                </div>

                <div className={styles.modalContent}>
                    {error && (
                        <div className={styles.errorMessage}>
                            {error}
                        </div>
                    )}

                    <div className={styles.clientInfoSection}>
                        <h4>Datos del cliente</h4>
                        <p>ID del cliente: {clienteId}</p>
                    </div>

                    <div className={styles.itemsList}>
                        <h4>Productos a vender ({items.length})</h4>
                        {items.map((item, index) => (
                            <div key={index} className={styles.itemRow}>
                                <span className={styles.itemName}>{item.nombre}</span>
                                <span className={styles.itemDetails}>
                                    {item.cantidad} × Bs. {item.precio_unitario.toFixed(2)}
                                </span>
                                <span className={styles.itemSubtotal}>
                                    Bs. {(item.cantidad * item.precio_unitario).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className={styles.totalSection}>
                        <div className={styles.totalRow}>
                            <span>Total de la venta:</span>
                            <span className={styles.totalAmount}>
                                Bs. {calcularTotal().toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className={styles.confirmationNote}>
                        <p>
                            Al confirmar, se procesará la venta y se descontará del stock.
                            Las reservas seleccionadas se eliminarán.
                        </p>
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button
                        onClick={onClose}
                        className={styles.cancelButton}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={styles.confirmButton}
                        disabled={loading || items.length === 0}
                    >
                        {loading ? 'Procesando...' : 'Confirmar Venta'}
                    </button>
                </div>
            </div>
        </div>
    );
}