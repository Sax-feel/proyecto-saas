// frontend/src/components/catalogo/HeaderCatalogo.jsx
import { useState } from 'react';
import styles from './HeaderCatalogo.module.css';
import { Store, ShoppingCart } from "lucide-react";
import CartModal from './CartModal';
import AccountMenu from './AccountMenu'; // Importa el nuevo componente

export default function HeaderCatalogo({ empresa, categorias, categoriaSeleccionada, onCategoriaClick }) {
    const [showCartModal, setShowCartModal] = useState(false);

    if (!empresa) return null;

    return (
        <>
            <header className={styles.header}>
                <div className={styles.headerTop}>
                    <div className={styles.locationInfo}>
                        <Store className={styles.locationIcon} />
                        <span>{empresa.empresa.nombre}</span>
                    </div>
                    <div className={styles.headerActions}>
                        <div className={styles.userActions}>
                            <button
                                className={styles.cartButton}
                                onClick={() => setShowCartModal(true)}
                            >
                                <ShoppingCart className={styles.icon} />
                                <span>Carrito</span>
                            </button>
                            {/* Reemplaza el botón viejo por el nuevo componente */}
                            <AccountMenu empresaId={empresa.empresa.id_empresa} />
                        </div>
                    </div>
                </div>

                <div className={styles.headerMain}>
                    <h1 className={styles.empresaNombre}>{empresa.empresa.nombre}</h1>
                    <div className={styles.empresaInfo}>
                        <span className={styles.empresaRubro}>
                            {empresa.empresa.rubro}
                        </span>
                        <span className={styles.empresaNIT}>Contacto: {empresa.empresa.telefono}</span>
                    </div>
                </div>

                <nav className={styles.mainNav}>
                    <div className={styles.navContainer}>
                        <div className={styles.navItems}>
                            {categorias.map((categoria) => (
                                <a
                                    key={categoria.id_categoria}
                                    className={`${styles.navLink} ${categoriaSeleccionada === categoria.nombre ? styles.active : ''}`}
                                    onClick={() => onCategoriaClick(categoria.nombre)}
                                >
                                    {categoria.nombre}
                                </a>
                            ))}
                        </div>
                    </div>
                </nav>
            </header>
            <CartModal
                isOpen={showCartModal}
                onClose={() => setShowCartModal(false)}
                empresaId={empresa.empresa.id_empresa}
            />
        </>
    );
}