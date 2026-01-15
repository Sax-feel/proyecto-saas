from django.db import models

class Plan(models.Model):

    id_plan = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    precio = models.FloatField()
    duracion_dias = models.IntegerField()
    limite_productos = models.IntegerField()
    limite_usuarios = models.IntegerField()
    descripcion = models.CharField(max_length=300)
    
    class Meta:
        db_table = "plan"
        ordering = ["id_plan"]
