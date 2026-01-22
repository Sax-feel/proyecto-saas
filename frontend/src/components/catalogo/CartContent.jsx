'use client';

import { useState } from 'react';
import ReservationItem from './ReservationItem';
import ConfirmPurchase from './ConfirmPurchase';
import styles from './CartContent.module.css';

export default function CartContent({
    reservas,
    loading,
    onRefresh,
    onLogout,
    empresaId
}) {
    const [showConfirmPurchase, setShowConfirmPurchase] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);

    const pendientes = reservas.filter(r => r.estado === 'pendiente');
    const otras = reservas.filter(r => r.estado !== 'pendiente');

    const handleSelectItem = (item) => {
        setSelectedItems(prev => {
            const exists = prev.find(i =>
                i.id_producto === item.id_producto &&
                i.precio_unitario === item.precio_unitario
            );
            if (exists) {
                return prev.filter(i =>
                    !(i.id_producto === item.id_producto && i.precio_unitario === item.precio_unitario)
                );
            }
            return [...prev, {
                id_producto: item.id_producto,
                cantidad: item.cantidad,
                precio_unitario: parseFloat(item.producto_info?.precio || 0),
                nombre: item.producto_info?.nombre
            }];
        });
    };

    const handlePurchaseComplete = () => {
        setShowConfirmPurchase(false);
        setSelectedItems([]);
        onRefresh();
    };

    return (
        <div className={styles.cartContent}>
            <div className={styles.userHeader}>
                <div className={styles.userInfo}>
                    <span className={styles.userEmail}>
                        {localStorage.getItem('userEmail') || 'Cliente'}
                    </span>
                    <span className={styles.userRole}>
                        Cliente
                    </span>
                </div>
                <button onClick={onLogout} className={styles.logoutButton}>
                    Cerrar Sesión
                </button>
            </div>

            {loading ? (
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Cargando reservas...</p>
                </div>
            ) : pendientes.length === 0 ? (
                <div className={styles.emptyCart}>
                    <div className={styles.emptyIcon}>🛒</div>
                    <h3>Carrito vacío</h3>
                    <p>No tienes productos reservados</p>
                </div>
            ) : (
                <>
                    <div className={styles.reservationsSection}>
                        <h3 className={styles.sectionTitle}>
                            Productos Reservados ({pendientes.length})
                        </h3>

                        <div className={styles.reservationsList}>
                            {pendientes.map((reserva) => (
                                <ReservationItem
                                    key={`${reserva.id_producto}-${reserva.fecha_reserva}`}
                                    reserva={reserva}
                                    onSelect={() => handleSelectItem(reserva)}
                                    isSelected={selectedItems.some(item =>
                                        item.id_producto === reserva.id_producto &&
                                        item.precio_unitario === parseFloat(reserva.producto_info?.precio || 0)
                                    )}
                                />
                            ))}
                        </div>

                        {selectedItems.length > 0 && (
                            <div className={styles.purchaseSection}>
                                <div className={styles.selectedSummary}>
                                    <span>{selectedItems.length} productos seleccionados</span>
                                    <button
                                        onClick={() => setShowConfirmPurchase(true)}
                                        className={styles.purchaseButton}
                                    >
                                        Confirmar Compra
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {otras.length > 0 && (
                        <div className={styles.historySection}>
                            <h4 className={styles.historyTitle}>
                                Historial de Reservas
                            </h4>
                            <div className={styles.historyList}>
                                {otras.slice(0, 3).map((reserva) => (
                                    <ReservationItem
                                        key={`${reserva.id_producto}-${reserva.fecha_reserva}`}
                                        reserva={reserva}
                                        compact
                                    />
                                ))}
                            </div>
                            {otras.length > 3 && (
                                <p className={styles.moreItems}>
                                    +{otras.length - 3} más en historial
                                </p>
                            )}
                        </div>
                    )}

                    <div className={styles.refreshSection}>
                        <button onClick={onRefresh} className={styles.refreshButton}>
                            Actualizar Reservas
                        </button>
                    </div>
                </>
            )}

            {showConfirmPurchase && (
                <ConfirmPurchase
                    items={selectedItems}
                    onClose={() => setShowConfirmPurchase(false)}
                    onSuccess={handlePurchaseComplete}
                    empresaId={empresaId}
                />
            )}
        </div>
    );
}