// frontend/src/components/catalogo/ClientNITSearch.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './ClientNITSearch.module.css';
import FormField from "../ui/FormField/FormField"
import { TriangleAlert, UserPlus, Link as LinkIcon } from 'lucide-react';

export default function ClientNITSearch({ empresaId, onClientSelect }) {
    const [nit, setNit] = useState('');
    const [loading, setLoading] = useState(false);
    const [clientData, setClientData] = useState(null);
    const [error, setError] = useState('');
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [registerFormData, setRegisterFormData] = useState({
        email: '',
        password: 'Cliente123', // Contraseña por defecto
        nombre_cliente: '',
        direccion_cliente: '',
        telefono_cliente: ''
    });

    // Búsqueda automática con debounce
    const searchClient = useCallback(async (searchNit) => {
        if (!searchNit || searchNit.trim().length < 3) {
            setClientData(null);
            setError('');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('access');
            if (!token) {
                setError('No estás autenticado');
                return;
            }

            console.log('Buscando cliente con NIT:', searchNit);
            const response = await fetch(`http://localhost:8000/api/clientes/clientes/por-nit/${searchNit}/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            console.log('Respuesta de búsqueda:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Cliente encontrado:', data);
                setClientData(data);
                setError('');
                // Auto-seleccionar si se encuentra
                if (onClientSelect) {
                    onClientSelect(data);
                }
            } else {
                const errorData = await response.json();
                console.log('Error en búsqueda:', errorData);
                setClientData(null);

                if (response.status === 403) {
                    // Cliente existe pero no está en mi empresa
                    setError('El cliente existe pero no está en tu empresa. Puedes vincularlo.');
                } else if (response.status === 404) {
                    // Cliente no existe
                    setError('No existe un cliente con este NIT. Puedes registrarlo.');
                } else {
                    setError(errorData.detail || 'Error al buscar cliente');
                }
            }
        } catch (err) {
            console.error('Error de conexión:', err);
            setError('Error de conexión al servidor');
            setClientData(null);
        } finally {
            setLoading(false);
        }
    }, [onClientSelect]);

    // Debounced search
    useEffect(() => {
        if (nit.trim() === '') {
            setClientData(null);
            setError('');
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            searchClient(nit.trim());
        }, 800);

        return () => clearTimeout(delayDebounceFn);
    }, [nit, searchClient]);

    const handleManualSearch = () => {
        if (nit.trim().length >= 3) {
            searchClient(nit.trim());
        } else {
            setError('El NIT debe tener al menos 3 caracteres');
        }
    };

    const handleLinkClient = async () => {
        if (!nit || nit.trim().length < 3) {
            setError('Ingresa un NIT válido');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('access');
            const response = await fetch('http://localhost:8000/api/clientes/clientes/registrar-por-nit/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nit: nit.trim() })
            });

            const data = await response.json();
            console.log('Respuesta de vinculación:', data);

            if (response.ok) {
                // Buscar el cliente ahora vinculado
                await searchClient(nit.trim());
                alert('✅ Cliente vinculado exitosamente a tu empresa');
            } else {
                setError(data.detail || data.error || 'Error al vincular cliente');
            }
        } catch (err) {
            console.error('Error al vincular:', err);
            setError('Error de conexión al vincular cliente');
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterClient = async () => {
        if (!nit || nit.trim().length < 3) {
            setError('Ingresa un NIT válido');
            return;
        }

        if (!registerFormData.email || !registerFormData.nombre_cliente) {
            setError('Email y nombre son obligatorios');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('access');
            const response = await fetch('http://localhost:8000/api/clientes/registrar-con-empresa/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: registerFormData.email,
                    password: registerFormData.password,
                    nit: nit.trim(),
                    nombre_cliente: registerFormData.nombre_cliente,
                    direccion_cliente: registerFormData.direccion_cliente || '',
                    telefono_cliente: registerFormData.telefono_cliente || '',
                    id_empresa: empresaId
                })
            });

            const data = await response.json();
            console.log('Respuesta de registro:', data);

            if (response.ok) {
                // Buscar el cliente recién registrado
                await searchClient(nit.trim());
                setShowRegisterForm(false);
                alert('✅ Cliente registrado exitosamente');
            } else {
                setError(data.detail || data.error || 'Error al registrar cliente');
            }
        } catch (err) {
            console.error('Error al registrar:', err);
            setError('Error de conexión al registrar cliente');
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterFormChange = (e) => {
        setRegisterFormData({
            ...registerFormData,
            [e.target.name]: e.target.value
        });
    };

    const handleSelectClient = () => {
        if (clientData && onClientSelect) {
            onClientSelect(clientData);
        }
    };

    const handleClear = () => {
        setNit('');
        setClientData(null);
        setError('');
        setShowRegisterForm(false);
    };

    return (
        <div className={styles.clientSearch}>
            <div className={styles.searchHeader}>
                <h4 className={styles.searchTitle}>Buscar cliente por NIT</h4>
            </div>

            <div className={styles.searchBox}>
                <div className={styles.inputGroup}>
                    <div className={styles.inputWithIcon}>
                        <FormField
                            type="text"
                            onChange={(e) => setNit(e.target.value)}
                            value={nit}
                            placeholder="Ej: 123456789"
                        />
                        {nit && (
                            <button
                                onClick={handleClear}
                                className={styles.clearInputButton}
                                disabled={loading}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Estado de carga */}
            {loading && (
                <div className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <span>Buscando cliente...</span>
                </div>
            )}

            {/* Mensajes de error */}
            {error && !loading && (
                <div className={styles.errorSection}>
                    <div className={styles.errorMessage}>
                        <strong>⚠️ {error}</strong>
                    </div>

                    {/* Botones de acción según el error */}
                    <div className={styles.actionButtons}>
                        {error.includes('no está en tu empresa') && (
                            <button
                                onClick={handleLinkClient}
                                disabled={loading}
                                className={styles.actionButton}
                            >
                                <LinkIcon size={16} />
                                Vincular cliente a mi empresa
                            </button>
                        )}

                        {error.includes('No existe un cliente') && (
                            <button
                                onClick={() => setShowRegisterForm(true)}
                                className={styles.actionButton}
                                disabled={loading}
                            >
                                <UserPlus size={16} />
                                Registrar nuevo cliente
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Formulario de registro */}
            {showRegisterForm && !clientData && (
                <div className={styles.registerForm}>
                    <div className={styles.formHeader}>
                        <h5>Registrar nuevo cliente</h5>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>
                            NIT del cliente:
                            <span className={styles.nitPreview}>{nit}</span>
                        </label>
                    </div>

                    <div className={styles.formGroup}>
                            <FormField
                                type={'email'}
                                name={"email"}
                                label={"Email"}
                                value={registerFormData.email}
                                onChange={handleRegisterFormChange}
                                placeholder={"cliente@ejemplo.com"}
                                required={true}
                            />
                    </div>

                    <div className={styles.formGroup}>
                            <FormField
                                type="text"
                                name="nombre_cliente"
                                value={registerFormData.nombre_cliente}
                                onChange={handleRegisterFormChange}
                                placeholder="Nombre Apellido"
                                required={true}
                                label={"Nombre"}
                            />
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>

                            <FormField
                                type="text"
                                name="direccion_cliente"
                                value={registerFormData.direccion_cliente}
                                onChange={handleRegisterFormChange}
                                placeholder="Dirección opcional"
                                label={"Direccion"}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <FormField
                                type="text"
                                name="telefono_cliente"
                                value={registerFormData.telefono_cliente}
                                onChange={handleRegisterFormChange}
                                placeholder="Teléfono opcional"
                                label={"Telefono"}
                            />
                        </div>
                    </div>

                    <div className={styles.formActions}>
                        <button
                            onClick={handleRegisterClient}
                            disabled={loading}
                            className={styles.primaryButton}
                        >
                            {loading ? 'Registrando...' : 'Registrar Cliente'}
                        </button>
                        <button
                            onClick={() => setShowRegisterForm(false)}
                            className={styles.secondaryButton}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Cliente encontrado */}
            {clientData && !loading && (
                <div className={styles.clientFound}>
                    <div className={styles.clientHeader}>
                        <h5>✅ Cliente encontrado</h5>
                        <span className={styles.badgeSuccess}>Listo para vender</span>
                    </div>

                    <div className={styles.clientInfoGrid}>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>NIT:</span>
                            <span className={styles.infoValue}>{clientData.nit}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Nombre:</span>
                            <span className={styles.infoValue}>{clientData.nombre_cliente}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Email:</span>
                            <span className={styles.infoValue}>{clientData.email}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Empresa:</span>
                            <span className={styles.infoValue}>{clientData.empresa_nombre}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Estado:</span>
                            <span className={styles.infoValue}>
                                {clientData.relacion_empresa?.estado_relacion || 'Activo'}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleSelectClient}
                        className={styles.selectClientButton}
                    >
                        Seleccionar este cliente para la venta
                    </button>

                    <div className={styles.clientNote}>
                        <small>El cliente está listo para realizar compras en tu empresa.</small>
                    </div>
                </div>
            )}
            {/* Información adicional */}
            <div className={styles.helpSection}>
                <p className={styles.helpText}>
                    <strong>Nota:</strong> Los clientes deben estar registrados en tu empresa para poder venderles.
                    Si no existe el cliente, puedes registrarlo. Si existe pero no está en tu empresa, puedes vincularlo.
                </p>
            </div>
        </div>
    );
}