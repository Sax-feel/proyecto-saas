from django.utils import timezone
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password, check_password
from roles.models import Rol

User = get_user_model()

# Registrar nuevo usuario
class RegistroUsuarioSerializer(serializers.ModelSerializer):
    """Serializador para registro de usuarios usando nombres de rol"""
    password = serializers.CharField(write_only=True, required=True)
    rol_nombre = serializers.CharField(write_only=True, required=True, max_length=50)  # ← Nombre del rol
    
    class Meta:
        model = User
        fields = ['email', 'password', 'rol_nombre']  # ← Campo: rol_nombre
        extra_kwargs = {
            'email': {'required': True},
        }
    
    def validate_rol_nombre(self, value):
        """Validar que el rol exista y esté activo por nombre"""
        value = value.lower()  # Convertir a minúsculas para consistencia
        
        # Validar que el valor sea uno de los roles permitidos
        roles_permitidos = ['cliente', 'admin', 'admin_empresa', 'vendedor']
        if value not in roles_permitidos:
            raise serializers.ValidationError(f"Rol '{value}' no es válido. Roles permitidos: {', '.join(roles_permitidos)}")
        
        try:
            rol = Rol.objects.get(rol=value, estado='activo')
            return value
        except Rol.DoesNotExist:
            raise serializers.ValidationError(f"Rol '{value}' no existe o no está activo")
    
    def validate_email(self, value):
        """Validar que el email no esté registrado"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este email ya está registrado")
        return value
    
    def create(self, validated_data):
        """Crear usuario con rol correspondiente"""
        rol_nombre = validated_data.pop('rol_nombre')
        password = validated_data.pop('password')
        
        # Buscar el rol por nombre
        rol = Rol.objects.get(rol=rol_nombre)
        
        # Crear el usuario
        usuario = User.objects.create_user(
            email=validated_data['email'],
            password=password,
            rol=rol,
            estado='activo'
        )
        
        return usuario


# Inicio de sesión
class LoginSerializer(serializers.Serializer):
    """
    Serializador para inicio de sesión.
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    
    def validate(self, data):
        """
        Valida las credenciales y retorna datos con el usuario.
        """
        email = data.get('email')
        password = data.get('password')
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({
                'email': 'Credenciales inválidas'
            })
            
        if not user.check_password(password):
            raise serializers.ValidationError({
                'password': 'Credenciales inválidas'
            })
                
        if user.estado != 'activo':
            raise serializers.ValidationError({
                'email': f'Usuario {user.estado}. Contacte al administrador.'
            })
        
        if not user.rol or user.rol.estado != 'activo':
            raise serializers.ValidationError({
                'email': 'Rol no disponible.'
            })
        
        user.ultimo_login = timezone.now()
        user.save(update_fields=['ultimo_login'])
        
        return {
            'user': user,
            'email': user.email,
            'rol': user.rol.rol if user.rol else None
        }


# Perfil de usuario
class PerfilUsuarioSerializer(serializers.ModelSerializer):
    """Serializador para perfil"""
    rol = serializers.CharField(source='rol.rol')
    rol_id = serializers.IntegerField(source='rol.id_rol')
    rol_display = serializers.CharField(source='rol.get_rol_display')
    
    class Meta:
        model = User
        fields = [
            'id_usuario',
            'email',
            'estado',
            'rol',
            'rol_id',
            'rol_display',
            'fecha_creacion',
            'ultimo_login',
            'is_staff',
            'is_superuser'
        ]
        read_only_fields = fields


# Cambio de contraseña
class CambioPasswordSerializer(serializers.Serializer):
    password_actual = serializers.CharField(write_only=True)
    nueva_password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = self.context['request'].user

        if not user.check_password(data['password_actual']):
            raise serializers.ValidationError("Contraseña actual incorrecta")

        return data

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['nueva_password'])
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    rol = serializers.CharField(source='rol.rol', read_only=True)
    rol_id = serializers.IntegerField(source='rol.id_rol', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id_usuario', 'email', 'estado', 'rol', 'rol_id',
            'fecha_creacion', 'fecha_modificacion', 'ultimo_login',
            'is_staff', 'is_superuser', 'is_active'
        ]
        read_only_fields = [
            'id_usuario', 'fecha_creacion', 'fecha_modificacion',
            'ultimo_login', 'is_staff', 'is_superuser'
        ]