# reservas/serializers.py
from rest_framework import serializers
from .models import Reserva
from producto.models import Producto
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class ReservaSerializer(serializers.ModelSerializer):
    """Serializador para el modelo Reserva"""
    producto_info = serializers.SerializerMethodField()
    usuario_info = serializers.SerializerMethodField()  # Cambiado
    tiempo_restante = serializers.SerializerMethodField()
    
    class Meta:
        model = Reserva
        fields = [
            'id_usuario', 'id_producto', 'cantidad', 
            'fecha_reserva', 'estado', 'fecha_expiracion',
            'producto_info', 'usuario_info', 'tiempo_restante'  # Cambiado
        ]
        read_only_fields = ['fecha_reserva', 'estado', 'fecha_expiracion']
    
    def get_producto_info(self, obj):
        """Obtiene información del producto reservado"""
        try:
            from producto.serializers import ProductoSerializer
            return {
                'id': obj.id_producto.id_producto,
                'nombre': obj.id_producto.nombre,
                'precio': float(obj.id_producto.precio),
                'empresa': obj.id_producto.empresa.nombre
            }
        except Exception:
            return None
    
    def get_usuario_info(self, obj):  # Cambiado
        """Obtiene información del usuario (vendedor/admin_empresa)"""
        try:
            from usuario_empresa.serializers import UsuarioEmpresaSerializer
            return {
                'id': obj.id_usuario.id_usuario.id_usuario,
                'email': obj.id_usuario.id_usuario.email,
                'empresa': obj.id_usuario.empresa.nombre,
                'rol': obj.id_usuario.id_usuario.rol.rol
            }
        except Exception:
            return None
    
    def get_tiempo_restante(self, obj):
        """Calcula el tiempo restante para la reserva"""
        if not obj.fecha_expiracion:
            return None
        
        ahora = datetime.now(obj.fecha_expiracion.tzinfo)
        if ahora >= obj.fecha_expiracion:
            return 'Expirado'
        
        diferencia = obj.fecha_expiracion - ahora
        horas = diferencia.seconds // 3600
        minutos = (diferencia.seconds % 3600) // 60
        
        return f"{horas}h {minutos}m"


class CrearReservaSerializer(serializers.Serializer):
    """Serializador para crear una reserva"""
    id_producto = serializers.IntegerField(required=True)
    cantidad = serializers.IntegerField(
        required=True, 
        min_value=1,
        help_text="Cantidad del producto a reservar"
    )
    
    def validate(self, data):
        """Valida que la reserva sea posible"""
        user = self.context['request'].user
        
        # 1. Verificar que el usuario sea vendedor o admin_empresa
        if not hasattr(user, 'rol') or user.rol.rol not in ['vendedor', 'admin_empresa']:  # Cambiado
            raise serializers.ValidationError("Solo vendedores y administradores de empresa pueden realizar reservas")  # Cambiado
        
        # 2. Verificar que el usuario_empresa exista
        try:
            from usuario_empresa.models import Usuario_Empresa
            usuario_empresa = Usuario_Empresa.objects.get(id_usuario=user)  # Cambiado
        except Usuario_Empresa.DoesNotExist:
            raise serializers.ValidationError("Usuario de empresa no encontrado")  # Cambiado
        
        # 3. Verificar que el producto exista
        try:
            from producto.models import Producto
            producto = Producto.objects.get(
                id_producto=data['id_producto'],
                estado='activo'
            )
        except Producto.DoesNotExist:
            raise serializers.ValidationError("Producto no disponible para reserva")
        
        # 4. Verificar stock suficiente
        if producto.stock_actual < data['cantidad']:
            raise serializers.ValidationError(
                f"Stock insuficiente. Disponible: {producto.stock_actual}"
            )
        
        # 5. Verificar si ya existe una reserva activa para este usuario-producto
        reserva_existente = Reserva.objects.filter(
            id_usuario=usuario_empresa,  # Cambiado
            id_producto=producto,
            estado__in=['pendiente']
        ).exists()
        
        if reserva_existente:
            raise serializers.ValidationError("Ya tienes una reserva activa para este producto")
        
        # 6. Calcular fecha de expiración (72 horas)
        fecha_expiracion = datetime.now() + timedelta(hours=72)
        
        # Agregar datos al contexto para la vista
        data['usuario_empresa'] = usuario_empresa  # Cambiado
        data['producto'] = producto
        data['fecha_expiracion'] = fecha_expiracion
        
        return data


class CancelarReservaSerializer(serializers.Serializer):
    """Serializador para cancelar una reserva"""
    id_producto = serializers.IntegerField(required=True)
    
    def validate(self, data):
        user = self.context['request'].user
        
        # Verificar que el usuario sea vendedor o admin_empresa
        if not hasattr(user, 'rol') or user.rol.rol not in ['vendedor', 'admin_empresa']:  # Cambiado
            raise serializers.ValidationError("Solo vendedores y administradores de empresa pueden cancelar reservas")  # Cambiado
        
        # Verificar que el usuario_empresa exista
        try:
            from usuario_empresa.models import Usuario_Empresa
            usuario_empresa = Usuario_Empresa.objects.get(id_usuario=user)  # Cambiado
        except Usuario_Empresa.DoesNotExist:
            raise serializers.ValidationError("Usuario de empresa no encontrado")  # Cambiado
        
        # Verificar que la reserva exista y esté pendiente
        try:
            reserva = Reserva.objects.get(
                id_usuario=usuario_empresa,  # Cambiado
                id_producto_id=data['id_producto'],
                estado='pendiente'
            )
        except Reserva.DoesNotExist:
            raise serializers.ValidationError("Reserva no encontrada o no está pendiente")
        
        data['reserva'] = reserva
        return data