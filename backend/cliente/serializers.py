from rest_framework import serializers
from .models import Cliente
from usuarios.models import User
from rest_framework import serializers
from .models import Cliente
from usuarios.models import User
from empresas.models import Empresa

class ClienteSerializer(serializers.ModelSerializer):
    """Serializador para el modelo Cliente"""
    
    class Meta:
        model = Cliente
        fields = ['nit', 'nombre_cliente', 'direccion_cliente', 'telefono_cliente']
        read_only_fields = ['id_usuario']


class RegistroClienteSerializer(serializers.Serializer):
    """Serializador para registro público de cliente con selección de empresa"""
    # Datos del usuario
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    
    # Datos del cliente
    nit = serializers.CharField(max_length=20, required=True)
    nombre_cliente = serializers.CharField(max_length=100, required=True)
    direccion_cliente = serializers.CharField(max_length=200, required=True)
    telefono_cliente = serializers.CharField(max_length=15, required=True)
    
    # Nombre de la empresa a la que se quiere registrar
    empresa_nombre = serializers.CharField(
        max_length=100, 
        required=True,
        help_text="Nombre de la empresa a la que quiere registrarse"
    )
    
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
    
    def validate_empresa_nombre(self, value):
        """Validar que la empresa exista y esté activa"""
        try:
            empresa = Empresa.objects.get(nombre__iexact=value, estado='activo')
            return empresa
        except Empresa.DoesNotExist:
            # Mostrar empresas disponibles
            empresas_disponibles = Empresa.objects.filter(
                estado='activo'
            ).values_list('nombre', flat=True)[:10]
            
            if empresas_disponibles:
                raise serializers.ValidationError(
                    f"Empresa '{value}' no encontrada o no está activa. "
                    f"Empresas disponibles: {', '.join(empresas_disponibles)}"
                )
            else:
                raise serializers.ValidationError(
                    f"Empresa '{value}' no encontrada. No hay empresas activas disponibles."
                )