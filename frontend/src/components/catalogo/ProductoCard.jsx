import { useState } from 'react';
import styles from './ProductoCard.module.css';
import CartModal from './CartModal';

export default function ProductoCard({ producto, empresaId }) {
    // Si el stock es 0, no renderizar el producto
    if (producto.stock_actual === 0) {
        return null;
    }

    const [cantidad, setCantidad] = useState(1);
    const [imagenActual, setImagenActual] = useState(0);
    const [showCartModal, setShowCartModal] = useState(false);


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
        // Verificar si está logueado como cliente
        const token = localStorage.getItem('access');
        const userRole = localStorage.getItem('userRole');

        if (!token || userRole !== 'cliente') {
            setShowCartModal(true);
            return;
        }

        // Si está logueado, crear la reserva
        try {
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
            } else {
                alert(data.detail || data.error || 'Error al reservar producto');
            }
        } catch (error) {
            console.error('Error reservando producto:', error);
            alert('Error al reservar producto');
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

                <button
                    className={styles.agregarButton}
                    onClick={handleAgregarCarrito}
                    disabled={!tieneStock}
                >
                    {tieneStock ? '🛒 Agregar al carrito' : 'Agotado'}
                </button>

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

                <CartModal
                    isOpen={showCartModal}
                    onClose={() => setShowCartModal(false)}
                    empresaId={empresaId}
                    onLoginSuccess={() => {
                        // Después de login exitoso, intentar reservar de nuevo
                        setShowCartModal(false);
                        handleAgregarCarrito();
                    }}
                />
            </div>
        </div>
    );
}
