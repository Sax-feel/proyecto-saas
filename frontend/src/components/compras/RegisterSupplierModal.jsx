"use client"

import { useState, useRef, useEffect } from "react"
import { X, UserPlus, Package, Loader2, ChevronDown } from "lucide-react"
import styles from "./RegisterSupplierModal.module.css"

export default function RegisterSupplierModal({
    isOpen,
    onClose,
    supplierName,
    onSuccess,
    companyId
}) {
    const [step, setStep] = useState(1) // 1: Proveedor, 2: Producto
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [categories, setCategories] = useState([])
    const [loadingCategories, setLoadingCategories] = useState(false)
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

    // Formulario proveedor
    const [supplierData, setSupplierData] = useState({
        nombre: supplierName || "",
        telefono: "",
        email: "",
        direccion: ""
    })

    // Formulario producto
    const [productData, setProductData] = useState({
        nombre: "",
        descripcion: "",
        precio: "",
        stock_actual: "0",
        stock_minimo: "",
        categoria: ""
    })

    const [newSupplierId, setNewSupplierId] = useState(null)
    const categoryDropdownRef = useRef(null)

    // Obtener token
    const getToken = () => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("access")
        }
        return null
    }

    // Cargar categorías cuando se abre el modal
    useEffect(() => {
        if (isOpen) {
            fetchCategories()
        }
    }, [isOpen])

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        function handleClickOutside(event) {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
                setShowCategoryDropdown(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Obtener categorías de la empresa
    const fetchCategories = async () => {
        setLoadingCategories(true)
        try {
            const token = getToken()
            if (!token) return

            const response = await fetch('http://localhost:8000/api/categorias/mi-empresa/', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                const data = await response.json()
                if (data.status === 'success') {
                    setCategories(data.categorias || [])

                    // Si hay categorías, seleccionar la primera por defecto
                    if (data.categorias.length > 0 && !productData.categoria) {
                        setProductData(prev => ({
                            ...prev,
                            categoria: data.categorias[0].id_categoria.toString()
                        }))
                    }
                }
            }
        } catch (err) {
            console.error('Error cargando categorías:', err)
        } finally {
            setLoadingCategories(false)
        }
    }

    // Obtener nombre de categoría seleccionada
    const getSelectedCategoryName = () => {
        if (!productData.categoria) return "Seleccionar categoría"
        const category = categories.find(c => c.id_categoria.toString() === productData.categoria)
        return category ? category.nombre : "Seleccionar categoría"
    }

    // Manejar selección de categoría
    const handleSelectCategory = (categoryId) => {
        setProductData(prev => ({
            ...prev,
            categoria: categoryId.toString()
        }))
        setShowCategoryDropdown(false)
    }

    // Manejar cambios en formulario proveedor
    const handleSupplierChange = (e) => {
        const { name, value } = e.target
        setSupplierData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    // Manejar cambios en formulario producto
    const handleProductChange = (e) => {
        const { name, value } = e.target
        setProductData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    // Registrar proveedor
    const handleRegisterSupplier = async () => {
        setLoading(true)
        setError("")
        setSuccess("")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("No hay token de autenticación")
            }

            // Validar datos del proveedor
            if (!supplierData.nombre.trim()) {
                throw new Error("El nombre del proveedor es requerido")
            }

            const response = await fetch('http://localhost:8000/api/proveedores/crear/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(supplierData)
            })

            const data = await response.json()

            if (response.ok) {
                const newId = data.data.id_proveedor
                setNewSupplierId(newId)
                setSuccess(`Proveedor "${data.data.nombre}" registrado exitosamente`)

                // Avanzar al paso 2 después de 1 segundo
                setTimeout(() => {
                    setStep(2)
                    setSuccess("")
                }, 1000)
            } else {
                throw new Error(data.detail || data.message || "Error al registrar proveedor")
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Registrar producto
    const handleRegisterProduct = async () => {
        setLoading(true)
        setError("")
        setSuccess("")

        try {
            const token = getToken()
            if (!token) {
                throw new Error("No hay token de autenticación")
            }

            // Validar datos del producto
            if (!productData.nombre.trim()) {
                throw new Error("El nombre del producto es requerido")
            }
            if (!productData.precio || parseFloat(productData.precio) <= 0) {
                throw new Error("El precio debe ser mayor a 0")
            }
            if (!productData.stock_actual || parseInt(productData.stock_actual) < 0) {
                throw new Error("El stock actual debe ser un número positivo")
            }
            if (!productData.categoria) {
                throw new Error("Por favor seleccione una categoría")
            }

            const productPayload = {
                nombre: productData.nombre,
                descripcion: productData.descripcion,
                precio: productData.precio,
                stock_actual: 0,
                stock_minimo: parseInt(productData.stock_minimo) || 0,
                categoria: parseInt(productData.categoria),
                proveedor: newSupplierId
            }

            const response = await fetch('http://localhost:8000/api/productos/crear/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productPayload)
            })

            const data = await response.json()

            if (response.ok) {
                setSuccess(`Producto "${data.data.nombre}" registrado exitosamente`)

                // Cerrar modal después de 2 segundos y llamar callback
                setTimeout(() => {
                    if (onSuccess) {
                        onSuccess({
                            supplierId: newSupplierId,
                            supplierName: supplierData.nombre,
                            productId: data.data.id_producto,
                            productName: data.data.nombre
                        })
                    }
                    handleClose()
                }, 2000)
            } else {
                throw new Error(data.detail || data.message || "Error al registrar producto")
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Cerrar modal
    const handleClose = () => {
        setStep(1)
        setSupplierData({
            nombre: supplierName || "",
            telefono: "",
            email: "",
            direccion: ""
        })
        setProductData({
            nombre: "",
            descripcion: "",
            precio: "",
            stock_actual: "",
            stock_minimo: "",
            categoria: ""
        })
        setNewSupplierId(null)
        setError("")
        setSuccess("")
        onClose()
    }

    if (!isOpen) return null

    return (
        <>
            {/* Overlay */}
            <div className={styles.overlay} onClick={handleClose} />

            {/* Modal */}
            <div className={styles.modal}>
                {/* Header */}
                <div className={styles.modalHeader}>
                    <div className={styles.headerContent}>
                        {step === 1 ? (
                            <>
                                <UserPlus size={24} />
                                <h2>Registrar Nuevo Proveedor</h2>
                            </>
                        ) : (
                            <>
                                <Package size={24} />
                                <h2>Registrar Producto para {supplierData.nombre}</h2>
                            </>
                        )}
                    </div>
                    <button
                        className={styles.closeButton}
                        onClick={handleClose}
                        disabled={loading}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Contenido */}
                <div className={styles.modalContent}>
                    {/* Indicador de pasos */}
                    <div className={styles.stepsIndicator}>
                        <div className={`${styles.step} ${step >= 1 ? styles.active : ''}`}>
                            <span className={styles.stepNumber}>1</span>
                            <span className={styles.stepLabel}>Proveedor</span>
                        </div>
                        <div className={styles.stepConnector}></div>
                        <div className={`${styles.step} ${step >= 2 ? styles.active : ''}`}>
                            <span className={styles.stepNumber}>2</span>
                            <span className={styles.stepLabel}>Producto</span>
                        </div>
                    </div>

                    {/* Mensajes de éxito/error */}
                    {error && (
                        <div className={styles.errorMessage}>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className={styles.successMessage}>
                            {success}
                        </div>
                    )}

                    {/* Paso 1: Formulario de Proveedor */}
                    {step === 1 && (
                        <div className={styles.formStep}>
                            <p className={styles.stepDescription}>
                                Complete los datos del nuevo proveedor. El proveedor será creado y luego podrá agregar un producto.
                            </p>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Nombre del Proveedor *
                                </label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={supplierData.nombre}
                                    onChange={handleSupplierChange}
                                    className={styles.formInput}
                                    placeholder="Ej: Distribuidora XYZ"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Teléfono
                                    </label>
                                    <input
                                        type="text"
                                        name="telefono"
                                        value={supplierData.telefono}
                                        onChange={handleSupplierChange}
                                        className={styles.formInput}
                                        placeholder="Ej: 555-1234"
                                        disabled={loading}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={supplierData.email}
                                        onChange={handleSupplierChange}
                                        className={styles.formInput}
                                        placeholder="proveedor@ejemplo.com"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Dirección
                                </label>
                                <textarea
                                    name="direccion"
                                    value={supplierData.direccion}
                                    onChange={handleSupplierChange}
                                    className={styles.formTextarea}
                                    placeholder="Dirección completa del proveedor"
                                    rows="3"
                                    disabled={loading}
                                />
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    onClick={handleClose}
                                    className={styles.cancelButton}
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleRegisterSupplier}
                                    className={styles.nextButton}
                                    disabled={loading || !supplierData.nombre.trim()}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className={styles.spinner} size={16} />
                                            Registrando...
                                        </>
                                    ) : (
                                        <>
                                            Registrar Proveedor
                                            <UserPlus size={16} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Paso 2: Formulario de Producto */}
                    {step === 2 && (
                        <div className={styles.formStep}>
                            <p className={styles.stepDescription}>
                                Ahora registre un producto para el proveedor <strong>{supplierData.nombre}</strong>.
                            </p>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Nombre del Producto *
                                </label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={productData.nombre}
                                    onChange={handleProductChange}
                                    className={styles.formInput}
                                    placeholder="Ej: Producto XYZ"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Descripción
                                </label>
                                <textarea
                                    name="descripcion"
                                    value={productData.descripcion}
                                    onChange={handleProductChange}
                                    className={styles.formTextarea}
                                    placeholder="Descripción detallada del producto"
                                    rows="3"
                                    disabled={loading}
                                />
                            </div>

                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Precio Unitario (Bs) *
                                    </label>
                                    <input
                                        type="number"
                                        name="precio"
                                        value={productData.precio}
                                        onChange={handleProductChange}
                                        className={styles.formInput}
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                        required
                                        disabled={loading}
                                    />
                                </div>

                            </div>

                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>
                                        Stock Mínimo
                                    </label>
                                    <input
                                        type="number"
                                        name="stock_minimo"
                                        value={productData.stock_minimo}
                                        onChange={handleProductChange}
                                        className={styles.formInput}
                                        placeholder="0"
                                        min="0"
                                        disabled={loading}
                                    />
                                </div>

                                <div className={styles.formGroup} ref={categoryDropdownRef}>
                                    <label className={styles.formLabel}>
                                        Categoría *
                                    </label>
                                    <div className={styles.dropdownContainer}>
                                        <button
                                            type="button"
                                            className={styles.dropdownButton}
                                            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                            disabled={loading || loadingCategories}
                                        >
                                            <span className={styles.dropdownSelected}>
                                                {loadingCategories ? "Cargando categorías..." : getSelectedCategoryName()}
                                            </span>
                                            <ChevronDown size={16} className={`${styles.dropdownIcon} ${showCategoryDropdown ? styles.rotated : ''}`} />
                                        </button>

                                        {showCategoryDropdown && (
                                            <div className={styles.dropdownMenu}>
                                                {loadingCategories ? (
                                                    <div className={styles.dropdownLoading}>
                                                        <Loader2 className={styles.spinner} size={16} />
                                                        Cargando categorías...
                                                    </div>
                                                ) : categories.length === 0 ? (
                                                    <div className={styles.dropdownEmpty}>
                                                        No hay categorías disponibles
                                                    </div>
                                                ) : (
                                                    categories.map(category => (
                                                        <button
                                                            key={category.id_categoria}
                                                            type="button"
                                                            className={`${styles.dropdownItem} ${productData.categoria === category.id_categoria.toString() ? styles.selected : ''}`}
                                                            onClick={() => handleSelectCategory(category.id_categoria)}
                                                        >
                                                            <span className={styles.categoryName}>{category.nombre}</span>
                                                            <span className={styles.categoryDescription}>
                                                                {category.descripcion || "Sin descripción"}
                                                            </span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <small className={styles.helperText}>
                                        Seleccione la categoría a la que pertenece el producto
                                    </small>
                                </div>
                            </div>

                            <div className={styles.formNote}>
                                <strong>Nota:</strong> El producto será registrado automáticamente bajo el proveedor <strong>{supplierData.nombre}</strong> (ID: {newSupplierId}).
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    onClick={() => setStep(1)}
                                    className={styles.backButton}
                                    disabled={loading}
                                >
                                    ← Volver
                                </button>
                                <button
                                    onClick={handleRegisterProduct}
                                    className={styles.submitButton}
                                    disabled={loading || !productData.nombre.trim() || !productData.precio || !productData.stock_actual}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className={styles.spinner} size={16} />
                                            Registrando...
                                        </>
                                    ) : (
                                        <>
                                            Registrar Producto
                                            <Package size={16} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}