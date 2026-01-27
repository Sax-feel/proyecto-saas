"use client"

import { useState, useEffect } from 'react';
import { X, ShoppingCart, Trash2, Plus, Minus, Edit2, Check } from "lucide-react"
import styles from "./CartSidebar.module.css"

export default function CartSidebar({
    isOpen,
    onClose,
    cart,
    onUpdateQuantity,
    onUpdateItemPrice,
    onRemoveItem,
    onClearCart,
    onCheckout
}) {
    const [editingPriceItemId, setEditingPriceItemId] = useState(null);
    const [priceInputs, setPriceInputs] = useState({});

    // Inicializar priceInputs con los precios actuales del carrito
    useEffect(() => {
        const initialPrices = {};
        cart.forEach(item => {
            initialPrices[item.id] = item.unitPrice.toFixed(2);
        });
        setPriceInputs(initialPrices);
    }, [cart]);

    const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
    const itemCount = cart.length;

    const handlePriceFocus = (itemId, currentPrice) => {
        setEditingPriceItemId(itemId);
        if (!priceInputs[itemId]) {
            setPriceInputs(prev => ({
                ...prev,
                [itemId]: currentPrice.toFixed(2)
            }));
        }
    };

    const handlePriceChange = (itemId, value) => {
        // Validar que sea un número positivo
        if (/^\d*\.?\d*$/.test(value)) {
            setPriceInputs(prev => ({
                ...prev,
                [itemId]: value
            }));
        }
    };

    const handlePriceBlur = (itemId) => {
        const newPrice = parseFloat(priceInputs[itemId]);
        if (newPrice > 0 && onUpdateItemPrice) {
            onUpdateItemPrice(itemId, newPrice);
        }
        setEditingPriceItemId(null);
    };

    const handlePriceKeyPress = (e, itemId) => {
        if (e.key === 'Enter') {
            handlePriceBlur(itemId);
        }
    };

    return (
        <>
            {/* Overlay */}
            {isOpen && <div className={styles.overlay} onClick={onClose} />}

            {/* Sidebar */}
            <div className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
                {/* Header */}
                <div className={styles.sidebarHeader}>
                    <div className={styles.headerContent}>
                        <ShoppingCart size={24} />
                        <h2>Carrito de Compras</h2>
                        {itemCount > 0 && (
                            <span className={styles.itemCount}>
                                {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            </span>
                        )}
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Contenido */}
                <div className={styles.sidebarContent}>
                    {itemCount === 0 ? (
                        <div className={styles.emptyCart}>
                            <ShoppingCart size={48} />
                            <p>El carrito está vacío</p>
                            <p className={styles.emptyMessage}>
                                Añade productos para realizar una compra de stock
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Lista de items */}
                            <div className={styles.cartItems}>
                                {cart.map(item => (
                                    <div key={item.id} className={styles.cartItem}>
                                        <div className={styles.itemInfo}>
                                            <div className={styles.itemHeader}>
                                                <h4 className={styles.itemName}>{item.name}</h4>
                                                <div className={styles.priceEditControls}>
                                                    {editingPriceItemId === item.id ? (
                                                        <div className={styles.priceEditInputContainer}>
                                                            <span className={styles.currencySymbol}>Bs</span>
                                                            <input
                                                                type="text"
                                                                value={priceInputs[item.id]}
                                                                onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                                                onBlur={() => handlePriceBlur(item.id)}
                                                                onKeyPress={(e) => handlePriceKeyPress(e, item.id)}
                                                                className={styles.priceEditInput}
                                                                placeholder="0.00"
                                                                autoFocus
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div 
                                                            className={styles.currentPriceDisplay}
                                                            onClick={() => handlePriceFocus(item.id, item.unitPrice)}
                                                        >
                                                            <span className={styles.priceLabel}>Precio:</span>
                                                            <span className={styles.priceValue}>
                                                                Bs {item.unitPrice.toFixed(2)}
                                                            </span>
                                                            <Edit2 size={12} className={styles.editIcon} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={styles.itemDetails}>
                                                <p className={styles.supplierInfo}>
                                                    <strong>Proveedor:</strong> {item.supplierName}
                                                </p>
                                                <p className={styles.supplierInfo}>
                                                    <strong>Stock actual:</strong> {item.stock_actual}
                                                </p>
                                            </div>
                                        </div>

                                        <div className={styles.itemControls}>
                                            <div className={styles.quantitySection}>
                                                <div className={styles.quantityHeader}>
                                                    <span className={styles.quantityLabel}>Cantidad:</span>
                                                </div>
                                                <div className={styles.quantityControls}>
                                                    <button
                                                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                                        className={styles.quantityButton}
                                                        disabled={item.quantity <= 1}
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className={styles.quantityDisplay}>
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                                        className={styles.quantityButton}
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className={styles.itemTotalSection}>
                                                <button
                                                    onClick={() => onRemoveItem(item.id)}
                                                    className={styles.removeButton}
                                                    title="Eliminar del carrito"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Total y acciones */}
                            <div className={styles.cartFooter}>
                                <div className={styles.summarySection}>
                                    <div className={styles.summaryRow}>
                                        <span>Subtotal:</span>
                                        <span>Bs {cartTotal.toFixed(2)}</span>
                                    </div>
                                    <div className={styles.totalRow}>
                                        <span className={styles.totalLabel}>Total a pagar:</span>
                                        <span className={styles.totalAmount}>Bs {(cartTotal).toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className={styles.cartActions}>
                                    <button
                                        onClick={onClearCart}
                                        className={styles.clearButton}
                                    >
                                        Vaciar carrito
                                    </button>
                                    <button
                                        onClick={onCheckout}
                                        className={styles.checkoutButton}
                                    >
                                        Confirmar compra
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}