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
    cliente_info = serializers.SerializerMethodField()
    tiempo_restante = serializers.SerializerMethodField()
    
    class Meta:
        model = Reserva
        fields = [
            'id_cliente', 'id_producto', 'cantidad', 
            'fecha_reserva', 'estado', 'fecha_expiracion',
            'producto_info', 'cliente_info', 'tiempo_restante'
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
    
    def get_cliente_info(self, obj):
        """Obtiene información del cliente"""
        try:
            from cliente.serializers import ClienteSerializer
            return {
                'id': obj.id_cliente.id_usuario.id_usuario,
                'nombre': obj.id_cliente.nombre_cliente,
                'email': obj.id_cliente.id_usuario.email
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
        
        # 1. Verificar que el usuario sea cliente
        if not hasattr(user, 'rol') or user.rol.rol != 'cliente':
            raise serializers.ValidationError("Solo clientes pueden realizar reservas")
        
        # 2. Verificar que el cliente exista
        try:
            from cliente.models import Cliente
            cliente = Cliente.objects.get(id_usuario=user)
        except Cliente.DoesNotExist:
            raise serializers.ValidationError("Cliente no encontrado")
        
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
        
        # 5. Verificar si ya existe una reserva activa para este cliente-producto
        reserva_existente = Reserva.objects.filter(
            id_cliente=cliente,
            id_producto=producto,
            estado__in=['pendiente', 'confirmada']
        ).exists()
        
        if reserva_existente:
            raise serializers.ValidationError("Ya tienes una reserva activa para este producto")
        
        # 6. Calcular fecha de expiración (72 horas)
        fecha_expiracion = datetime.now() + timedelta(hours=72)
        
        # Agregar datos al contexto para la vista
        data['cliente'] = cliente
        data['producto'] = producto
        data['fecha_expiracion'] = fecha_expiracion
        
        return data


class CancelarReservaSerializer(serializers.Serializer):
    """Serializador para cancelar una reserva"""
    id_producto = serializers.IntegerField(required=True)
    
    def validate(self, data):
        user = self.context['request'].user
        
        # Verificar que el usuario sea cliente
        if not hasattr(user, 'rol') or user.rol.rol != 'cliente':
            raise serializers.ValidationError("Solo clientes pueden cancelar reservas")
        
        # Verificar que el cliente exista
        try:
            from cliente.models import Cliente
            cliente = Cliente.objects.get(id_usuario=user)
        except Cliente.DoesNotExist:
            raise serializers.ValidationError("Cliente no encontrado")
        
        # Verificar que la reserva exista y esté pendiente
        try:
            reserva = Reserva.objects.get(
                id_cliente=cliente,
                id_producto_id=data['id_producto'],
                estado='pendiente'
            )
        except Reserva.DoesNotExist:
            raise serializers.ValidationError("Reserva no encontrada o no está pendiente")
        
        data['reserva'] = reserva
        return data