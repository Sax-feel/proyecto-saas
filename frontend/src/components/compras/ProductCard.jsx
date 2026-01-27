import { useState, useEffect, useCallback } from 'react';
import { Minus, Plus, Package, Edit2, Check } from 'lucide-react';
import styles from './ProductCard.module.css';

export default function ProductoCard({
    producto,
    onAddToCart,
    onUpdateCartItem,
    suppliers = [],
    cartItems = []
}) {


    // Verificar si el producto tiene proveedores disponibles
    const proveedoresDisponibles = suppliers.filter(supplier =>
        supplier.id === producto.proveedor
    );

    // Si no hay proveedores disponibles para este producto, no renderizar
    if (proveedoresDisponibles.length === 0) {
        return null;
    }

    // Estados
    const [cantidad, setCantidad] = useState(1);
    const [imagenActual, setImagenActual] = useState(0);

    // Obtener proveedor del producto (si no tiene, usar el primero disponible)
    const proveedorProducto = producto.proveedor?.toString() ||
        proveedoresDisponibles[0]?.id?.toString() || "";

    const [selectedSupplier, setSelectedSupplier] = useState(proveedorProducto);
    const [unitPrice, setUnitPrice] = useState(producto.precio || "0.00");
    const [isEditingPrice, setIsEditingPrice] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [isVendedor, setIsVendedor] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // Verificar si el producto ya está en el carrito
    const itemEnCarrito = cartItems?.find(item =>
        item.id_producto === producto.id_producto
    );

    // Verificar autenticación
    const checkAuthStatus = useCallback(() => {
        if (typeof window !== 'undefined') {
            const role = localStorage.getItem('rol');
            setUserRole(role);
            setIsVendedor(role === 'vendedor' || role === 'admin_empresa');
        }
    }, []);

    // Efecto inicial
    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    // Escuchar eventos de autenticación
    useEffect(() => {
        const handleAuthStateChanged = () => {
            checkAuthStatus();
        };

        const handleUserLoggedIn = () => {
            setTimeout(() => {
                checkAuthStatus();
            }, 100);
        };

        window.addEventListener('authStateChanged', handleAuthStateChanged);
        window.addEventListener('userLoggedIn', handleUserLoggedIn);

        return () => {
            window.removeEventListener('authStateChanged', handleAuthStateChanged);
            window.removeEventListener('userLoggedIn', handleUserLoggedIn);
        };
    }, [checkAuthStatus]);

    // Calcular precio y subtotal
    const precio = parseFloat(producto.precio) || 0;
    const precioUnitario = itemEnCarrito ? itemEnCarrito.unitPrice : (parseFloat(unitPrice) || precio);
    const subtotal = cantidad * precioUnitario;
    const tieneStock = true;

    // Obtener información del proveedor seleccionado
    const proveedorSeleccionado = proveedoresDisponibles.find(s =>
        s.id?.toString() === selectedSupplier
    );
    const nombreProveedor = proveedorSeleccionado?.name || 'Proveedor no especificado';

    // Handlers
    const handleImagenSiguiente = () => {
        if (producto.imagenes && producto.imagenes.length > 0) {
            setImagenActual((prev) => (prev + 1) % producto.imagenes.length);
        }
    };

    const handleImagenAnterior = () => {
        if (producto.imagenes && producto.imagenes.length > 0) {
            setImagenActual((prev) =>
                (prev - 1 + producto.imagenes.length) % producto.imagenes.length
            );
        }
    };

    const incrementarCantidad = () => {
        setCantidad(prev => prev + 1)
    };

    const decrementarCantidad = () => {
        if (cantidad > 1) {
            setCantidad(prev => prev - 1);
        }
    };

    const handleQuantityChange = (e) => {
        const value = parseInt(e.target.value);
        // En compras, solo validar que sea número positivo
        if (!isNaN(value) && value >= 1) {
            setCantidad(value);
        }
    };

    const handlePriceChange = (e) => {
        const value = e.target.value;
        // Validar que sea un número positivo
        if (/^\d*\.?\d*$/.test(value)) {
            setUnitPrice(value);
        }
    };

    const handleSavePrice = () => {
        const precioFinal = parseFloat(unitPrice);
        if (precioFinal > 0 && itemEnCarrito && onUpdateCartItem) {
            onUpdateCartItem(itemEnCarrito.id, { unitPrice: precioFinal });
        }
        setIsEditingPrice(false);
    };

    const handleSupplierChange = (e) => {
        setSelectedSupplier(e.target.value);
    };

    const handleAgregarCarrito = async () => {

        const precioFinal = parseFloat(unitPrice) || precio;
        if (precioFinal <= 0) {
            alert("El precio debe ser mayor a 0");
            return;
        }

        try {
            setIsAdding(true);

            // Si ya está en el carrito, actualizamos la cantidad
            if (itemEnCarrito) {
                alert('Producto en el carrito');
            } else {
                // Llamar a la función padre para agregar al carrito
                onAddToCart({
                    ...producto,
                    precioUnitario: precioFinal,
                    proveedorInfo: proveedorSeleccionado
                }, cantidad, selectedSupplier, precioFinal);

                // Resetear cantidad después de agregar
                setCantidad(1);
            }

        } catch (error) {
            console.error('Error agregando producto al carrito:', error);
            alert('Error al agregar producto al carrito');
        } finally {
            setIsAdding(false);
        }
    };

    // Vista completa para vendedores
    return (
        <div className={`${styles.productoCard} ${itemEnCarrito ? styles.inCart : ''}`}>
            <div className={styles.productoHeader}>
                <div className={styles.productoMeta}>
                    <span className={styles.productoCategoria}>
                        {producto.categoria_nombre || 'Sin categoría'}
                    </span>
                    {itemEnCarrito && (
                        <span className={styles.inCartBadge}>
                            <Check size={12} /> En carrito
                        </span>
                    )}
                </div>
                <div className={styles.precioActual}>
                    <span className={styles.precioSymbol}>Bs.</span>
                    <span className={styles.precioValor}>{precio.toFixed(2)}</span>
                </div>
            </div>

            <div className={styles.productoImagenContainer}>
                {producto.mainImage || (producto.imagenes && producto.imagenes.length > 0) ? (
                    <>
                        <div
                            className={styles.productoImagen}
                            style={{
                                backgroundImage: `url(${producto.mainImage || producto.imagenes[imagenActual]?.archivo || '/placeholder-producto.jpg'})`,
                                backgroundSize: 'contain',
                                backgroundPosition: 'center',
                                backgroundRepeat: 'no-repeat'
                            }}
                        />

                        {producto.imagenes && producto.imagenes.length > 1 && (
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
                    </>
                ) : (
                    <div className={styles.placeholderImagen}>
                        <Package size={40} />
                        <span>Sin imagen</span>
                        <small>{producto.nombre}</small>
                    </div>
                )}

                {/* Indicadores de estado */}
                {producto.estado && (
                    <div className={`${styles.statusBadge} ${styles[producto.estado]}`}>
                        {producto.estado}
                    </div>
                )}

                {producto.necesita_reponer && (
                    <div className={styles.lowStockBadge}>
                        Stock bajo
                    </div>
                )}
            </div>

            <div className={styles.productoInfo}>
                <div className={styles.producto}>
                    <h4 className={styles.productoNombre}>{producto.nombre}</h4>
                    <p className={styles.productoDescripcion}>
                        {producto.descripcion || "Sin descripción"}
                    </p>
                </div>

                {/* Controles para vendedores */}
                {isVendedor && (
                    <>
                        {/* Botón de agregar/actualizar */}
                        <button
                            className={`${styles.agregarButton} ${itemEnCarrito ? styles.updateButton : ''}`}
                            onClick={handleAgregarCarrito}
                            disabled={!tieneStock || isAdding || !selectedSupplier ||
                                (itemEnCarrito && cantidad === 0)}
                        >
                            {isAdding ? '🔄 Procesando...' :
                                itemEnCarrito ? `En el Carrito` :
                                    tieneStock ? '🛒 Agregar al carrito' : 'Agotado'}
                        </button>
                    </>
                )}

                {/* Información adicional */}
                <div className={styles.productoFooter}>
                    <span className={styles.stockInfo}>
                        Stock actual: <strong>{producto.stock_actual}</strong>
                    </span>
                    {itemEnCarrito && (
                        <span className={styles.stockCompraInfo}>
                            Agregando: <strong>{cantidad}</strong> unidades
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}