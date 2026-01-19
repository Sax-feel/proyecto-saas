from rest_framework import serializers
from .models import Proveedor

class ProveedorSerializer(serializers.ModelSerializer):
    """Serializador para Proveedor"""
    
    class Meta:
        model = Proveedor
        fields = [
            'id_proveedor', 'nombre', 'telefono', 'email', 
            'direccion', 'fecha_creacion'
        ]
        read_only_fields = ['id_proveedor', 'fecha_creacion']
    
    def validate_email(self, value):
        """Validar que el email sea único"""
        if Proveedor.objects.filter(email=value).exists():
            raise serializers.ValidationError("Ya existe un proveedor con este email")
        return value

class ProveedorCreateSerializer(serializers.ModelSerializer):
    """Serializador para creación de proveedor público"""
    
    class Meta:
        model = Proveedor
        fields = ['nombre', 'telefono', 'email', 'direccion']
    
    def validate_email(self, value):
        """Validar que el email sea único"""
        if Proveedor.objects.filter(email=value).exists():
            raise serializers.ValidationError("Ya existe un proveedor con este email")
        return value