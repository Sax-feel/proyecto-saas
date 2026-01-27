// frontend/src/components/auth/LoginForm/LoginForm.jsx
'use client';

import { useState } from 'react';
import styles from './LoginForm.module.css';
import FormField from "../../ui/FormField/FormField"
import ReCAPTCHA from "react-google-recaptcha"

export default function LoginForm({ onSuccess, showRoleSelector = false }) {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    
    const [captchaToken, setCaptchaToken] = useState('');
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
        
        if (!captchaToken) {
            setError("Por favor confirme que no es un robot");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/api/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    recaptcha_token: captchaToken
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Guardar tokens y datos de usuario
                localStorage.setItem('access', data.tokens.access);
                localStorage.setItem('refresh', data.tokens.refresh);
                localStorage.setItem('userRole', data.user.rol);
                localStorage.setItem('userEmail', data.user.email);
                localStorage.setItem('userId', data.user.id_usuario);

                // Llamar a onSuccess con los datos del usuario
                onSuccess?.(data.user);
            } else {
                setError(data.detail || data.error || 'Error en el inicio de sesión');
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
                    <FormField
                        type={"email"}
                        name={"email"}
                        value={formData.email}
                        onChange={handleChange}
                        placeholder={"usuario@ejemplo.com"}
                        required={true}
                        label={"Email"}
                    />
                </div>

                <div className={styles.formGroup}>
                    <FormField
                        type={"password"}
                        name={"password"}
                        value={formData.password}
                        onChange={handleChange}
                        placeholder={"********"}
                        required={true}
                        label={"Contraseña"}
                    />
                </div>

                <ReCAPTCHA
                    sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                    onChange={(token) => setCaptchaToken(token)}
                />

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