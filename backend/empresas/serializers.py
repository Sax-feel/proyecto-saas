# empresas/serializers.py
from rest_framework import serializers
from .models import Empresa
from admins.models import Admin

class EmpresaSerializer(serializers.ModelSerializer):
    """Serializador para el modelo Empresa"""
    
    class Meta:
        model = Empresa
        fields = [
            'id_empresa', 'nombre', 'nit', 'direccion', 
            'telefono', 'email', 'estado', 'fecha_creacion'
        ]
        read_only_fields = ['id_empresa', 'fecha_creacion', 'admin_id']


class RegistroEmpresaSerializer(serializers.Serializer):
    """Serializador para registro completo de empresa"""
    # Datos de empresa
    nombre = serializers.CharField(max_length=100, required=True)
    nit = serializers.CharField(max_length=20, required=True)
    direccion = serializers.CharField(max_length=200, required=True)
    telefono = serializers.CharField(max_length=15, required=True)
    email = serializers.EmailField(required=True)
    
    # Datos del administrador de la empresa (opcional)
    admin_empresa_email = serializers.EmailField(required=True)
    
    def validate_nit(self, value):
        """Validar que el NIT no esté registrado"""
        if Empresa.objects.filter(nit=value).exists():
            raise serializers.ValidationError("Este NIT ya está registrado")
        return value
    
    def validate_email(self, value):
        """Validar que el email de empresa no esté registrado"""
        if Empresa.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este email de empresa ya está registrado")
        return value
    
    def validate_admin_empresa_email(self, value):
        """Validar que el admin_empresa exista y tenga el rol correcto"""
        from usuarios.models import User
        try:
            user = User.objects.get(email=value)
            if not user.rol or user.rol.rol != 'admin_empresa':
                raise serializers.ValidationError("El usuario no tiene rol de admin_empresa")
        except User.DoesNotExist:
            raise serializers.ValidationError("Usuario admin_empresa no encontrado")
        return value