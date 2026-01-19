from django.db import models
from django.core.validators import MinValueValidator
from empresas.models import Empresa

class Proveedor(models.Model):
    """Modelo para proveedores"""
    id_proveedor = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=200)
    telefono = models.CharField(max_length=20)
    email = models.EmailField(max_length=100)
    direccion = models.CharField(max_length=255)
    empresa = models.ForeignKey(
        Empresa, 
        on_delete=models.CASCADE,
        related_name='proveedores'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "proveedor"
        ordering = ['nombre']
        verbose_name = "Proveedor"
        verbose_name_plural = "Proveedores"
        unique_together = ['nombre', 'empresa']

    def __str__(self):
        return self.nombre