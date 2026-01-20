'use client';

import { useState, useEffect } from 'react';
import HeaderCatalogo from './HeaderCatalogo';
import CategoriasSidebar from './CategoriasSidebar';
import ProductosGrid from './ProductosGrid';
import SearchBar from './SearchBar';
import styles from './CatalogoEmpresa.module.css';

export default function CatalogoEmpresa({ empresaId }) {
    const [empresa, setEmpresa] = useState(null);
    const [categorias, setCategorias] = useState([]);
    const [productos, setProductos] = useState([]);
    const [productosFiltrados, setProductosFiltrados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (empresaId) {
            fetchEmpresaData();
        }
    }, [empresaId]);

    useEffect(() => {
        filtrarProductos();
    }, [searchTerm, categoriaSeleccionada, productos]);

    const fetchEmpresaData = async () => {
        try {
            setLoading(true);

            // Fetch empresa info
            const empresaResponse = await fetch(`http://localhost:8000/api/empresas/public/${empresaId}/`);
            if (!empresaResponse.ok) throw new Error('Error al cargar empresa');
            const empresaData = await empresaResponse.json();
            setEmpresa(empresaData);

            // Fetch categorías
            const categoriasResponse = await fetch(`http://localhost:8000/api/categorias/empresa/${empresaId}/`);
            if (!categoriasResponse.ok) throw new Error('Error al cargar categorías');
            const categoriasData = await categoriasResponse.json();
            setCategorias(categoriasData.categorias || []);

            // Fetch productos
            const productosResponse = await fetch(`http://localhost:8000/api/productos/empresa/${empresaId}/`);
            if (!productosResponse.ok) throw new Error('Error al cargar productos');
            const productosData = await productosResponse.json();
            setProductos(productosData.productos || []);
            setProductosFiltrados(productosData.productos || []);

        } catch (err) {
            setError(err.message);
            console.error('Error fetching empresa data:', err);
        } finally {
            setLoading(false);
        }
    };

    const filtrarProductos = () => {
        let filtrados = [...productos];

        // Filtrar por categoría
        if (categoriaSeleccionada !== 'todas') {
            filtrados = filtrados.filter(producto =>
                producto.categoria === categoriaSeleccionada
            );
        }

        // Filtrar por búsqueda
        if (searchTerm.trim() !== '') {
            const term = searchTerm.toLowerCase();
            filtrados = filtrados.filter(producto =>
                producto.nombre.toLowerCase().includes(term) ||
                producto.descripcion.toLowerCase().includes(term) ||
                producto.categoria.toLowerCase().includes(term)
            );
        }

        setProductosFiltrados(filtrados);
    };

    const handleCategoriaClick = (categoria) => {
        setCategoriaSeleccionada(categoria);
    };

    const handleSearch = (term) => {
        setSearchTerm(term);
    };

    const handleClearFilters = () => {
        setCategoriaSeleccionada('todas');
        setSearchTerm('');
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Cargando catálogo...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p className={styles.errorMessage}>Error: {error}</p>
                <button
                    onClick={fetchEmpresaData}
                    className={styles.retryButton}
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className={styles.catalogoContainer}>
            <HeaderCatalogo 
                empresa={empresa}
                categorias={categorias}
                categoriaSeleccionada={categoriaSeleccionada}
                onCategoriaClick={handleCategoriaClick}
            />

            <div className={styles.mainLayout}>
                <aside className={styles.sidebar}>
                    <CategoriasSidebar
                        categorias={categorias}
                        categoriaSeleccionada={categoriaSeleccionada}
                        onCategoriaClick={handleCategoriaClick}
                    />

                </aside>

                <main className={styles.mainContent}>
                    <div className={styles.searchSection}>
                        <SearchBar
                            onSearch={handleSearch}
                            placeholder="¿QUÉ ESTÁS BUSCANDO?"
                        />

                        {(searchTerm || categoriaSeleccionada !== 'todas') && (
                            <div className={styles.filterInfo}>
                                <span>
                                    Mostrando {productosFiltrados.length} de {productos.length} productos
                                    {categoriaSeleccionada !== 'todas' && ` en "${categoriaSeleccionada}"`}
                                    {searchTerm && ` para "${searchTerm}"`}
                                </span>
                                <button
                                    onClick={handleClearFilters}
                                    className={styles.clearFiltersButton}
                                >
                                    Limpiar filtros
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={styles.categoriaBreadcrumb}>
                        <span className={styles.currentCategoria}>
                            {categoriaSeleccionada === 'todas' ? 'Todos los productos' : categoriaSeleccionada}
                        </span>
                        <span className={styles.productCount}>
                            ({productosFiltrados.length} productos)
                        </span>
                    </div>

                    <ProductosGrid
                        productos={productosFiltrados}
                        empresaId={empresaId}
                    />

                    {productosFiltrados.length === 0 && (
                        <div className={styles.noProducts}>
                            <p>No se encontraron productos con los filtros aplicados</p>
                            <button
                                onClick={handleClearFilters}
                                className={styles.browseAllButton}
                            >
                                Ver todos los productos
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}