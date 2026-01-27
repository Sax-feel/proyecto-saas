import { useState, useEffect, useMemo } from 'react';
import ProductoCard from './ProductCard';
import styles from './ProductGrid.module.css';

export default function ProductosGrid({
    productos = [],
    onAddToCart,
    onUpdateCartItem,
    cartItems = [],
    loading = false
}) {
    const [allImages, setAllImages] = useState([]);

    // Obtener token de autenticación
    const getToken = () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('access');
        }
        return null;
    };

    // Cargar todas las imágenes una sola vez
    useEffect(() => {
        const fetchAllImages = async () => {
            try {
                const token = getToken();
                if (!token) {
                    console.log('No hay token, no se pueden cargar imágenes');
                    return;
                }

                const response = await fetch('http://localhost:8000/api/archivos/listar/', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const imagesData = await response.json();
                    console.log('Imágenes cargadas:', imagesData.length);
                    setAllImages(imagesData);
                } else {
                    console.error('Error cargando imágenes:', response.status);
                }
            } catch (error) {
                console.error('Error fetch imágenes:', error);
            }
        };

        fetchAllImages();
    }, []);

    // Procesar productos con sus imágenes y estadísticas
    const productosProcesados = useMemo(() => {
        if (productos.length === 0) return [];

        console.log('Procesando', productos.length, 'productos con', allImages.length, 'imágenes disponibles');

        return productos.map(producto => {
            // Obtener imágenes específicas para este producto
            const imagenesProducto = allImages.filter(img => 
                img.producto && producto.nombre && img.producto === producto.nombre
            );
            
            // Extraer proveedores disponibles (del propio producto)
            const proveedorInfo = {
                id: producto.proveedor,
                nombre: producto.proveedor_nombre || 'Proveedor no especificado'
            };

            return {
                ...producto,
                imagenes: imagenesProducto,
                mainImage: imagenesProducto.length > 0 ? imagenesProducto[0].archivo : null,
                proveedor: proveedorInfo,
                stockInfo: {
                    actual: producto.stock_actual,
                    minimo: producto.stock_minimo,
                    necesitaReponer: producto.necesita_reponer,
                    agotado: producto.agotado
                }
            };
        });
    }, [productos, allImages]);

    // Obtener proveedores únicos de los productos filtrados
    const obtenerProveedores = (productos) => {
        const proveedoresMap = new Map();

        productos.forEach(producto => {
            if (producto.proveedor && producto.proveedor_nombre) {
                proveedoresMap.set(producto.proveedor, {
                    id: producto.proveedor,
                    name: producto.proveedor_nombre
                });
            }
        });

        return Array.from(proveedoresMap.values());
    };

    const proveedoresDisponibles = obtenerProveedores(productosProcesados);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Cargando productos...</p>
            </div>
        );
    }

    if (productosProcesados.length === 0 && !loading) {
        return (
            <div className={styles.noProducts}>
                <p>No hay productos disponibles</p>
            </div>
        );
    }

    if (productosProcesados.length === 0 && !loading) {
        return (
            <div className={styles.noProducts}>
                <p>No hay productos disponibles con stock</p>
            </div>
        );
    }

    return (
        <div className={styles.productosGrid}>
            {productosProcesados.map((producto) => (
                <ProductoCard
                    key={`${producto.id_producto}-${producto.proveedor?.id || 'no-prov'}`}
                    producto={producto}
                    onAddToCart={onAddToCart}
                    onUpdateCartItem={onUpdateCartItem}
                    suppliers={proveedoresDisponibles}
                    cartItems={cartItems}
                />
            ))}
        </div>
    );
}