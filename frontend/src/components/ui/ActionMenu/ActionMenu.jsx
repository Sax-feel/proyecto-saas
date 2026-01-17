"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ActionMenu.module.css";

export default function ActionMenu({ id, estado, onEditar, onToggle, onEliminar }) {
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
      >
        ⋮
      </button>

      {menuAbierto && (
        <div className={styles.menuDropdown} ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button className={styles.menuItem} onClick={() => { onEditar(id); setMenuAbierto(false); }}>
            <span className={styles.menuIcon}>✏️</span>Editar
          </button>

          <button className={styles.menuItem} onClick={() => { onToggle(id, estado); setMenuAbierto(false); }}>
            <span className={styles.menuIcon}>{estado === "activo" ? "🚫" : "✅"}</span>
            {estado === "activo" ? "Desactivar" : "Activar"}
          </button>

          <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => { onEliminar(id); setMenuAbierto(false); }}>
            <span className={styles.menuIcon}>🗑️</span>Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
