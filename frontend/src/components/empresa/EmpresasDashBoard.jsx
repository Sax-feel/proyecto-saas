'use client';

import { useState, useEffect } from 'react';
import EmpresasList from './EmpresasList';
import SearchBar from './SearchBar';
import styles from './EmpresasDashBoard.module.css';

export default function EmpresasDashboard() {
    const [empresas, setEmpresas] = useState([]);
    const [filteredEmpresas, setFilteredEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchEmpresas();
    }, []);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredEmpresas(empresas);
        } else {
            const filtered = empresas.filter(empresa =>
                empresa.rubro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                empresa.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                empresa.nit?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredEmpresas(filtered);
        }
    }, [searchTerm, empresas]);

    const fetchEmpresas = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:8000/api/empresas/listar/');

            if (!response.ok) {
                console.log("response.ok: ", response.ok);
                throw new Error('Error al cargar las empresas');
            }
            console.log("llegooo");
            const data = await response.json();
            setEmpresas(data);
            setFilteredEmpresas(data);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching empresas:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (term) => {
        setSearchTerm(term);
    };

    if (loading) {
        return (
            <div className={styles.dashboardContainer}>
                <main className={styles.mainContent}>
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner}></div>
                        <p>Cargando empresas...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.dashboardContainer}>
                <main className={styles.mainContent}>
                    <div className={styles.errorContainer}>
                        <p className={styles.errorMessage}>Error: {error}</p>
                        <button
                            onClick={fetchEmpresas}
                            className={styles.retryButton}
                        >
                            Reintentar
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className={styles.dashboardContainer}>
            <main className={styles.mainContent}>
                <h1 className={styles.title}>Portal de Empresas</h1>

                <div className={styles.headerSection}>
                    <div className={styles.statsContainer}>
                        <div className={styles.statCard}>
                            <span className={styles.statNumber}>{empresas.length}</span>
                            <span className={styles.statLabel}>Total Empresas</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statNumber}>
                                {empresas.filter(e => e.estado === 'activo').length}
                            </span>
                            <span className={styles.statLabel}>Activas</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statNumber}>
                                {empresas.reduce((sum, e) => sum + (e.suscripciones_info?.activas || 0), 0)}
                            </span>
                            <span className={styles.statLabel}>Suscripciones Activas</span>
                        </div>
                    </div>

                    <SearchBar
                        onSearch={handleSearch}
                        placeholder="Buscar por rubro, nombre o NIT..."
                    />
                </div>

                <EmpresasList
                    empresas={filteredEmpresas}
                    searchTerm={searchTerm}
                />
            </main>
        </div>
    );
}