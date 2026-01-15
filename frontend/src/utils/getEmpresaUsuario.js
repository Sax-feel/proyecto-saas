// obtiene el nombre de la empresa de un usuario
export function getEmpresaUsuario(user) {
  if (user.informacion_adicional?.empresa) {
    return user.informacion_adicional.empresa.nombre;
  }
  if (user.usuario_empresa?.nombre_empresa) {
    return user.usuario_empresa.nombre_empresa;
  }
  return "-";
}
