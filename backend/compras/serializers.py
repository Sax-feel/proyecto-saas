from rest_framework import serializers
from .models import Compra
from detalle_compra.models import DetalleCompra
from producto.models import Producto
from proveedor.models import Proveedor  # Importar Proveedor
import logging

logger = logging.getLogger(__name__)

class DetalleCompraSerializer(serializers.Serializer):
    """Serializador para detalle de compra"""
    id_producto = serializers.IntegerField(required=True)
    cantidad = serializers.IntegerField(required=True, min_value=1)
    precio_unitario = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        min_value=0.01
    )
    id_proveedor = serializers.IntegerField(required=True)  # Nuevo campo


class CompraSerializer(serializers.ModelSerializer):
    """Serializador para el modelo Compra"""
    vendedor_info = serializers.SerializerMethodField()
    empresa_info = serializers.SerializerMethodField()
    detalles_compra = serializers.SerializerMethodField()
    
    class Meta:
        model = Compra
        fields = [
            'id_compra', 'usuario_empresa', 'fecha', 'precio_total',
            'vendedor_info', 'empresa_info', 'detalles_compra'
        ]
        read_only_fields = ['id_compra', 'fecha']
    
    def get_vendedor_info(self, obj):
        """Obtiene información del vendedor"""
        try:
            return {
                'id': obj.usuario_empresa.id_usuario.id_usuario,
                'email': obj.usuario_empresa.id_usuario.email,
            }
        except Exception:
            return None
    
    def get_empresa_info(self, obj):
        """Obtiene información de la empresa"""
        try:
            empresa = obj.usuario_empresa.empresa
            return {
                'id': empresa.id_empresa,
                'nombre': empresa.nombre,
                'nit': empresa.nit
            }
        except Exception:
            return None
    
    def get_detalles_compra(self, obj):
        """Obtiene detalles de la compra con información del proveedor"""
        try:
            detalles = DetalleCompra.objects.filter(id_compra=obj).select_related('id_producto', 'id_proveedor')
            return [
                {
                    'id_producto': detalle.id_producto.id_producto,
                    'producto_nombre': detalle.id_producto.nombre,
                    'cantidad': detalle.cantidad,
                    'precio_unitario': float(detalle.precio_unitario),
                    'subtotal': float(detalle.subtotal),
                    'proveedor_info': {
                        'id': detalle.id_proveedor.id_proveedor,
                        'nombre': detalle.id_proveedor.nombre,
                        'telefono': detalle.id_proveedor.telefono,
                        'email': detalle.id_proveedor.email
                    }
                }
                for detalle in detalles
            ]
        except Exception as e:
            logger.error(f"Error obteniendo detalles de compra: {str(e)}")
            return []


class RealizarCompraStockSerializer(serializers.Serializer):
    """Serializador para realizar compra de nuevo stock"""
    detalles = DetalleCompraSerializer(many=True, required=True)
    
    def validate(self, data):
        request = self.context['request']
        user = request.user
        
        # Verificar que el usuario sea vendedor O admin_empresa
        if not hasattr(user, 'rol') or user.rol.rol not in ['vendedor', 'admin_empresa']:
            raise serializers.ValidationError("Solo vendedores y administradores de empresa pueden realizar compras de stock")
        
        # Verificar que el usuario tenga empresa asignada
        try:
            from usuario_empresa.models import Usuario_Empresa
            usuario_empresa = Usuario_Empresa.objects.get(id_usuario=user)
            empresa = usuario_empresa.empresa
        except Usuario_Empresa.DoesNotExist:
            raise serializers.ValidationError("El usuario no tiene empresa asignada")
        
        # Validar cada detalle de compra
        productos_info = []
        precio_total = 0
        
        for detalle in data['detalles']:
            # Verificar producto
            try:
                producto = Producto.objects.get(
                    id_producto=detalle['id_producto'],
                    empresa=empresa  # Solo productos de la misma empresa
                )
            except Producto.DoesNotExist:
                raise serializers.ValidationError(
                    f"Producto con ID {detalle['id_producto']} no encontrado o no pertenece a tu empresa"
                )
            
            # Verificar proveedor
            try:
                proveedor = Proveedor.objects.get(
                    id_proveedor=detalle['id_proveedor']
                )
            except Proveedor.DoesNotExist:
                raise serializers.ValidationError(
                    f"Proveedor con ID {detalle['id_proveedor']} no encontrado"
                )
            
            # Validar que la cantidad sea positiva
            if detalle['cantidad'] <= 0:
                raise serializers.ValidationError(
                    f"La cantidad para {producto.nombre} debe ser mayor a 0"
                )
            
            # Validar que el precio sea positivo
            if detalle['precio_unitario'] <= 0:
                raise serializers.ValidationError(
                    f"El precio unitario para {producto.nombre} debe ser mayor a 0"
                )
            
            # Calcular subtotal
            subtotal = detalle['cantidad'] * detalle['precio_unitario']
            precio_total += subtotal
            
            # Guardar información del producto y proveedor
            productos_info.append({
                'producto': producto,
                'proveedor': proveedor,  # Guardar objeto proveedor
                'cantidad': detalle['cantidad'],
                'precio_unitario': detalle['precio_unitario'],
                'subtotal': subtotal
            })
        
        # Agregar datos al contexto
        data['usuario_empresa'] = usuario_empresa
        data['productos_info'] = productos_info
        data['precio_total'] = precio_total
        
        return data