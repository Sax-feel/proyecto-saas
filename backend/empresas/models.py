from django.db import models

class Empresa(models.Model):

    ESTADOS = {
        "ACTIVO": "activo",
        "INACTIVO": "inactivo",
        "PENDIENTE": "pendiente",
        "BLOQUEADO": "bloqueado"
    }

    id_empresa = models.AutoField(primary_key=True)
    admin_id = models.ForeignKey('usuario_empresa.Usuario_Empresa', on_delete=models.CASCADE, db_column='id_usuario', null=True, blank=True)
    nombre = models.CharField(max_length=100)
    nit = models.CharField(max_length=20,unique=True)
    direccion = models.CharField(max_length=200)
    telefono = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    estado = models.CharField(max_length=50, choices=ESTADOS, default=ESTADOS["INACTIVO"])
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "empresa"
        ordering = ["id_empresa"]