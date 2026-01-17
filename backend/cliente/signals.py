# cliente/signals.py
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Cliente, AuditoriaCliente
import json

@receiver(post_save, sender=Cliente)
def auditar_creacion_actualizacion_cliente(sender, instance, created, **kwargs):
    """
    Audita creación y actualización de clientes
    """
    accion = 'CREADO' if created else 'ACTUALIZADO'
    
    # Obtener el usuario que realizó la acción (si está disponible en el request)
    usuario = None
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Intentar obtener el usuario del contexto (si hay request en el thread)
        import threading
        thread_local = threading.local()
        if hasattr(thread_local, 'request') and thread_local.request.user.is_authenticated:
            usuario = thread_local.request.user
    except:
        pass
    
    # Crear registro de auditoría
    AuditoriaCliente.objects.create(
        cliente=instance,
        accion=accion,
        detalles={
            'nit': instance.nit,
            'nombre': instance.nombre_cliente,
            'direccion': instance.direccion_cliente,
            'telefono': instance.telefono_cliente,
            'usuario_original': str(instance.id_usuario) if instance.id_usuario else None
        },
        usuario=usuario,
        ip_address=getattr(thread_local, 'ip_address', None) if hasattr(thread_local, 'ip_address') else None
    )

@receiver(pre_save, sender=Cliente)
def auditar_cambios_cliente(sender, instance, **kwargs):
    """
    Detecta cambios específicos en los campos del cliente
    """
    if instance.pk:
        try:
            old_instance = Cliente.objects.get(pk=instance.pk)
            cambios = {}
            
            # Comparar campos
            campos = ['nit', 'nombre_cliente', 'direccion_cliente', 'telefono_cliente']
            for campo in campos:
                old_value = getattr(old_instance, campo)
                new_value = getattr(instance, campo)
                
                if old_value != new_value:
                    cambios[campo] = {
                        'anterior': old_value,
                        'nuevo': new_value
                    }
            
            # Si hay cambios, guardarlos en el thread local para usarlos en post_save
            if cambios:
                import threading
                thread_local = threading.local()
                thread_local.cambios_cliente = cambios
        except Cliente.DoesNotExist:
            pass

@receiver(post_delete, sender=Cliente)
def auditar_eliminacion_cliente(sender, instance, **kwargs):
    """
    Audita eliminación de clientes
    """
    usuario = None
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        import threading
        thread_local = threading.local()
        if hasattr(thread_local, 'request') and thread_local.request.user.is_authenticated:
            usuario = thread_local.request.user
    except:
        pass
    
    AuditoriaCliente.objects.create(
        cliente_id=instance.id_usuario_id,  # Guardar solo la referencia
        cliente_nombre=instance.nombre_cliente,  # Guardar nombre para referencia
        accion='ELIMINADO',
        detalles={
            'nit': instance.nit,
            'nombre': instance.nombre_cliente,
            'direccion': instance.direccion_cliente,
            'telefono': instance.telefono_cliente,
            'fecha_registro': instance.fecha_registro.isoformat() if instance.fecha_registro else None
        },
        usuario=usuario,
        ip_address=getattr(thread_local, 'ip_address', None) if hasattr(thread_local, 'ip_address') else None
    )