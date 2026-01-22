'use client';

import styles from './RegisterOptions.module.css';

export default function RegisterOptions({ onLoginClick, empresaId }) {
    const handleRegisterClient = () => {
        window.location.href = '/login/registro-cliente';
    };

    return (
        <div className={styles.registerOptions}>
            <div className={styles.header}>
                <h1>Acceso Requerido</h1>
                <p>Para agregar productos al carrito necesitas una cuenta de cliente</p>
            </div>

            <div className={styles.options}>
                <div className={styles.optionCard}>
                    <div className={styles.optionContent}>
                        <h3>Ya tengo cuenta</h3>
                        <p>Si ya eres cliente, inicia sesión para continuar</p>
                        <button
                            onClick={onLoginClick}
                            className={styles.primaryButton}
                        >
                            Iniciar Sesión
                        </button>
                    </div>
                </div>

                <div className={styles.separator}>
                    <span>O</span>
                </div>

                <div className={styles.optionCard}>
                    <div className={styles.optionContent}>
                        <h3>Registrarse como Cliente</h3>
                        <p>Crea una cuenta de cliente para empezar a comprar</p>
                        <button
                            onClick={handleRegisterClient}
                            className={styles.secondaryButton}
                        >
                            Registrarme
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.footerNote}>
                <p>
                    ¿Eres administrador o vendedor?{' '}
                    <button
                        onClick={onLoginClick}
                        className={styles.linkButton}
                    >
                        Inicia sesión aquí
                    </button>
                </p>
            </div>
        </div>
    );
}