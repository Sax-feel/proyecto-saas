from django.db import models
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
    plan = models.ForeignKey(Plan, on_delete=models.CASCADE)
    admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
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
    observaciones = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = "suscripcion"
        ordering = ["-fecha_solicitud"]
        verbose_name = "Suscripción"
        verbose_name_plural = "Suscripciones"
    
    def __str__(self):
        return f"Suscripción {self.id_suscripcion} - {self.empresa.nombre} ({self.estado})"


    # En tu archivo suscripciones/models.py, dentro de la clase Suscripcion:
    def activar_suscripcion(self, admin_aprobador=None):
        """
        Activa esta suscripción y desactiva otras de la misma empresa
        """
        from django.utils import timezone
        
        # 1. Verificar que no esté ya activa
        if self.estado == 'activo':
            return {
                'success': False,
                'message': f'La suscripción #{self.id_suscripcion} ya está activa'
            }
        
        # 2. Verificar que no esté vencida o rechazada
        if self.estado in ['vencido', 'rechazado']:
            return {
                'success': False,
                'message': f'No se puede activar una suscripción {self.estado}'
            }
        
        # 3. Obtener todas las suscripciones de la misma empresa
        suscripciones_empresa = Suscripcion.objects.filter(
            empresa=self.empresa
        ).exclude(id_suscripcion=self.id_suscripcion)
        
        # 4. Desactivar suscripciones más antiguas
        suscripciones_desactivadas = []
        for suscripcion in suscripciones_empresa:
            if suscripcion.estado == 'activo' or suscripcion.estado == 'pendiente':
                estado_anterior = suscripcion.estado
                suscripcion.estado = 'inactivo'
                suscripcion.save()
                suscripciones_desactivadas.append({
                    'id': suscripcion.id_suscripcion,
                    'estado_anterior': estado_anterior,
                    'estado_nuevo': 'inactivo'
                })
        
        # 5. Activar esta suscripción
        estado_anterior = self.estado
        self.estado = 'activo'
        self.fecha_aprobacion = timezone.now()
        self.admin = admin_aprobador
        self.save()
        
        # 6. Actualizar estado de la empresa a 'activo'
        if self.empresa.estado == 'pendiente':
            self.empresa.estado = 'activo'
            self.empresa.save()
        
        return {
            'success': True,
            'message': f'Suscripción #{self.id_suscripcion} activada exitosamente',
            'suscripcion': {
                'id': self.id_suscripcion,
                'estado_anterior': estado_anterior,
                'estado_nuevo': 'activo',
                'plan': self.plan.nombre,
                'empresa': self.empresa.nombre,
                'fecha_aprobacion': self.fecha_aprobacion.strftime('%Y-%m-%d %H:%M:%S'),
                'admin_aprobador': admin_aprobador.email if admin_aprobador else None
            },
            'suscripciones_desactivadas': suscripciones_desactivadas,
            'total_desactivadas': len(suscripciones_desactivadas)
        }