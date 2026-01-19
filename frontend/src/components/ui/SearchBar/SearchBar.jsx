"use client";

import { Search } from "lucide-react";
import styles from "./SearchBar.module.css";

export default function SearchBar({ 
  value, 
  onChange, 
  placeholder = "Buscar...",
  fullWidth = true 
}) {
  return (
    <div className={`${styles.searchContainer} ${fullWidth ? styles.fullWidth : ""}`}>
      <div className={styles.searchWrapper}>
        <Search className={styles.searchIcon} size={20} />
        <input
          type="text"
          className={styles.searchInput}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-label="Buscar"
        />
        {value && (
          <button 
            className={styles.clearButton} 
            onClick={() => onChange({ target: { value: '' } })}
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}