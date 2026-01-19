from django.db import models
from producto.models import Producto

class Archivo(models.Model):
    """Modelo para archivos asociados a productos (imágenes, documentos, etc.)"""
    id_archivo = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=255, blank=True, null=True)
    archivo = models.FileField(
        upload_to='productos/archivos/%Y/%m/%d/',
        verbose_name="Archivo"
    )
    tipo_archivo = models.CharField(max_length=50, blank=True, null=True)
    orden = models.IntegerField(default=0, help_text="Orden de visualización")
    descripcion = models.TextField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    # Relación con producto
    producto = models.ForeignKey(
        Producto, 
        on_delete=models.CASCADE,
        related_name='archivos'
    )

    class Meta:
        db_table = "archivo"
        ordering = ['orden', 'fecha_creacion']
        verbose_name = "Archivo"
        verbose_name_plural = "Archivos"
        indexes = [
            models.Index(fields=['producto', 'orden']),
        ]

    def __str__(self):
        return f"Archivo {self.id_archivo} - {self.producto.nombre}"
    
    def save(self, *args, **kwargs):
        # Auto-detecta el tipo de archivo
        if self.archivo and not self.tipo_archivo:
            extension = self.archivo.name.split('.')[-1].lower()
            if extension in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']:
                self.tipo_archivo = 'imagen'
            elif extension in ['pdf']:
                self.tipo_archivo = 'documento'
            elif extension in ['doc', 'docx']:
                self.tipo_archivo = 'word'
            elif extension in ['xls', 'xlsx']:
                self.tipo_archivo = 'excel'
            else:
                self.tipo_archivo = 'otro'
        
        # Asigna nombre si no tiene
        if not self.nombre and self.archivo:
            self.nombre = self.archivo.name
        
        super().save(*args, **kwargs)