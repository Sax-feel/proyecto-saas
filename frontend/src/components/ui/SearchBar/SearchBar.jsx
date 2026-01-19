"use client";

import styles from "./SearchBar.module.css";

export default function SearchBar({ value, onChange, placeholder = "Buscar..." }) {
  return (
    <div className={styles.searchContainer}>
      <input
        type="text"
        className={styles.searchInput}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label="Buscar"
      />
    </div>
  );
}
