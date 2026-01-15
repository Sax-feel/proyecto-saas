from django.db import models
from usuarios.models import User

class Usuario_Empresa(models.Model):

    ESTADOS = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
    ]

    id_usuario = models.OneToOneField(User,on_delete=models.CASCADE, primary_key=True)
    empresa_id = models.ForeignKey('empresas.Empresa', on_delete=models.CASCADE, db_column='empresa_id')
    estado = models.CharField(max_length=50, choices=ESTADOS, default='inactivo')
    fecha_modificacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "usuario_empresa"
        ordering = ["id_usuario"]

