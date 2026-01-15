from django.db import models
from django.utils import timezone  # Añade esta importación
from planes.models import Plan
from empresas.models import Empresa
from usuarios.models import User

class Suscripcion(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('vencido', 'Vencido'),
        ('rechazado', 'Rechazado'),
    ]

    id_suscripcion = models.AutoField(primary_key=True)
    plan_id = models.ForeignKey(Plan, on_delete=models.CASCADE, db_column='plan_id')
    empresa_id = models.ForeignKey(Empresa, on_delete=models.CASCADE, db_column='empresa_id')
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_fin = models.DateTimeField()
    estado = models.CharField(max_length=50, choices=ESTADOS, default='pendiente')
    comprobante_pago = models.FileField(
        upload_to='comprobantes/pagos/%Y/%m/%d/', 
        null=True, 
        blank=True,
        help_text="Comprobante de pago en formato PDF"
    )
    fecha_aprobacion = models.DateTimeField(null=True, blank=True)
    admin_aprobador = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='suscripciones_aprobadas',
        help_text="Admin que aprobó la suscripción"
    )
    observaciones = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = "suscripcion"
        ordering = ["-fecha_solicitud"]
        verbose_name = "Suscripción"
        verbose_name_plural = "Suscripciones"
    
    def __str__(self):
        return f"Suscripción {self.id_suscripcion} - {self.empresa.nombre} ({self.estado})"
    