from rest_framework import serializers
from django.contrib.auth.hashers import make_password, check_password
from .models import Usuario
from roles.models import Rol

# Registrar nuevo usuario
class RegistroUsuarioSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    rol_id = serializers.IntegerField()

    def validate(self, data):
        rol = Rol.objects.filter(id_rol=data['rol_id'], estado='activo').first()

        if not rol:
            raise serializers.ValidationError("Rol inválido o inactivo")

        data['rol_obj'] = rol
        return data

    def create(self, validated_data):
        return Usuario.objects.create(
            email=validated_data['email'],
            rol_id=validated_data['rol_obj'],
            password_hash=make_password(validated_data['password']),
            estado='activo'
        )

# Inicio de sesión
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        try:
            user = Usuario.objects.get(email=data['email'])
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("Credenciales inválidas")

        if not check_password(data['password'], user.password_hash):
            raise serializers.ValidationError("Credenciales inválidas")

        if user.estado == "bloqueado":
            raise serializers.ValidationError("Usuario bloqueado")

        return user

# Perfil de usuario
class PerfilUsuarioSerializer(serializers.ModelSerializer):
    rol = serializers.CharField(source='rol_id.rol')

    class Meta:
        model = Usuario
        fields = [
            'id_usuario',
            'email',
            'estado',
            'rol',
            'fecha_creacion',
            'ultimo_login'
        ]

# Cambio de contraseña
class CambioPasswordSerializer(serializers.Serializer):
    password_actual = serializers.CharField(write_only=True)
    nueva_password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = self.context['request'].user

        if not check_password(data['password_actual'], user.password_hash):
            raise serializers.ValidationError("Contraseña actual incorrecta")

        return data

    def save(self):
        user = self.context['request'].user
        user.password_hash = make_password(self.validated_data['nueva_password'])
        user.save()
        return user
