'use client';

import { useState } from 'react';
import styles from './LoginForm.module.css';

export default function LoginForm({ onSuccess, userType = 'cliente' }) {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:8000/api/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                // Verificar que el rol sea el correcto
                if (data.user.rol !== userType) {
                    setError(`Debes iniciar sesión como ${userType === 'cliente' ? 'cliente' : userType}`);
                    return;
                }

                // Guardar tokens y datos de usuario
                localStorage.setItem('access', data.tokens.access);
                localStorage.setItem('refresh', data.tokens.refresh);
                localStorage.setItem('userRole', data.user.rol);
                localStorage.setItem('userEmail', data.user.email);
                localStorage.setItem('userId', data.user.id_usuario);

                onSuccess?.(data.user);
            } else {
                setError(data.detail || 'Error en el inicio de sesión');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginForm}>
            <div className={styles.header}>
                <h1>Iniciar Sesión</h1>
                <p>Ingresa tus credenciales para continuar</p>
            </div>

            {error && (
                <div className={styles.errorMessage}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="email" className={styles.label}>
                        Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="usuario@ejemplo.com"
                        required
                        disabled={loading}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="password" className={styles.label}>
                        Contraseña
                    </label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="••••••••"
                        required
                        disabled={loading}
                    />
                </div>

                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={loading}
                >
                    {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </button>
            </form>
        </div>
    );
}