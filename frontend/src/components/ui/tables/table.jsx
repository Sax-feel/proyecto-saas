"use client";

import styles from "./table.module.css";

export default function Tables({
  columns = [],
  data = [],
  renderActions,
  emptyMessage = "No hay registros",
  rowKey = "id",
}) {
  const safeData = Array.isArray(data) ? data : [];

  const colSpan = columns.length + (renderActions ? 1 : 0);

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.label}</th>
          ))}
          {renderActions && <th>Acciones</th>}
        </tr>
      </thead>

      <tbody>
        {safeData.length === 0 ? (
          <tr>
            <td colSpan={colSpan} className={styles.empty}>
              {emptyMessage}
            </td>
          </tr>
        ) : (
          safeData.map((row, index) => (
            <tr key={row[rowKey] ?? index}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row) : row[col.key] ?? "-"}
                </td>
              ))}

              {renderActions && (
                <td className={styles.actionsCell}>
                  {renderActions(row)}
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
