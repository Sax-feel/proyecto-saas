# usuario_empresa/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from usuarios.models import User
from roles.models import Rol
from .models import Usuario_Empresa
from empresas.models import Empresa

User = get_user_model()

class UsuarioEmpresaSerializer(serializers.ModelSerializer):
    """Serializador para el modelo Usuario_Empresa"""
    email = serializers.EmailField(source='id_usuario.email', read_only=True)
    rol = serializers.CharField(source='id_usuario.rol.rol', read_only=True)
    nombre_empresa = serializers.CharField(source='empresa_id.nombre', read_only=True)
    
    class Meta:
        model = Usuario_Empresa
        fields = [
            'id_usuario', 'empresa_id', 'estado', 'fecha_modificacion',
            'email', 'rol', 'nombre_empresa'
        ]
        read_only_fields = ['id_usuario', 'fecha_modificacion']


class RegistroUsuarioEmpresaSerializer(serializers.Serializer):
    """Serializador para registro de usuario_empresa"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        min_length=8,
        help_text="Mínimo 8 caracteres"
    )
    
    rol_nombre = serializers.ChoiceField(
        choices=['vendedor', 'admin_empresa'],
        required=True
    )
    
    # Solo requerido cuando admin crea admin_empresa
    empresa_id = serializers.IntegerField(required=False)
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este email ya está registrado")
        return value
    
    def validate_rol_nombre(self, value):
        try:
            rol = Rol.objects.get(rol=value, estado='activo')
            return value
        except Rol.DoesNotExist:
            raise serializers.ValidationError("Rol no disponible")
    
    def validate(self, data):
        request = self.context.get('request')
        user_actual = request.user
        rol_solicitado = data.get('rol_nombre')
        
        if rol_solicitado == 'admin_empresa':
            # Para admin_empresa, validar empresa_id
            if not data.get('empresa_id'):
                raise serializers.ValidationError({
                    'empresa_id': 'Requerido para rol admin_empresa'
                })
        
        elif rol_solicitado == 'vendedor':
            # Para vendedor, NO debe venir empresa_id
            if data.get('empresa_id'):
                raise serializers.ValidationError({
                    'empresa_id': 'No debe proporcionar empresa_id para rol vendedor. '
                                    'El vendedor se registrará en la misma empresa del admin_empresa que lo crea.'
                })
        
        return data