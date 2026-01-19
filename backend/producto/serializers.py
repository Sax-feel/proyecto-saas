from rest_framework import serializers
from django.core.validators import MinValueValidator
from .models import Producto

class ProductoSerializer(serializers.ModelSerializer):
    """Serializador para Producto"""
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    empresa_nombre = serializers.CharField(source='empresa.nombre', read_only=True)
    
    class Meta:
        model = Producto
        fields = [
            'id_producto', 'nombre', 'descripcion', 'precio', 
            'stock_actual', 'stock_minimo', 'estado', 'fecha_creacion',
            'categoria', 'categoria_nombre', 'proveedor', 'proveedor_nombre',
            'empresa', 'empresa_nombre', 'necesita_reponer', 'agotado'
        ]
        read_only_fields = [
            'id_producto', 'fecha_creacion', 'necesita_reponer', 
            'agotado', 'empresa', 'empresa_nombre'
        ]
    
    def validate_precio(self, value):
        if value <= 0:
            raise serializers.ValidationError("El precio debe ser mayor a 0")
        return value
    
    def validate_stock_actual(self, value):
        if value < 0:
            raise serializers.ValidationError("El stock no puede ser negativo")
        return value
    
    def validate_stock_minimo(self, value):
        if value < 0:
            raise serializers.ValidationError("El stock mínimo no puede ser negativo")
        return value

class ProductoCreateSerializer(serializers.ModelSerializer):
    """Serializador para creación de producto"""
    
    class Meta:
        model = Producto
        fields = [
            'nombre', 'descripcion', 'precio', 'stock_actual',
            'stock_minimo', 'categoria', 'proveedor'
        ]
    
    def validate_categoria(self, value):
        """Validar que la categoría pertenezca a la misma empresa"""
        empresa = self.context['request'].user.usuario_empresa.empresa
        if value and value.empresa != empresa:
            raise serializers.ValidationError("La categoría no pertenece a su empresa")
        return value
    
    def validate_proveedor(self, value):
        """Validar que el proveedor pertenezca a la misma empresa"""
        empresa = self.context['request'].user.usuario_empresa.empresa
        if value and value.empresa != empresa:
            raise serializers.ValidationError("El proveedor no pertenece a su empresa")
        return value

class ProductoPublicSerializer(serializers.ModelSerializer):
    """Serializador para vista pública de productos"""
    categoria = serializers.CharField(source='categoria.nombre', read_only=True)
    proveedor = serializers.CharField(source='proveedor.nombre', read_only=True)
    
    class Meta:
        model = Producto
        fields = [
            'id_producto', 'nombre', 'descripcion', 'precio',
            'stock_actual', 'estado', 'categoria', 'proveedor',
            'fecha_creacion'
        ]
        read_only_fields = fields