"use client"

import FormField from "../FormField/FormField"
import styles from "./SearchBar.module.css"

export default function SearchBar({ value, onChange, placeholder = "Buscar..." }) {
  return (
    <div className={styles.searchContainer}>
      <FormField
        label=""
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  )
}
