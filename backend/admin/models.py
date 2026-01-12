from django.db import models
from usuarios.models import Usuario

# Register your models here!.
class Admin(models.Model):
    nombre_admin = models.CharField(max_length=100)
    telefono_admin = models.CharField(max_length=15)
    id_usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, primary_key=True)

    class Meta:
        db_table = "admin"
        ordering = ['nombre_admin']