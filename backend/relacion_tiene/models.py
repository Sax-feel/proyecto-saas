# relacion_tiene/models.py
from django.db import models
from cliente.models import Cliente
from empresas.models import Empresa

class Tiene(models.Model):
    ESTADOS = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('pendiente', 'Pendiente'),
        ('bloqueado', 'Bloqueado'),
    ]
    id_cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    id_empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=50, choices=ESTADOS, default='activo')
    
    class Meta:
        db_table = "tiene"
        ordering = ["fecha_registro"]
        unique_together = ('id_cliente', 'id_empresa')  # Clave primaria compuesta
    
    def __str__(self):
        return f"{self.id_cliente.nombre_cliente} - {self.id_empresa.nombre}"