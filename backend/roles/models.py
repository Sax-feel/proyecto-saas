from django.db import models

#Rol: id_rol(PK), rol, descripción, estado
class Rol(models.Model):

    ROLES = [
        ('vendedor', 'Vendedor'),
        ('admin', 'Administrador'),
        ('cliente', 'Cliente'),
        ('admin_empresa', 'Administrador Empresa'),
    ]

    ESTADOS = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
    ]

    id_rol = models.AutoField(primary_key=True)
    rol = models.CharField(max_length=50, choices=ROLES, default='cliente')
    descripcion = models.CharField(max_length=100)
    estado = models.CharField(max_length=50, choices=ESTADOS, default='inactivo')

    class Meta:
        db_table = "rol"
        ordering = ["id_rol"]