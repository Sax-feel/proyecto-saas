from django.db import models
from planes.models import Plan
from empresas.models import Empresa

class Suscripcion(models.Model):

    ESTADOS = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('pendiente', 'Pendiente'),
        ('bloqueado', 'Bloqueado'),
    ]

    id_suscripcion = models.AutoField(primary_key=True)
    plan_id = models.ForeignKey(Plan, on_delete=models.CASCADE, db_column='id_plan')
    empresa_id = models.ForeignKey(Empresa, on_delete=models.CASCADE, db_column='id_empresa')
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_fin = models.DateTimeField()
    estado = models.CharField(max_length=50, choices=ESTADOS, default='inactivo')

    class Meta:
        db_table = "suscripcion"
        ordering = ["id_suscripcion"]