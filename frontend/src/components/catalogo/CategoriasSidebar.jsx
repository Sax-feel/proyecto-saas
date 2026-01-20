import { useState, useEffect } from 'react';
import styles from './CategoriasSidebar.module.css';
import { Search } from "lucide-react";

export default function CategoriasSidebar({ categorias, categoriaSeleccionada, onCategoriaClick }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoriasFiltradas, setCategoriasFiltradas] = useState(categorias);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setCategoriasFiltradas(categorias);
        } else {
            const term = searchTerm.toLowerCase();
            const filtradas = categorias.filter(categoria =>
                categoria.nombre.toLowerCase().includes(term) ||
                categoria.descripcion.toLowerCase().includes(term)
            );
            setCategoriasFiltradas(filtradas);
        }
    }, [searchTerm, categorias]);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
    };

    return (
        <div className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                <h3 className={styles.sidebarTitle}>Categorías</h3>

                {/* Barra de búsqueda */}
                <div className={styles.searchContainer}>
                    <div className={styles.searchInputWrapper}>
                        <Search className={styles.searchIcon}/>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={handleSearch}
                            placeholder="Buscar categoría..."
                            className={styles.searchInput}
                        />
                        {searchTerm && (
                            <button
                                onClick={handleClearSearch}
                                className={styles.clearButton}
                                aria-label="Limpiar búsqueda"
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.categoriasListContainer}>
                {searchTerm && categoriasFiltradas.length === 0 ? (
                    <div className={styles.noResults}>
                        <p>No se encontraron categorías con "{searchTerm}"</p>
                        <button
                            onClick={handleClearSearch}
                            className={styles.clearSearchButton}
                        >
                            Mostrar todas
                        </button>
                    </div>
                ) : (
                    <>
                        {searchTerm && (
                            <div className={styles.searchResultsInfo}>
                                <span className={styles.resultsCount}>
                                    {categoriasFiltradas.length} de {categorias.length} categorías
                                </span>
                            </div>
                        )}

                        <div className={styles.categoriasList}>
                            {categoriasFiltradas.map((categoria) => (
                                <button
                                    key={categoria.id_categoria}
                                    className={`${styles.categoriaItem} ${categoriaSeleccionada === categoria.nombre ? styles.active : ''}`}
                                    onClick={() => onCategoriaClick(categoria.nombre)}
                                >
                                    <div className={styles.categoriaContent}>
                                        <span className={styles.categoriaNombre}>{categoria.nombre}</span>
                                        <span className={styles.categoriaDesc}>{categoria.descripcion}</span>
                                    </div>
                                    <span className={styles.selectIndicator}>→</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className={styles.sidebarFooter}>
                <div className={styles.stats}>
                    <span className={styles.statLabel}>Total categorías:</span>
                    <span className={styles.statValue}>{categorias.length}</span>
                    {searchTerm && (
                        <span className={styles.filteredStat}>
                            ({categoriasFiltradas.length} filtradas)
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}