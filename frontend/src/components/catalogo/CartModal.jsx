'use client';

import { useState, useEffect } from 'react';
import LoginForm from '../auth/LoginForm/LoginForm';
import RegisterOptions from '../auth/RegisterOptions';
import CartContent from './CartContent';
import styles from './CartModal.module.css';
import { useRouter } from 'next/navigation';

export default function CartModal({
    isOpen,
    onClose,
    empresaId,
    onLoginSuccess
}) {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showLogin, setShowLogin] = useState(true);
    const [reservas, setReservas] = useState([]);
    const [loading, setLoading] = useState(true);

    // Verificar si el usuario está logueado como cliente
    useEffect(() => {
        if (isOpen) {
            checkAuthStatus();
            if (isLoggedIn) {
                fetchReservas();
            }
        }
    }, [isOpen, isLoggedIn]);

    const checkAuthStatus = () => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('access');
            const userRole = localStorage.getItem('userRole');

            if (token && userRole === 'cliente') {
                setIsLoggedIn(true);
            } else {
                setIsLoggedIn(false);
                setShowLogin(true);
            }
        }
    };

    const fetchReservas = async () => {
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
    };

    const handleLoginSuccess = (userData) => {
        setIsLoggedIn(true);
        setShowLogin(false);
        onLoginSuccess?.(userData);
        fetchReservas();
    };

    const handleLogout = () => {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userEmail');
        setIsLoggedIn(false);
        setShowLogin(true);
        setReservas([]);
    };

    const handleRegisterClick = () => {
        router.push(`/login/registro-cliente/${empresaId}`);
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>
                        {isLoggedIn ? 'Mi Carrito de Compras' : 'Iniciar Sesión'}
                    </h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        &times;
                    </button>
                </div>

                <div className={styles.modalContent}>
                    {!isLoggedIn ? (
                        showLogin ? (
                            <>
                                <LoginForm
                                    onSuccess={handleLoginSuccess}
                                    userType="cliente"
                                />
                                <div className={styles.registerSection}>
                                    <p className={styles.registerText}>
                                        ¿No tienes una cuenta?{' '}
                                        <button
                                            onClick={handleRegisterClick}
                                            className={styles.registerLink}
                                        >
                                            Regístrate aquí
                                        </button>
                                    </p>
                                </div>
                            </>
                        ) : (
                            <RegisterOptions
                                onLoginClick={() => setShowLogin(true)}
                                empresaId={empresaId}
                            />
                        )
                    ) : (
                        <CartContent
                            reservas={reservas}
                            loading={loading}
                            onRefresh={fetchReservas}
                            onLogout={handleLogout}
                            empresaId={empresaId}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}