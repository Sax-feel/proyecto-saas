from django.db import models
from django.core.validators import MinValueValidator
from empresas.models import Empresa
from categoria.models import Categoria
from proveedor.models import Proveedor

class Producto(models.Model):
    """Modelo para productos"""
    ESTADOS = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('agotado', 'Agotado'),
        ('discontinuado', 'Discontinuado'),
    ]
    
    id_producto = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    precio = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    stock_actual = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    stock_minimo = models.IntegerField(default=5, validators=[MinValueValidator(0)])
    estado = models.CharField(max_length=20, choices=ESTADOS, default='activo')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    
    # Relaciones
    categoria = models.ForeignKey(
        Categoria, 
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='productos'
    )
    proveedor = models.ForeignKey(
        Proveedor, 
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='productos'
    )
    empresa = models.ForeignKey(
        Empresa, 
        on_delete=models.CASCADE,
        related_name='productos'
    )

    class Meta:
        db_table = "producto"
        ordering = ['nombre']
        verbose_name = "Producto"
        verbose_name_plural = "Productos"
        indexes = [
            models.Index(fields=['nombre', 'empresa']),
            models.Index(fields=['estado', 'empresa']),
            models.Index(fields=['categoria', 'empresa']),
        ]
        unique_together = ['nombre', 'empresa']

    def __str__(self):
        return self.nombre
    
    @property
    def necesita_reponer(self):
        """Indica si el producto necesita reposición"""
        return self.stock_actual <= self.stock_minimo
    
    @property
    def agotado(self):
        """Indica si el producto está agotado"""
        return self.stock_actual <= 0