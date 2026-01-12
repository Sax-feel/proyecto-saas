from django.db import models
from usuarios.models import Usuario

# Create your models here.
class Cliente(models.Model):
    id_usuario =  models.OneToOneField(Usuario, on_delete=models.CASCADE, primary_key=True)
    nit = models.CharField(max_length=20, unique=True)
    nombre_cliente = models.CharField(max_length=100)
    direccion_cliente = models.CharField(max_length=200)
    telefono_cliente = models.CharField(max_length=15)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cliente"
        ordering = ['nombre_cliente']