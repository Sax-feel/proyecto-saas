// frontend/src/components/catalogo/CartContent.jsx
'use client';

import { useState, useEffect } from 'react';
import ReservationItem from './ReservationItem';
import ConfirmPurchase from './ConfirmPurchase';
import ClientSection from './ClientSection';
import styles from './CartContent.module.css';
import { RefreshCcw, ArrowRight } from 'lucide-react';

export default function CartContent({
    reservas,
    loading,
    onRefresh,
    onLogout,
    empresaId,
    userRole,
    selectedClient,
    onClientSelect,
    onEditClient
}) {
    const [showConfirmPurchase, setShowConfirmPurchase] = useState(false);
    const [showClientSearch, setShowClientSearch] = useState(true);

    // Filtrar solo las reservas pendientes
    const pendientes = reservas.filter(r => r.estado === 'pendiente');
    const otras = reservas.filter(r => r.estado !== 'pendiente');

    // Preparar automáticamente todos los productos para la venta
    const productosParaVender = pendientes.map(reserva => ({
        id_producto: reserva.id_producto || reserva.producto_info?.id,
        cantidad: reserva.cantidad,
        precio_unitario: parseFloat(reserva.producto_info?.precio || 0),
        nombre: reserva.producto_info?.nombre || 'Producto sin nombre'
    }));

    const handleDeleteReservation = (deletedReserva) => {
        setTimeout(() => onRefresh(), 500);
    };

    const handlePurchaseComplete = () => {
        setShowConfirmPurchase(false);
        setTimeout(() => onRefresh(), 1000);
    };

    const handleProceedToPurchase = () => {
        if (!selectedClient) {
            alert('Por favor, selecciona o registra un cliente primero');
            setShowClientSearch(true);
            return;
        }
        if (pendientes.length === 0) {
            alert('No hay productos reservados para vender');
            return;
        }
        setShowConfirmPurchase(true);
    };

    const handleEditClientWrapper = () => {
        setShowClientSearch(true);
        if (onEditClient) {
            onEditClient();
        }
    };

    // Calcular el total automáticamente
    const calcularTotal = () => {
        return productosParaVender.reduce((total, item) => {
            return total + (item.precio_unitario * item.cantidad);
        }, 0);
    };

    return (
        <div className={styles.cartContent}>
            {/* Sección de productos */}
            <div className={styles.productsSection}>
                <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>
                        Productos ({pendientes.length})
                    </h3>
                    {pendientes.length > 0 && (
                        <div className={styles.selectionInfo}>
                            <button onClick={onRefresh} className={styles.refreshSmallButton}>
                                <RefreshCcw size={20}/> Actualizar
                            </button>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className={styles.loadingProducts}>
                        <div className={styles.spinner}></div>
                        <p>Cargando productos...</p>
                    </div>
                ) : pendientes.length === 0 ? (
                    <div className={styles.emptyCart}>
                        <div className={styles.emptyIcon}>🛒</div>
                        <h3>Carrito vacío</h3>
                        <p>No tienes productos reservados</p>
                        <p className={styles.hintText}>
                            Agrega productos desde el catálogo usando el botón "Agregar al carrito"
                        </p>
                    </div>
                ) : (
                    <>
                        <div className={styles.reservationsGrid}>
                            {pendientes.map((reserva, index) => (
                                <ReservationItem
                                    key={`${reserva.id_producto}-${index}`}
                                    reserva={reserva}
                                    onDelete={handleDeleteReservation}
                                    showDeleteButton={true}
                                />
                            ))}
                        </div>

                        {/* Panel de acción - Siempre visible si hay productos */}
                        <div className={styles.actionPanel}>
                            <div className={styles.panelContent}>
                                <div className={styles.panelInfo}>
                                    {pendientes.length > 0 && (
                                        <div className={styles.totalPreview}>
                                            <span>Total a cobrar: 
                                                <span className={styles.totalAmount}>
                                                    Bs. {calcularTotal().toFixed(2)}
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className={styles.panelActions}>
                                    <button
                                        onClick={handleProceedToPurchase}
                                        className={styles.purchaseButton}
                                        disabled={!selectedClient}
                                    >
                                        {!selectedClient ? 'Selecciona un cliente' : 'Realizar Venta'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modal de confirmación de venta */}
            {showConfirmPurchase && selectedClient && (
                <ConfirmPurchase
                    items={productosParaVender}
                    clienteId={selectedClient.id_usuario}
                    onClose={() => setShowConfirmPurchase(false)}
                    onSuccess={handlePurchaseComplete}
                    empresaId={empresaId}
                />
            )}

            {/* Sección de cliente */}
            <ClientSection
                empresaId={empresaId}
                selectedClient={selectedClient}
                onClientSelect={onClientSelect}
                onEditClient={handleEditClientWrapper}
            />
        </div>
    );
}