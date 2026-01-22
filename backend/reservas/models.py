from django.db import models
from cliente.models import Cliente
from producto.models import Producto

class Reserva(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('confirmada', 'Confirmada'),
        ('cancelada', 'Cancelada'),
        ('expirada', 'Expirada'),
        ('completada', 'Completada'),
    ]
    
    id_cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    id_producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField()
    fecha_reserva = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=50, choices=ESTADOS, default='pendiente')
    fecha_expiracion = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = "reserva"
        unique_together = ('id_cliente', 'id_producto')
        ordering = ["-fecha_reserva"]