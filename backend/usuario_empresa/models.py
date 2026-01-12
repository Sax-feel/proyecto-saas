from django.db import models


#id_usuario(PK), estado, fecha_asignación, id_empresa(FK)

class Usuario_Empresa(models.Model):

    ESTADOS = {
        "ACTIVO": "activo",
        "INACTIVO": "inactivo",
    }

    id_usuario = models.OneToOneField('usuarios.usuario',on_delete=models.CASCADE, primary_key=True)
    empresa_id = models.ForeignKey('empresas.Empresa', on_delete=models.CASCADE, db_column='id_empresa')
    estado = models.CharField(max_length=50, choices=ESTADOS, default=ESTADOS["INACTIVO"])
    fecha_asignacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "usuario_empresa"
        ordering = ["id_usuario"]

