"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ActionMenu.module.css";
import { SquarePen, Trash, CirclePlus } from "lucide-react"

export default function ActionMenu({
    id = null,
    estado = "activo",
    producto = null, // Añadimos el objeto producto completo
    onEditar = () => { },
    onAñadirStock = () => { }, // Nueva prop para añadir stock
    onEliminar = () => { },
}) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuRef = useRef(null);

    // Cerrar menú al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuAbierto(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={styles.actionsCell}>
            <button
                className={styles.menuButton}
                onClick={(e) => {
                    e.stopPropagation();
                    setMenuAbierto((prev) => !prev);
                }}
                aria-label="Abrir menú de acciones"
            >
                ⋮
            </button>

            {menuAbierto && (
                <div
                    className={styles.menuDropdown}
                    ref={menuRef}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className={styles.menuItem}
                        onClick={() => {
                            onEditar(producto); // Pasamos el producto completo
                            setMenuAbierto(false);
                        }}
                        aria-label="Editar"
                    >
                        <span className={styles.menuIcon}><SquarePen /></span>Editar
                    </button>
                    <button
                        className={styles.menuItem}
                        onClick={() => {
                            onAñadirStock(producto); // Pasamos el producto completo
                            setMenuAbierto(false);
                        }}
                        aria-label="Añadir Stock"
                    >
                        <span className={styles.menuIcon}><CirclePlus /></span>Añadir Stock
                    </button>

                    <button
                        className={`${styles.menuItem} ${styles.menuItemDanger}`}
                        onClick={() => {
                            onEliminar(id);
                            setMenuAbierto(false);
                        }}
                        aria-label="Eliminar"
                    >
                        <span className={styles.menuIcon}><Trash /></span>Eliminar
                    </button>
                </div>
            )}
        </div>
    );
}