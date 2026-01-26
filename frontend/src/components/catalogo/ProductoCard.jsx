import { useState, useEffect, useCallback } from 'react';
import styles from './ProductoCard.module.css';
import CartModal from './CartModal';

export default function ProductoCard({ producto, empresaId, onProductAdded }) {
    // Si el stock es 0, no renderizar el producto
    if (producto.stock_actual === 0) {
        return null;
    }

    const [cantidad, setCantidad] = useState(1);
    const [imagenActual, setImagenActual] = useState(0);
    const [showCartModal, setShowCartModal] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [isVendedor, setIsVendedor] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    const checkAuthStatus = useCallback(() => {
        if (typeof window !== 'undefined') {
            const role = localStorage.getItem('userRole');
            console.log('ProductoCard: verificando rol:', role);
            setUserRole(role);
            setIsVendedor(role === 'vendedor' || role === 'admin_empresa');
        }
    }, []);
    // Verificar estado inicial
    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    useEffect(() => {
        const handleAuthStateChanged = (event) => {
            console.log('ProductoCard: evento authStateChanged recibido', event.detail);
            checkAuthStatus();
        };

        const handleUserLoggedIn = () => {
            console.log('ProductoCard: usuario logueado, actualizando estado...');
            // Pequeño delay para asegurar que localStorage se actualizó
            setTimeout(() => {
                checkAuthStatus();
            }, 100);
        };

        // Escuchar eventos globales
        window.addEventListener('authStateChanged', handleAuthStateChanged);
        window.addEventListener('userLoggedIn', handleUserLoggedIn);
        
        return () => {
            window.removeEventListener('authStateChanged', handleAuthStateChanged);
            window.removeEventListener('userLoggedIn', handleUserLoggedIn);
        };
    }, [checkAuthStatus]);

    const precio = parseFloat(producto.precio);
    const tieneStock = producto.stock_actual > 0;

    const handleImagenSiguiente = () => {
        if (producto.imagenes && producto.imagenes.length > 0) {
            setImagenActual((prev) => (prev + 1) % producto.imagenes.length);
        }
    };

    const handleImagenAnterior = () => {
        if (producto.imagenes && producto.imagenes.length > 0) {
            setImagenActual((prev) => (prev - 1 + producto.imagenes.length) % producto.imagenes.length);
        }
    };

    const incrementarCantidad = () => {
        if (cantidad < producto.stock_actual) {
            setCantidad(cantidad + 1);
        }
    };

    const decrementarCantidad = () => {
        if (cantidad > 1) {
            setCantidad(cantidad - 1);
        }
    };

    const handleAgregarCarrito = async () => {
        // Solo vendedores/admin_empresa pueden agregar al carrito
        if (!isVendedor) return;

        // Verificar si está logueado
        const token = localStorage.getItem('access');

        if (!token) {
            // Mostrar modal de login para vendedores
            setShowCartModal(true);
            return;
        }

        // Si está logueado como vendedor, crear la reserva
        try {
            setIsAdding(true);
            const response = await fetch('http://localhost:8000/api/reservas/crear/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_producto: producto.id_producto,
                    cantidad: cantidad
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert(`¡${cantidad} ${producto.nombre} reservado(s) exitosamente!`);
                setCantidad(1);
                // Emitir evento al padre para que recargue el carrito
                if (onProductAdded) {
                    console.log('Producto añadido, notificando al padre...');
                    onProductAdded();
                }
                
                // También puedes emitir un evento global
                /* window.dispatchEvent(new CustomEvent('cartUpdated', {
                    detail: { productoId: producto.id_producto, cantidad }
                })); */
            } else {
                alert(data.detail || data.error || 'Error al reservar producto');
            }
        } catch (error) {
            console.error('Error reservando producto:', error);
            alert('Error al reservar producto');
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className={styles.productoCard}>
            <div className={styles.productoHeader}>
                <div className={styles.productoMeta}>
                    <span className={styles.productoCategoria}>{producto.categoria}</span>
                </div>
                <div className={styles.precioActual}>
                    <span className={styles.precioSymbol}>Bs.</span>
                    <span className={styles.precioValor}>{precio.toFixed(2)}</span>
                </div>
            </div>

            <div className={styles.productoImagenContainer}>
                {producto.imagenes && producto.imagenes.length > 0 ? (
                    <>
                        {/* Mostrar la imagen actual */}
                        <div
                            className={styles.productoImagen}
                            style={{
                                backgroundImage: `url(${producto.imagenes[imagenActual]?.archivo || '/placeholder-producto.jpg'})`,
                                backgroundSize: 'contain',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat'
                            }}
                        />

                        {/* Controles de navegación solo si hay más de 1 imagen */}
                        {producto.imagenes.length > 1 && (
                            <>
                                <button
                                    className={`${styles.imagenNavButton} ${styles.prevButton}`}
                                    onClick={handleImagenAnterior}
                                    aria-label="Imagen anterior"
                                >
                                    ‹
                                </button>
                                <button
                                    className={`${styles.imagenNavButton} ${styles.nextButton}`}
                                    onClick={handleImagenSiguiente}
                                    aria-label="Siguiente imagen"
                                >
                                    ›
                                </button>

                                {/* Indicadores de posición */}
                                <div className={styles.imagenIndicators}>
                                    {producto.imagenes.map((_, index) => (
                                        <button
                                            key={index}
                                            className={`${styles.imagenIndicator} ${index === imagenActual ? styles.active : ''}`}
                                            onClick={() => setImagenActual(index)}
                                            aria-label={`Ver imagen ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Mostrar nombre de la imagen como tooltip o subtítulo */}
                        {producto.imagenes[imagenActual]?.nombre && (
                            <div className={styles.imagenNombre}>
                                {producto.imagenes[imagenActual].nombre}
                            </div>
                        )}
                    </>
                ) : (
                    <div className={styles.placeholderImagen}>
                        <span>🛒</span>
                        <span>Sin imagen</span>
                        <small>{producto.nombre}</small>
                    </div>
                )}
            </div>

            <div className={styles.productoInfo}>
                <div className={styles.producto}>
                    <h4 className={styles.productoNombre}>{producto.nombre}</h4>
                    <p className={styles.productoDescripcion}>{producto.descripcion}</p>
                </div>

                {/* Mostrar controles de cantidad solo para vendedores/admin_empresa */}
                {isVendedor && (
                    <div className={styles.cantidadContainer}>
                        <div className={styles.cantidadControls}>
                            <button
                                className={styles.cantidadButton}
                                onClick={decrementarCantidad}
                                disabled={cantidad <= 1}
                            >
                                -
                            </button>
                            <span className={styles.cantidadValue}>{cantidad}</span>
                            <button
                                className={styles.cantidadButton}
                                onClick={incrementarCantidad}
                                disabled={cantidad >= producto.stock_actual}
                            >
                                +
                            </button>
                        </div>
                        <span className={`${styles.stockBadge} ${producto.stock_actual > 10 ? styles.inStock : styles.lowStock}`}>
                            {producto.stock_actual > 10 ? 'Disponible' : 'Pocas unidades'}
                        </span>
                    </div>
                )}

                {/* Mostrar botón de agregar solo para vendedores/admin_empresa */}
                {isVendedor && (
                    <button
                        className={styles.agregarButton}
                        onClick={handleAgregarCarrito}
                        disabled={!tieneStock || isAdding}
                    >
                        {isAdding ? '🔄 Agregando...' :
                        tieneStock ? '🛒 Agregar al carrito' : 'Agotado'}
                    </button>
                )}

                {/* Información adicional */}
                <div className={styles.productoFooter}>
                    <span className={styles.stockInfo}>
                        Stock: <strong>{producto.stock_actual}</strong>
                    </span>
                    {producto.proveedor && (
                        <span className={styles.proveedorInfo}>
                            Proveedor: {producto.proveedor}
                        </span>
                    )}
                </div>

                {showCartModal && (
                    <CartModal
                        isOpen={showCartModal}
                        onClose={() => setShowCartModal(false)}
                        empresaId={empresaId}
                        onLoginSuccess={() => {
                            setShowCartModal(false);
                            // Refrescar el estado de usuario
                            const role = localStorage.getItem('rol');
                            setUserRole(role);
                            setIsVendedor(role === 'vendedor' || role === 'admin_empresa');
                        }}
                    />
                )}
            </div>
        </div>
    );
}