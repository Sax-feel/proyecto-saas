from django.db import models

class Suscripcion(models.Model):

    ESTADOS = {
        "ACTIVO": "activo",
        "INACTIVO": "inactivo",
        "PENDIENTE": "pendiente",
        "BLOQUEADO": "bloqueado"
    }

    id_suscripcion = models.AutoField(primary_key=True)
    plan_id = models.ForeignKey('planes.Plan', on_delete=models.CASCADE, db_column='id_plan')
    empresa_id = models.ForeignKey('empresas.Empresa', on_delete=models.CASCADE, db_column='id_empresa')
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_fin = models.DateTimeField()
    estado = models.CharField(max_length=50, choices=ESTADOS, default=ESTADOS["INACTIVO"])

    class Meta:
        db_table = "suscripcion"
        ordering = ["id_suscripcion"]