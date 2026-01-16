from django.db import models
from admins.models import Admin

class Empresa(models.Model):

    ESTADOS = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('pendiente', 'Pendiente'),
        ('bloqueado', 'Bloqueado'),
    ]

    id_empresa = models.AutoField(primary_key=True)
    admin = models.ForeignKey(Admin, on_delete=models.CASCADE, null=True, blank=True, db_column='admin_id')
    nombre = models.CharField(max_length=100)
    nit = models.CharField(max_length=20,unique=True)
    rubro = models.CharField(max_length=20)
    direccion = models.CharField(max_length=200)
    telefono = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    estado = models.CharField(max_length=50, choices=ESTADOS, default='inactivo')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "empresa"
        ordering = ["id_empresa"]
