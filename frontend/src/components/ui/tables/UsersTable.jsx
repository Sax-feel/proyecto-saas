import styles from "./UsersTable.module.css";
import { formatDate } from "../../../utils/formatDate";
import { getEmpresaUsuario } from "../../../utils/getEmpresaUsuario";

export default function UsersTable({ users, loading }) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Empresa</th>
            <th>Registro</th>
            <th>Último Login</th>
          </tr>
        </thead>

        <tbody>
          {loading && (
            <tr>
              <td colSpan="7" className={styles.loading}>
                Cargando usuarios...
              </td>
            </tr>
          )}

          {!loading && users.length === 0 && (
            <tr>
              <td colSpan="7" className={styles.empty}>
                No hay usuarios registrados
              </td>
            </tr>
          )}

          {!loading &&
            users.map((user) => (
              <tr key={user.id_usuario}>
                <td>{user.id_usuario}</td>
                <td className={styles.email}>{user.email}</td>

                <td>
                  <span className={`${styles.badge} ${styles[user.rol]}`}>
                    {user.rol}
                  </span>
                </td>

                <td>
                  <span className={`${styles.badge} ${styles[user.estado]}`}>
                    {user.estado}
                  </span>
                </td>

                <td>{getEmpresaUsuario(user)}</td>
                <td>{formatDate(user.fecha_creacion)}</td>
                <td>
                  {user.ultimo_login
                    ? formatDate(user.ultimo_login)
                    : "Nunca"}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
