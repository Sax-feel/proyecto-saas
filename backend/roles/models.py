from django.db import models

#Rol: id_rol(PK), rol, descripción, estado
class Rol(models.Model):

    ROLES = {
        "VENDEDOR": "vendedor",
        "ADMIN": "admin",
        "CLIENTE": "cliente",
        "ADMIN_EMPRESA": "admin_empresa"
    }

    ESTADOS = {
        "ACTIVO": "activo",
        "INACTIVO": "inactivo",
    }

    id_rol = models.AutoField(primary_key=True)
    rol = models.CharField(max_length=50, choices=ROLES, default=ROLES["CLIENTE"])
    descripcion = models.CharField(max_length=100)
    estado = models.CharField(max_length=50, choices=ESTADOS, default=ESTADOS["INACTIVO"])

    class Meta:
        db_table = "rol"
        ordering = ["id_rol"]