# notifica/models.py
from django.db import models
from usuarios.models import User
from notificaciones.models import Notificacion

class Notifica(models.Model):
    id_usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    id_notificacion = models.ForeignKey(Notificacion, on_delete=models.CASCADE)
    leido = models.BooleanField(default=False)
    fecha_leido = models.DateTimeField(null=True, blank=True)
    eliminado = models.BooleanField(default=False)
    
    class Meta:
        db_table = "notifica"
        unique_together = ('id_usuario', 'id_notificacion')