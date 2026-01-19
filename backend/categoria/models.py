from django.db import models
from empresas.models import Empresa

class Categoria(models.Model):
    """Modelo para categorías de productos"""
    ESTADOS = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
    ]
    
    id_categoria = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='activo')
    empresa = models.ForeignKey(
        Empresa, 
        on_delete=models.CASCADE,
        related_name='categorias'
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "categoria"
        ordering = ['nombre']
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"
        unique_together = ['nombre', 'empresa']

    def __str__(self):
        return self.nombre