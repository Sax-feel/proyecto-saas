import styles from "./EmpresasTable.module.css";
import { formatDate } from "../../../utils/formatDate";

export default function EmpresasTable({ empresas, loading }) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>NIT</th>
            <th>Email</th>
            <th>Estado</th>
            <th>Registro</th>
          </tr>
        </thead>

        <tbody>
          {loading && (
            <tr>
              <td colSpan="6" className={styles.loading}>
                Cargando empresas...
              </td>
            </tr>
          )}

          {!loading && empresas.length === 0 && (
            <tr>
              <td colSpan="6" className={styles.empty}>
                No hay empresas registradas
              </td>
            </tr>
          )}

          {!loading &&
            empresas.map((empresa) => (
              <tr key={empresa.id_empresa} className={styles.row}>
                <td>{empresa.id_empresa}</td>
                <td className={styles.name}>{empresa.nombre}</td>
                <td>{empresa.nit}</td>
                <td>{empresa.email}</td>
                <td>
                  <span
                    className={`${styles.badge} ${styles[empresa.estado]}`}
                  >
                    {empresa.estado}
                  </span>
                </td>
                <td>{formatDate(empresa.fecha_creacion)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
