// frontend/src/components/catalogo/CartModal.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import CartContent from './CartContent';
import styles from './CartModal.module.css';

export default function CartModal({
    isOpen,
    onClose,
    empresaId,
    onLoginSuccess
}) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [isVendedor, setIsVendedor] = useState(false);
    const [reservas, setReservas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);

    useEffect(() => {
        if (isOpen) {
            checkAuthStatus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isLoggedIn && isVendedor) {
            fetchReservas();
        }
    }, [isLoggedIn, isVendedor]);

    const checkAuthStatus = () => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('access');
            const role = localStorage.getItem('userRole');

            if (token && (role === 'vendedor' || role === 'admin_empresa')) {
                setIsLoggedIn(true);
                setUserRole(role);
                setIsVendedor(true);
            } else {
                setIsLoggedIn(false);
                setIsVendedor(false);
                setUserRole(null);
            }
        }
    };

     // Función para cargar reservas
    const fetchReservas = useCallback(async () => {
        if (!isLoggedIn || !isVendedor) return;
        
        try {
            setLoading(true);
            const token = localStorage.getItem('access');
            const response = await fetch('http://localhost:8000/api/reservas/mis-reservas/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setReservas(data.reservas || []);
            }
        } catch (error) {
            console.error('Error fetching reservas:', error);
        } finally {
            setLoading(false);
        }
    }, [isLoggedIn, isVendedor]);

    useEffect(() => {
        if (isOpen) {
            checkAuthStatus();
        }
    }, [isOpen]);
    useEffect(() => {
        const handleRefreshCart = () => {
            console.log('Refresh cart event received, reloading...');
            fetchReservas();
        };

        const handleCartUpdated = (event) => {
            console.log('Cart updated event received:', event.detail);
            // Esperar un momento para que el backend procese y luego recargar
            setTimeout(() => {
                fetchReservas();
            }, 500);
        };

        window.addEventListener('refreshCart', handleRefreshCart);
        window.addEventListener('cartUpdated', handleCartUpdated);
        
        return () => {
            window.removeEventListener('refreshCart', handleRefreshCart);
            window.removeEventListener('cartUpdated', handleCartUpdated);
        };
    }, [fetchReservas]);

    const handleLogout = () => {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userEmail');
        setIsLoggedIn(false);
        setIsVendedor(false);
        setUserRole(null);
        setReservas([]);
        setSelectedClient(null);
    };

    const handleClientSelect = (client) => {
        setSelectedClient(client);
    };

    const handleEditClient = () => {
        setSelectedClient(null);
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>
                        {isLoggedIn && isVendedor ? 'Carrito de Venta' : 'Carrito'}
                    </h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        &times;
                    </button>
                </div>

                <div className={styles.modalContent}>
                    {!isLoggedIn ? (
                        <div className={styles.notLoggedInMessage}>
                            <div className={styles.notLoggedInIcon}>🔒</div>
                            <h3>Acceso requerido</h3>
                            <p>Para acceder al carrito de venta, debes iniciar sesión como vendedor o administrador de empresa.</p>
                            <p className={styles.loginHint}>
                                Usa el botón <strong>"Mi Cuenta"</strong> en la parte superior para iniciar sesión.
                            </p>
                            <button onClick={onClose} className={styles.closeMessageButton}>
                                Entendido
                            </button>
                        </div>
                    ) : !isVendedor ? (
                        <div className={styles.wrongRole}>
                            <h3>Rol incorrecto</h3>
                            <p>Solo vendedores y administradores de empresa pueden acceder al carrito de venta.</p>
                            <button onClick={handleLogout} className={styles.logoutButton}>
                                Cerrar Sesión
                            </button>
                        </div>
                    ) : (
                        <CartContent
                            reservas={reservas}
                            loading={loading}
                            onRefresh={fetchReservas}
                            onLogout={handleLogout}
                            empresaId={empresaId}
                            userRole={userRole}
                            selectedClient={selectedClient}
                            onClientSelect={handleClientSelect}
                            onEditClient={handleEditClient}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}