"use client"

import { useState, useEffect, useCallback } from "react"
import Sidebar from "../../../components/layout/Sidebar/Sidebar"
import CartButton from "../../../components/compras/CartButton"
import ProductGrid from "../../../components/compras/ProductGrid"
import SearchFilters from "../../../components/compras/SearchFilters"
import CartSidebar from "../../../components/compras/CartSidebar"
import styles from "./ComprasStock.module.css"

export default function ComprasStockPage() {
    const [collapsed, setCollapsed] = useState(false)
    const [products, setProducts] = useState([])
    const [cart, setCart] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showCart, setShowCart] = useState(false)
    const [suppliers, setSuppliers] = useState([])
    const [categories, setCategories] = useState([])
    const [filters, setFilters] = useState({
        supplier: "",
        search: "",
        category: "",
        status: "activo"
    })
    const [stats, setStats] = useState(null)
    const [company, setCompany] = useState(null)

    // Obtener token
    const getToken = () => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("access")
        }
        return null
    }

    // Fetch products
    const fetchProducts = async () => {
        setLoading(true)
        try {
            const token = getToken()
            if (!token) throw new Error("No hay token de autenticación")

            // Construir query params para filtros
            const params = new URLSearchParams()
            if (filters.supplier) params.append('proveedor_id', filters.supplier)
            if (filters.category) params.append('categoria_id', filters.category)
            if (filters.search) params.append('nombre', filters.search)
            if (filters.status) params.append('estado', filters.status)

            const url = `http://localhost:8000/api/productos/mi-empresa/${params.toString() ? `?${params.toString()}` : ''}`

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Error al cargar productos')
            }

            const data = await response.json()

            if (data.status === 'success') {
                setProducts(data.productos || [])
                setStats(data.estadisticas || null)
                setCompany(data.empresa || null)
                // Extraer proveedores únicos de los productos
                const uniqueSuppliers = Array.from(
                    new Map(
                        data.productos
                            .filter(p => p.proveedor !== undefined && p.proveedor !== null)
                            .map(p => {
                                // Extraer ID y nombre del proveedor
                                const supplierId = p.proveedor;
                                const supplierName = p.proveedor_nombre || `Proveedor ${supplierId}`;

                                // Contar productos por proveedor
                                const productCount = data.productos.filter(
                                    prod => prod.proveedor === supplierId
                                ).length;

                                return [supplierId, {
                                    id: supplierId,
                                    name: supplierName,
                                    productCount: productCount
                                }];
                            })
                    ).values()
                )
                setSuppliers(uniqueSuppliers)

                // Extraer categorías únicas
                const uniqueCategories = Array.from(
                    new Map(
                        data.productos
                            .filter(p => p.categoria && p.categoria_nombre)
                            .map(p => [p.categoria, { id: p.categoria, name: p.categoria_nombre }])
                    ).values()
                )
                setCategories(uniqueCategories)

                setError(null)
            } else {
                throw new Error(data.message || 'Error en la respuesta del servidor')
            }
        } catch (err) {
            setError(err.message)
            console.error('Error fetching products:', err)
        } finally {
            setLoading(false)
        }
    }

    // Fetch images for all products
    const fetchProductImages = async () => {
        try {
            const token = getToken()
            if (!token) return

            const response = await fetch('http://localhost:8000/api/archivos/listar/', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (response.ok) {
                const allImages = await response.json()

                // Actualizar productos con sus imágenes
                setProducts(prevProducts =>
                    prevProducts.map(product => {
                        const productImages = allImages.filter(img =>
                            img.producto === product.nombre
                        )
                        return {
                            ...product,
                            images: productImages,
                            mainImage: productImages.length > 0 ? productImages[0].archivo : null
                        }
                    })
                )
            }
        } catch (err) {
            console.error('Error fetching images:', err)
        }
    }

    // Cargar productos inicialmente
    useEffect(() => {
        fetchProducts()
    }, [])

    // Cargar imágenes después de cargar productos
    useEffect(() => {
        if (products.length > 0) {
            fetchProductImages()
        }
    }, [products.length])

    // Añadir producto al carrito
    // Reemplaza toda la función addToCart actual con esta:
    const addToCart = (product, quantity = 1, supplierId, unitPrice) => {
        console.log('Agregando al carrito:', {
            productId: product.id_producto,
            productName: product.nombre,
            id_proveedor: product.proveedor.id,
            quantity,
            unitPrice
        });

        // Buscar si el producto ya está en el carrito CON EL MISMO PROVEEDOR
        const existingItemIndex = cart.findIndex(item =>
            item.id_producto === product.id_producto
        );

        // Obtener nombre del proveedor
        let supplierName = 'Proveedor no especificado';

        if (typeof supplierId === 'object') {
            // Si supplierId es objeto, extraer el nombre
            supplierName = supplierId.name || supplierId.nombre || supplierName;
        } else {
            // Buscar en el producto
            supplierName = product.proveedor_nombre ||
                product.proveedorInfo?.name ||
                product.proveedorInfo?.nombre ||
                supplierName;
        }

        console.log('Proveedor seleccionado:', {
            id: product.proveedor.id,
            name: supplierName,
            productName: product.nombre
        });

        if (existingItemIndex >= 0) {
            // Ya existe, mostrar mensaje y NO agregar más
            alert('Este producto ya está en el carrito. Puedes editar la cantidad desde el carrito.');
            return false; // Importante: retornar false para que ProductCard sepa que no se agregó
        } else {
            // Añadir nuevo item
            const newItem = {
                id: `${product.id_producto}-${supplierId}-${Date.now()}`, // ID único
                id_producto: product.id_producto,
                name: product.nombre,
                quantity,
                supplierId: product.proveedor.id,
                supplierName: supplierName,
                unitPrice: parseFloat(unitPrice) || parseFloat(product.precio),
                total: quantity * (parseFloat(unitPrice) || parseFloat(product.precio)),
                stock_actual: product.stock_actual, // Stock actual solo para información
                // Elimina maxStock o cámbialo por un valor muy alto
                maxStock: 999999
            };
            console.log('Nuevo item agregado al carrito:', newItem);
            setCart([...cart, newItem]);
            return true; // Retornar true para indicar éxito
        }
    };

    // Añade esta nueva función para actualizar precio en el carrito:
    const updateCartItem = (itemId, updates) => {
        setCart(prev =>
            prev.map(item => {
                if (item.id === itemId) {
                    const newQuantity = updates.quantity || item.quantity;
                    const newPrice = updates.unitPrice || item.unitPrice;
                    return {
                        ...item,
                        ...updates,
                        total: newQuantity * newPrice
                    };
                }
                return item;
            })
        );
    };

    // Añade esta función para actualizar precio específico:
    const updateItemPrice = (itemId, newPrice) => {
        updateCartItem(itemId, { unitPrice: newPrice });
    };

    // Añade esta función para actualizar cantidad específica:
    const updateItemQuantity = (itemId, newQuantity) => {
        if (newQuantity < 1) {
            removeFromCart(itemId);
            return;
        }

        updateCartItem(itemId, { quantity: newQuantity });
    };

    // Eliminar producto del carrito
    const removeFromCart = (itemId) => {
        setCart(cart.filter(item => item.id !== itemId))
    }

    // Vaciar carrito
    const clearCart = () => {
        setCart([])
    }

    // Calcular total del carrito
    const cartTotal = cart.reduce((sum, item) => sum + item.total, 0)

    // Función para realizar la compra
    const handleCheckout = async () => {
        if (cart.length === 0) {
            alert("El carrito está vacío");
            return;
        }

        if (!window.confirm(`¿Confirmar compra de ${cart.length} productos por un total de Bs ${(cartTotal * 1.13).toFixed(2)}?`)) {
            return;
        }

        try {
            const token = getToken();
            if (!token) {
                alert("No hay token de autenticación");
                return;
            }

            // Preparar los detalles para la compra
            const detalles = cart.map(item => ({

                id_producto: item.id_producto,
                cantidad: item.quantity,
                precio_unitario: item.unitPrice.toString(),
                id_proveedor: parseInt(item.supplierId)
            }));

            console.log("detalles", detalles)

            const compraData = {
                detalles: detalles
            };

            console.log("Enviando compra:", compraData);

            const response = await fetch('http://localhost:8000/api/compras/realizar/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(compraData)
            });

            const data = await response.json();

            if (response.ok) {
                alert(data.message || "Compra realizada exitosamente");

                // Vaciar carrito después de compra exitosa
                setCart([]);

                // Actualizar la lista de productos
                await fetchProducts();

                // Cerrar el carrito
                setShowCart(false);
            } else {
                throw new Error(data.detail || data.message || "Error al realizar la compra");
            }
        } catch (error) {
            console.error("Error en checkout:", error);
            alert(`Error: ${error.message}`);
        }
    };

    // Aplicar filtros
    const filteredProducts = products.filter(product => {
        // Filtro por proveedor (por nombre o ID)
        if (filters.supplier) {
            const supplierFilter = filters.supplier.toString();
            const productSupplierId = product.proveedor?.toString();
            const productSupplierName = product.proveedor_nombre?.toLowerCase() || "";

            // Si el filtro es numérico, comparar por ID
            if (!isNaN(supplierFilter)) {
                if (productSupplierId !== supplierFilter) {
                    return false;
                }
            }
            // Si el filtro es texto, comparar por nombre
            else {
                if (!productSupplierName.includes(supplierFilter.toLowerCase())) {
                    return false;
                }
            }
        }

        // Filtro por categoría
        if (filters.category && product.categoria !== parseInt(filters.category)) {
            return false
        }

        // Filtro por estado
        if (filters.status && product.estado !== filters.status) {
            return false
        }

        // Filtro por búsqueda de texto
        if (filters.search) {
            const searchLower = filters.search.toLowerCase()
            return (
                product.nombre.toLowerCase().includes(searchLower) ||
                product.descripcion?.toLowerCase().includes(searchLower) ||
                product.categoria_nombre?.toLowerCase().includes(searchLower)
            )
        }

        return true
    })



    // Handle filter changes
    const handleFilterChange = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }))
    }, [])

    // Reset all filters
    const resetFilters = () => {
        setFilters({
            supplier: "",
            search: "",
            category: "",
            status: "activo"
        })
    }

    return (
        <div className={styles.dashboardContainer}>
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

            <div className={`${styles.mainContent} ${collapsed ? styles.collapsed : ""}`}>
                {/* Header */}
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.title}>Compras de Stock</h1>
                    </div>

                    {/* Botón del carrito */}
                    <CartButton
                        itemCount={cart.length}
                        total={cartTotal}
                        onClick={() => setShowCart(true)}
                    />
                </div>
                {/* Filtros de búsqueda */}
                <div className={styles.filtersSection}>
                    <SearchFilters
                        suppliers={suppliers}
                        categories={categories}
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onReset={resetFilters}
                        loading={loading}
                    />
                </div>

                {/* Contenido principal */}
                <div className={styles.contentArea}>
                    {loading ? (
                        <div className={styles.loadingState}>
                            <div className={styles.spinner}></div>
                            <p>Cargando productos...</p>
                        </div>
                    ) : error ? (
                        <div className={styles.errorState}>
                            <p className={styles.errorText}>Error: {error}</p>
                            <button
                                className={styles.retryButton}
                                onClick={fetchProducts}
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No se encontraron productos con los filtros aplicados.</p>
                            <button
                                className={styles.resetButton}
                                onClick={resetFilters}
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className={styles.resultsHeader}>
                                <h2>
                                    Productos disponibles
                                    <span className={styles.resultsCount}> ({filteredProducts.length})</span>
                                </h2>
                                <button
                                    className={styles.refreshButton}
                                    onClick={fetchProducts}
                                >
                                    Actualizar lista
                                </button>
                            </div>

                            <ProductGrid
                                productos={filteredProducts}  // <-- NOMBRE DE PROP CORRECTO
                                onAddToCart={addToCart}
                                onUpdateCartItem={updateCartItem}
                                cartItems={cart}
                                loading={loading}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Sidebar del carrito */}
            <CartSidebar
                isOpen={showCart}
                onClose={() => setShowCart(false)}
                cart={cart}
                onUpdateQuantity={updateItemQuantity}
                onUpdateItemPrice={updateItemPrice}
                onRemoveItem={removeFromCart}
                onClearCart={clearCart}
                onCheckout={handleCheckout}
            />
        </div>
    )
}