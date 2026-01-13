from rest_framework import serializers
from .models import Cliente
from usuarios.models import User
from usuarios.serializers import RegistroUsuarioSerializer

class ClienteSerializer(serializers.ModelSerializer):
    """Serializador para el modelo Cliente"""
    
    class Meta:
        model = Cliente
        fields = ['nit', 'nombre_cliente', 'direccion_cliente', 'telefono_cliente']
        read_only_fields = ['id_usuario']


class RegistroClienteSerializer(serializers.Serializer):
    """Serializador para registro completo de cliente (usuario + datos cliente)"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    
    nit = serializers.CharField(max_length=20, required=True)
    nombre_cliente = serializers.CharField(max_length=100, required=True)
    direccion_cliente = serializers.CharField(max_length=200, required=True)
    telefono_cliente = serializers.CharField(max_length=15, required=True)
    
    def validate_email(self, value):
        """Validar que el email no esté registrado"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este email ya está registrado")
        return value
    
    def validate_nit(self, value):
        """Validar que el NIT no esté registrado"""
        if Cliente.objects.filter(nit=value).exists():
            raise serializers.ValidationError("Este NIT ya está registrado")
        return value