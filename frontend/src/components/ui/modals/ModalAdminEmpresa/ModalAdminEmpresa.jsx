import styles from "./ModalAdminEmpresa.module.css";
import Button from "../../button/Button";
import Input from "../../input/Input";
import FormField from "../../FormField/FormField";

export default function ModalAdminEmpresa({
  adminForm,
  empresas,
  handleChange,
  handleClose,
  handleSubmit
}) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h3>Registrar Admin de Empresa</h3>
          <button onClick={handleClose} className={styles.closeButton}>
            &times;
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Email */}
          <FormField label="Email *">
            <Input
              type="email"
              name="email"
              value={adminForm.email}
              onChange={handleChange}
              placeholder="Ej: admin@nuevaempresa.com"
              required
            />
          </FormField>

          {/* Password */}
          <FormField label="Password *">
            <Input
              type="password"
              name="password"
              value={adminForm.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
            />
          </FormField>

          {/* Selección de Empresa */}
          <FormField label="Empresa *">
            <select
              name="empresa_id"
              value={adminForm.empresa_id}
              onChange={handleChange}
              required
              className={styles.select}
            >
              <option value="">Seleccionar Empresa</option>
              {empresas.map((empresa) => (
                <option key={empresa.id_empresa} value={empresa.id_empresa}>
                  {empresa.nombre} ({empresa.nit})
                </option>
              ))}
            </select>
          </FormField>

          {/* Acciones */}
          <div className={styles.modalActions}>
            <Button type="submit">Registrar Admin</Button>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}