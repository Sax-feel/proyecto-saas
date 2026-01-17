"use client";

import styles from "./table.module.css";

export default function Tables({
  columns,
  data = [],        // <- aquí ya aseguramos que siempre sea un array
  renderActions,
  emptyMessage = "No hay registros",
  rowKey = "id",
}) {
  // No redeclaramos data, usamos directamente la prop
  const safeData = Array.isArray(data) ? data : [];

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.label}</th>
          ))}
        </tr>
      </thead>

      <tbody>
        {safeData.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className={styles.empty}>
              {emptyMessage}
            </td>
          </tr>
        ) : (
          safeData.map((row) => (
            <tr key={row[rowKey]}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}

              {renderActions && (
                <td className={styles.actionsCell}>{renderActions(row)}</td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
