import { useState, useEffect } from 'react';
import ProductoCard from './ProductoCard';
import styles from './ProductosGrid.module.css';

export default function ProductosGrid({ productos, empresaId, onProductAdded }) {
    const [productosConImagenes, setProductosConImagenes] = useState([]);

    useEffect(() => {
        const fetchImagenesProductos = async () => {
            const productosConImg = await Promise.all(
                productos.map(async (producto) => {
                    try {
                        const response = await fetch(`http://localhost:8000/api/archivos/producto/${producto.id_producto}/`);
                        if (response.ok) {
                            const archivos = await response.json();
                            console.log(`Archivos para producto ${producto.id_producto}:`, archivos);
                            
                            // Filtrar correctamente por tipo_archivo
                            const imagenes = archivos.filter(archivo => 
                                archivo.tipo_archivo === 'imagen' || 
                                archivo.tipo_archivo?.includes('image') // Por si acaso
                            );
                            
                            console.log(`Imágenes filtradas para producto ${producto.id_producto}:`, imagenes);
                            
                            return {
                                ...producto,
                                imagenes: imagenes
                            };
                        }
                        return { ...producto, imagenes: [] };
                    } catch (error) {
                        console.error('Error fetching images for product:', producto.id_producto, error);
                        return { ...producto, imagenes: [] };
                    }
                })
            );
            setProductosConImagenes(productosConImg);
        };

        if (productos.length > 0) {
            fetchImagenesProductos();
        } else {
            setProductosConImagenes([]);
        }
    }, [productos]);

    // Filtrar productos con stock > 0 y que tengan imágenes (si quieres)
    const productosMostrables = productosConImagenes.filter(producto => 
        producto.stock_actual > 0
    );

    if (productosMostrables.length === 0) {
        return (
            <div className={styles.noProducts}>
                <p>No hay productos disponibles con stock</p>
            </div>
        );
    }

    return (
        <div className={styles.productosGrid}>
            {productosMostrables.map((producto) => (
                <ProductoCard
                    key={producto.id_producto}
                    producto={producto}
                    empresaId={empresaId}
                    onProductAdded={onProductAdded}
                />
            ))}
        </div>
    );
}
