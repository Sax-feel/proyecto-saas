# ventas/serializers.py
from rest_framework import serializers
from .models import Venta
from usuario_empresa.models import Usuario_Empresa
import logging

logger = logging.getLogger(__name__)

class VentaSerializer(serializers.ModelSerializer):
    """Serializador para el modelo Venta"""
    cliente_info = serializers.SerializerMethodField()
    vendedor_info = serializers.SerializerMethodField()
    empresa_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Venta
        fields = [
            'id_venta', 'usuario_empresa', 'cliente', 'fecha_venta',
            'precio_total', 'cliente_info', 'vendedor_info', 'empresa_info'
        ]
        read_only_fields = ['id_venta', 'fecha_venta']
    
    def get_cliente_info(self, obj):
        """Obtiene información del cliente"""
        try:
            return {
                'id': obj.cliente.id_usuario.id_usuario,
                'nombre': obj.cliente.nombre_cliente,
                'email': obj.cliente.id_usuario.email,
                'nit': obj.cliente.nit
            }
        except Exception:
            return None
    
    def get_vendedor_info(self, obj):
        """Obtiene información del vendedor"""
        try:
            return {
                'id': obj.usuario_empresa.id_usuario.id_usuario,
                'email': obj.usuario_empresa.id_usuario.email
            }
        except Exception:
            return None
    
    def get_empresa_info(self, obj):
        """Obtiene información de la empresa"""
        try:
            return {
                'id': obj.usuario_empresa.empresa.id_empresa,
                'nombre': obj.usuario_empresa.empresa.nombre
            }
        except Exception:
            return None


class DetalleVentaSerializer(serializers.Serializer):
    """Serializador para detalle de venta"""
    id_producto = serializers.IntegerField(required=True)
    cantidad = serializers.IntegerField(required=True, min_value=1)
    precio_unitario = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        min_value=0.01
    )


class RealizarCompraSerializer(serializers.Serializer):
    """Serializador para realizar una compra"""
    detalles = DetalleVentaSerializer(many=True, required=True)
    
    def validate(self, data):
        user = self.context['request'].user
        
        # Verificar que el usuario sea cliente
        if not hasattr(user, 'rol') or user.rol.rol != 'cliente':
            raise serializers.ValidationError("Solo clientes pueden realizar compras")
        
        # Verificar que el cliente exista
        try:
            from cliente.models import Cliente
            cliente = Cliente.objects.get(id_usuario=user)
        except Cliente.DoesNotExist:
            raise serializers.ValidationError("Cliente no encontrado")
        
        # Validar cada detalle de compra
        productos_info = []
        precio_total = 0
        
        for detalle in data['detalles']:
            # Verificar producto
            try:
                from producto.models import Producto
                producto = Producto.objects.get(
                    id_producto=detalle['id_producto'],
                    estado='activo'
                )
            except Producto.DoesNotExist:
                raise serializers.ValidationError(
                    f"Producto con ID {detalle['id_producto']} no disponible"
                )
            
            # Verificar stock
            if producto.stock_actual < detalle['cantidad']:
                raise serializers.ValidationError(
                    f"Stock insuficiente para {producto.nombre}. "
                    f"Disponible: {producto.stock_actual}, Solicitado: {detalle['cantidad']}"
                )
            
            # Calcular subtotal
            subtotal = detalle['cantidad'] * detalle['precio_unitario']
            precio_total += subtotal
            
            # Guardar información del producto
            productos_info.append({
                'producto': producto,
                'cantidad': detalle['cantidad'],
                'precio_unitario': detalle['precio_unitario'],
                'subtotal': subtotal
            })
        
        # Verificar si hay reservas pendientes para estos productos
        reservas_pendientes = []
        for info in productos_info:
            reserva = self._verificar_reserva(cliente, info['producto'], info['cantidad'])
            if reserva:
                reservas_pendientes.append(reserva)
        
        # Agregar datos al contexto
        data['cliente'] = cliente
        data['productos_info'] = productos_info
        data['precio_total'] = precio_total
        data['reservas_pendientes'] = reservas_pendientes
        
        return data
    
    def _verificar_reserva(self, cliente, producto, cantidad):
        """Verifica si existe una reserva pendiente para este cliente y producto"""
        try:
            from reservas.models import Reserva
            reserva = Reserva.objects.get(
                id_cliente=cliente,
                id_producto=producto,
                estado='pendiente'
            )
            
            # Verificar que la cantidad coincida
            if reserva.cantidad != cantidad:
                raise serializers.ValidationError(
                    f"La cantidad solicitada para {producto.nombre} no coincide con tu reserva. "
                    f"Reservado: {reserva.cantidad}, Solicitado: {cantidad}"
                )
            
            return reserva
        except Reserva.DoesNotExist:
            return None