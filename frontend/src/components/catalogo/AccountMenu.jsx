// frontend/src/components/catalogo/AccountMenu.jsx
'use client';

import { useState, useEffect } from 'react';
import { UserRound, LogOut, LogIn, Store, User, Mail, CheckCircle, XCircle } from 'lucide-react';
import styles from './AccountMenu.module.css';
import LoginForm from '../auth/LoginForm/LoginForm';

export default function AccountMenu({ empresaId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showLogin, setShowLogin] = useState(false);
    const [userRole, setUserRole] = useState(null);

    // Verificar estado de autenticación
    useEffect(() => {
        checkAuthStatus();
        // Escuchar cambios en localStorage
        window.addEventListener('storage', checkAuthStatus);
        return () => window.removeEventListener('storage', checkAuthStatus);
    }, []);

    const checkAuthStatus = () => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('access');
            const role = localStorage.getItem('userRole');
            const userId = localStorage.getItem('userId');
            
            setUserRole(role);
            
            if (token && role === 'vendedor' || role === 'admin_empresa') {
                fetchUserInfo(userId);
            } else {
                setUserInfo(null);
            }
        }
    };

    const fetchUserInfo = async (userId) => {
        if (!userId) return;
        
        setLoading(true);
        setError('');
        
        try {
            const token = localStorage.getItem('access');
            const response = await fetch(`http://localhost:8000/api/usuarios-empresa/${userId}/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUserInfo(data);
            } else {
                setUserInfo(null);
                localStorage.removeItem('access');
                localStorage.removeItem('refresh');
                localStorage.removeItem('userRole');
                localStorage.removeItem('userId');
                localStorage.removeItem('userEmail');
            }
        } catch (err) {
            console.error('Error fetching user info:', err);
            setError('Error al cargar información del usuario');
        } finally {
            setLoading(false);
        }
    };

    const handleLoginSuccess = (userData) => {
        console.log('Login exitoso, usuario:', userData);
        
        setShowLogin(false);
        setIsOpen(false);
        
        // Emitir evento global para que todos los componentes se actualicen
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: {
                isLoggedIn: true,
                userRole: userData.rol,
                userData: userData
            }
        }));
        
        // También puedes emitir un evento específico para actualizar botones
        window.dispatchEvent(new Event('userLoggedIn'));
        
        // Refrescar la información después del login
        setTimeout(() => checkAuthStatus(), 500);
    };


    const handleLogout = () => {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        setUserInfo(null);
        setUserRole(null);
        setIsOpen(false);
        
        // Emitir evento global para notificar logout
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: {
                isLoggedIn: false,
                userRole: null
            }
        }));
        
        // Refrescar la página para actualizar el estado
        window.location.reload();
    };

    const toggleMenu = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            checkAuthStatus();
        }
    };

    const closeMenu = () => {
        setIsOpen(false);
    };

    return (
        <div className={styles.accountContainer}>
            {/* Botón del menú */}
            <button
                className={styles.accountButton}
                onClick={toggleMenu}
                aria-label="Mi cuenta"
                aria-expanded={isOpen}
            >
                <UserRound className={styles.icon} />
                <span>Mi Cuenta</span>
            </button>

            {/* Menú desplegable */}
            {isOpen && (
                <>
                    {/* Overlay para cerrar al hacer click fuera */}
                    <div className={styles.overlay} onClick={closeMenu} />
                    
                    <div className={styles.menuDropdown}>
                        <div className={styles.menuHeader}>
                            <h3 className={styles.menuTitle}>
                                <UserRound size={20} />
                                Mi Cuenta
                            </h3>
                            <button
                                onClick={closeMenu}
                                className={styles.closeButton}
                                aria-label="Cerrar menú"
                            >
                                ×
                            </button>
                        </div>

                        <div className={styles.menuContent}>
                            {loading ? (
                                <div className={styles.loading}>
                                    <div className={styles.spinner}></div>
                                    <p>Cargando información...</p>
                                </div>
                            ) : userInfo ? (
                                // Usuario logueado - Mostrar información
                                <>
                                    <div className={styles.userCard}>
                                        <div className={styles.userAvatar}>
                                            <User size={32} />
                                        </div>
                                        <div className={styles.userInfo}>
                                            <h4 className={styles.userName}>
                                                {userInfo.email.split('@')[0]}
                                            </h4>
                                            <div className={styles.userDetails}>
                                                <div className={styles.detailItem}>
                                                    <Mail size={14} />
                                                    <span>{userInfo.email}</span>
                                                </div>
                                                <div className={`${styles.detailItem} ${styles.roleBadge}`}>
                                                    <User size={14} />
                                                    <span>{userInfo.rol === 'vendedor' ? 'Vendedor' : 'Admin Empresa'}</span>
                                                </div>
                                                <div className={styles.detailItem}>
                                                    {userInfo.estado === 'activo' ? (
                                                        <>
                                                            <CheckCircle size={14} color="#10b981" />
                                                            <span className={styles.statusActive}>Cuenta activa</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle size={14} color="#ef4444" />
                                                            <span className={styles.statusInactive}>Cuenta inactiva</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.menuActions}>
                                        <button
                                            onClick={handleLogout}
                                            className={styles.logoutButton}
                                        >
                                            <LogOut size={18} />
                                            Cerrar Sesión
                                        </button>
                                    </div>

                                    <div className={styles.menuFooter}>
                                        <small className={styles.lastUpdate}>
                                            Última modificación: {new Date(userInfo.fecha_modificacion).toLocaleDateString('es-ES')}
                                        </small>
                                    </div>
                                </>
                            ) : showLogin ? (
                                // Mostrar formulario de login
                                <>
                                    <div className={styles.loginSection}>
                                        <h4 className={styles.loginTitle}>Iniciar Sesión</h4>
                                        <p className={styles.loginSubtitle}>
                                            Solo vendedores y administradores de empresa
                                        </p>
                                        <LoginForm
                                            onSuccess={handleLoginSuccess}
                                            showRoleSelector={false}
                                        />
                                        <button
                                            onClick={() => setShowLogin(false)}
                                            className={styles.backButton}
                                        >
                                            ← Volver
                                        </button>
                                    </div>
                                </>
                            ) : (
                                // Usuario no logueado
                                <>
                                    <div className={styles.notLoggedIn}>
                                        <div className={styles.notLoggedInIcon}>
                                            <UserRound size={48} />
                                        </div>
                                        <h4 className={styles.notLoggedInTitle}>
                                            No has iniciado sesión
                                        </h4>
                                        <p className={styles.notLoggedInText}>
                                            Inicia sesión para ver tu información y realizar ventas
                                        </p>
                                        <div className={styles.notLoggedInActions}>
                                            <button
                                                onClick={() => setShowLogin(true)}
                                                className={styles.loginActionButton}
                                            >
                                                <LogIn size={18} />
                                                Iniciar Sesión
                                            </button>
                                            <p className={styles.roleHint}>
                                                <strong>Roles permitidos:</strong> vendedor, admin_empresa
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}