"use client"

import { ShoppingCart } from "lucide-react"
import styles from "./CartButton.module.css"

export default function CartButton({ itemCount, total, onClick }) {
    return (
        <button className={styles.cartButton} onClick={onClick}>
            <div className={styles.cartIcon}>
                <ShoppingCart size={24} />
                {itemCount > 0 && (
                    <span className={styles.cartBadge}>
                        {itemCount > 99 ? '99+' : itemCount}
                    </span>
                )}
            </div>
            <div className={styles.cartInfo}>
                <span className={styles.cartLabel}>Carrito</span>
                <span className={styles.cartTotal}>Bs {total.toFixed(2)}</span>
            </div>
        </button>
    )
}