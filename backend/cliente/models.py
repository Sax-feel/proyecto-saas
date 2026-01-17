from django.db import models
from usuarios.models import User
import json

class Cliente(models.Model):
    id_usuario =  models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)
    nit = models.CharField(max_length=20, unique=True)
    nombre_cliente = models.CharField(max_length=100)
    direccion_cliente = models.CharField(max_length=200)
    telefono_cliente = models.CharField(max_length=15)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cliente"
        ordering = ['nombre_cliente']

# cliente/models.py (actualiza la clase AuditoriaCliente)
class AuditoriaCliente(models.Model):
    ACCIONES = [
        ('CREADO', 'Creado'),
        ('ACTUALIZADO', 'Actualizado'),
        ('ELIMINADO', 'Eliminado'),
    ]
    
    # Solo guardamos IDs y datos, NO ForeignKey
    cliente_id = models.IntegerField(null=True, blank=True, db_index=True)
    cliente_nombre = models.CharField(max_length=100, null=True, blank=True)
    cliente_nit = models.CharField(max_length=20, null=True, blank=True)
    cliente_email = models.EmailField(null=True, blank=True)
    
    # Información de la auditoría
    accion = models.CharField(max_length=20, choices=ACCIONES)
    detalles = models.JSONField(default=dict, blank=True)
    usuario = models.ForeignKey(
        'usuarios.User',
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name='Usuario que realizó la acción'
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = "auditoria_cliente"
        ordering = ['-fecha']
        verbose_name = "Auditoría de Cliente"
        verbose_name_plural = "Auditorías de Clientes"
        indexes = [
            models.Index(fields=['cliente_id', 'fecha']),
            models.Index(fields=['accion', 'fecha']),
            models.Index(fields=['usuario', 'fecha']),
        ]
    
    def __str__(self):
        nombre = self.cliente_nombre or 'Cliente eliminado'
        return f"Auditoría {self.accion} - {nombre} - {self.fecha.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def cliente_info(self):
        """Devuelve información del cliente de manera segura"""
        if not self.cliente_id:
            return None
        
        info = {
            'id': self.cliente_id,
            'nombre': self.cliente_nombre,
            'nit': self.cliente_nit,
            'email': self.cliente_email,
            'activo': False  # Por defecto asumimos inactivo
        }
        
        # Intentar obtener el cliente si existe
        try:
            cliente = Cliente.objects.get(id_usuario_id=self.cliente_id)
            info.update({
                'nombre': cliente.nombre_cliente,
                'nit': cliente.nit,
                'activo': True
            })
        except Cliente.DoesNotExist:
            # El cliente fue eliminado, usamos los datos almacenados
            pass
        
        return info