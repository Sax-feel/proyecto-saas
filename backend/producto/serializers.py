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
    """Serializador para creación de producto - Versión simplificada"""
    
    class Meta:
        model = Producto
        fields = [
            'nombre', 'descripcion', 'precio', 'stock_actual',
            'stock_minimo', 'categoria', 'proveedor'
        ]
    
    def validate(self, data):
        """Validación general del producto"""
        # Validar que la categoría exista (si se proporciona)
        if 'categoria' in data and data['categoria']:
            try:
                categoria = data['categoria']
                # No validamos empresa aquí, solo existencia
            except Exception:
                raise serializers.ValidationError({
                    'categoria': 'Categoría no válida'
                })
        
        # Validar que el proveedor exista (si se proporciona)
        if 'proveedor' in data and data['proveedor']:
            try:
                proveedor = data['proveedor']
                # Solo validamos existencia del proveedor
            except Exception:
                raise serializers.ValidationError({
                    'proveedor': 'Proveedor no válido'
                })
        
        return data

class ProductoPublicSerializer(serializers.ModelSerializer):
    """Serializador para vista pública de productos - Versión simple"""
    categoria = serializers.CharField(source='categoria.nombre', read_only=True)
    proveedor = serializers.CharField(source='proveedor.nombre', read_only=True)
    empresa = serializers.CharField(source='empresa.nombre', read_only=True)
    
    class Meta:
        model = Producto
        fields = [
            'id_producto', 'nombre', 'descripcion', 'precio',
            'stock_actual', 'estado', 'categoria', 'proveedor',
            'empresa', 'fecha_creacion'
        ]
        read_only_fields = fields