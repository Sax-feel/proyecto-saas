from rest_framework import serializers
from .models import Proveedor
from empresas.models import Empresa

class ProveedorSerializer(serializers.ModelSerializer):
    """Serializador para Proveedor"""
    
    class Meta:
        model = Proveedor
        fields = [
            'id_proveedor', 'nombre', 'telefono', 'email', 
            'direccion', 'empresa', 'fecha_creacion'
        ]
        read_only_fields = ['id_proveedor', 'fecha_creacion']
    
    def validate_email(self, value):
        """Validar que el email sea único por empresa"""
        empresa_id = self.initial_data.get('empresa')
        if empresa_id and Proveedor.objects.filter(email=value, empresa_id=empresa_id).exists():
            raise serializers.ValidationError("Ya existe un proveedor con este email en la empresa")
        return value

class ProveedorCreateSerializer(serializers.Serializer):
    """Serializador para creación de proveedor público"""
    nombre = serializers.CharField(max_length=200, required=True)
    telefono = serializers.CharField(max_length=20, required=True)
    email = serializers.EmailField(required=True)
    direccion = serializers.CharField(max_length=255, required=True)
    empresa_nombre = serializers.CharField(max_length=100, required=True)
    
    def validate_empresa_nombre(self, value):
        """Validar que la empresa exista"""
        try:
            empresa = Empresa.objects.get(nombre=value, estado='activo')
            return empresa
        except Empresa.DoesNotExist:
            raise serializers.ValidationError(
                f"No se encontró una empresa activa con el nombre: {value}"
            )
    
    def create(self, validated_data):
        empresa = validated_data.pop('empresa_nombre')
        return Proveedor.objects.create(
            empresa=empresa,
            **validated_data
        )