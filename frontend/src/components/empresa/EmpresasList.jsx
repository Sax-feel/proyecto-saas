import EmpresaCard from './EmpresaCard';
import styles from './EmpresasList.module.css';

export default function EmpresasList({ empresas, searchTerm }) {
    if (empresas.length === 0 && searchTerm) {
        return (
            <div className={styles.noResults}>
                <p>No se encontraron empresas que coincidan con "{searchTerm}"</p>
            </div>
        );
    }

    if (empresas.length === 0) {
        return (
            <div className={styles.noResults}>
                <p>No hay empresas registradas</p>
            </div>
        );
    }

    return (
        <div className={styles.empresasList}>
            {empresas.map((empresa) => (
                <EmpresaCard key={empresa.id_empresa} empresa={empresa} />
            ))}
        </div>
    );
}