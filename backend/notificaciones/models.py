# notificaciones/models.py
from django.db import models

class Notificacion(models.Model):
    TIPOS = [
        ('info', 'Información'),
        ('warning', 'Advertencia'),
        ('success', 'Éxito'),
        ('error', 'Error'),
        ('stock', 'Stock Bajo'),
        ('venta', 'Nueva Venta'),
        ('compra', 'Nueva Compra'),
        ('reserva', 'Reserva'),
    ]
    
    id_notificacion = models.AutoField(primary_key=True)
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField()
    tipo = models.CharField(max_length=50, choices=TIPOS, default='info')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = "notificacion"
        ordering = ["id_notificacion"]