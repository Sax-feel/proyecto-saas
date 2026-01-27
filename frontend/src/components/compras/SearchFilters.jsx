"use client"

import { Search, Filter, X, UserPlus, User } from "lucide-react"
import { useState, useEffect, useCallback, useMemo } from "react"
import styles from "./SearchFilters.module.css"
import RegisterSupplierModal from './RegisterSupplierModal'

export default function SearchFilters({
    suppliers,
    categories,
    filters,
    onFilterChange,
    onReset,
    loading
}) {
    const [searchSupplier, setSearchSupplier] = useState("")
    const [supplierNotFound, setSupplierNotFound] = useState(false)
    const [showRegisterModal, setShowRegisterModal] = useState(false)

    // Obtener el nombre del proveedor actual basado en el ID del filtro
    useEffect(() => {
        if (filters.supplier && suppliers.length > 0) {
            const foundSupplier = suppliers.find(s => s.id === parseInt(filters.supplier))
            if (foundSupplier) {
                setSearchSupplier(foundSupplier.name)
            }
        } else if (!filters.supplier) {
            setSearchSupplier("")
        }
    }, [filters.supplier, suppliers])

    // Verificar si el proveedor buscado existe (con useCallback para evitar loops)
    const checkSupplierExistence = useCallback((supplierName) => {
        if (!supplierName.trim()) {
            setSupplierNotFound(false)
            return false
        }

        const supplierExists = suppliers.some(supplier =>
            supplier.name.toLowerCase().includes(supplierName.toLowerCase())
        )

        setSupplierNotFound(!supplierExists)
        return supplierExists
    }, [suppliers])

    // Manejar cambio en el buscador de proveedor
    const handleSupplierSearch = (e) => {
        const value = e.target.value
        setSearchSupplier(value)

        if (value.trim() === "") {
            onFilterChange({ supplier: "" })
            setSupplierNotFound(false)
            return
        }

        const supplierExists = checkSupplierExistence(value)

        if (supplierExists) {
            const foundSupplier = suppliers.find(s =>
                s.name.toLowerCase().includes(value.toLowerCase())
            )
            if (foundSupplier) {
                onFilterChange({ supplier: foundSupplier.id })
            }
        } else {
            onFilterChange({ supplier: "" })
        }
    }

    const handleSearchChange = (e) => {
        const { name, value } = e.target
        onFilterChange({ [name]: value })
    }

    // Proveedores sugeridos basados en la búsqueda
    const suggestedSuppliers = useMemo(() => {
        if (!searchSupplier.trim()) return []

        return suppliers.filter(supplier =>
            supplier.name.toLowerCase().includes(searchSupplier.toLowerCase())
        )
    }, [searchSupplier, suppliers])

    // Efecto para actualizar supplierNotFound cuando cambian las sugerencias
    useEffect(() => {
        if (searchSupplier.trim() && suggestedSuppliers.length === 0) {
            setSupplierNotFound(true)
        } else if (searchSupplier.trim() && suggestedSuppliers.length > 0) {
            setSupplierNotFound(false)
        }
    }, [suggestedSuppliers, searchSupplier])

    return (
        <div className={styles.filtersContainer}>
            <div className={styles.filtersGrid}>
                <label className={styles.filterLabel}>
                    <Filter size={20} />
                    Filtrar Productos
                </label>
                
            </div>

            <div className={styles.filtersGrid}>
                {/* Barra de búsqueda de productos */}
                <div className={styles.searchContainer}>
                    <div className={styles.searchIcon}>
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        name="search"
                        value={filters.search}
                        onChange={handleSearchChange}
                        placeholder="Buscar productos por nombre o descripción..."
                        className={styles.supplierSearchInput}
                        disabled={loading}
                    />
                </div>

                {/* Buscador de proveedor */}
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>
                        <User size={16} />
                        Buscar por proveedor
                    </label>
                    <div className={styles.supplierSearchContainer}>
                        <div className={styles.supplierSearchWrapper}>
                            <div className={styles.supplierSearchIcon}>
                                <User size={18} />
                            </div>
                            <input
                                type="text"
                                value={searchSupplier}
                                onChange={handleSupplierSearch}
                                placeholder="Escribe el nombre del proveedor..."
                                className={styles.supplierSearchInput}
                                disabled={loading}
                            />
                        </div>

                        {/* Botón para registrar proveedor si no existe */}
                        {supplierNotFound && searchSupplier.trim() !== "" && (
                            <button
                                className={styles.registerSupplierBtn}
                                onClick={() => setShowRegisterModal(true)}
                                title={`Registrar "${searchSupplier}" como nuevo proveedor`}
                            >
                                <UserPlus size={16} />
                                Registrar proveedor
                            </button>
                        )}
                        {(filters.supplier || filters.category || filters.search) && (
                    <button
                        className={styles.clearButton}
                        onClick={() => {
                            onReset()
                            setSearchSupplier("")
                        }}
                        disabled={loading}
                    >
                        <X size={16} />
                        Limpiar filtros
                    </button>
                )}
                    </div>

                    {/* Sugerencias de proveedores existentes */}
                    {searchSupplier.trim() !== "" && suggestedSuppliers.length > 0 && (
                        <div className={styles.supplierSuggestions}>
                            <p className={styles.suggestionLabel}>Proveedores encontrados:</p>
                            <div className={styles.supplierChips}>
                                {suggestedSuppliers.map(supplier => (
                                    <button
                                        key={supplier.id}
                                        type="button"
                                        className={styles.supplierChip}
                                        onClick={() => {
                                            setSearchSupplier(supplier.name)
                                            onFilterChange({ supplier: supplier.id })
                                        }}
                                    >
                                        {supplier.name}
                                        {supplier.productCount && (
                                            <span className={styles.productCount}>
                                                ({supplier.productCount} productos)
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <RegisterSupplierModal
                isOpen={showRegisterModal}
                onClose={() => setShowRegisterModal(false)}
                supplierName={searchSupplier}
                onSuccess={(data) => {
                    console.log('Proveedor y producto registrados:', data)
                    setShowRegisterModal(false)
                    setSearchSupplier(data.supplierName)
                    // Opcional: Actualizar la lista de proveedores o productos aquí
                }}
            />
        </div>
    )
}