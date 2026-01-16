from rest_framework import serializers
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
import jwt
from django.conf import settings

User = get_user_model()

class LogoutSerializer(serializers.Serializer):
    """
    Serializador para validar el token de refresh en logout.
    """
    refresh = serializers.CharField(
        required=True,
        help_text="Token de refresh a invalidar"
    )
    
    def validate_refresh(self, value):
        """
        Validación básica del token.
        """
        if not value or len(value) < 10:
            raise serializers.ValidationError("Token inválido")
        
        if not value.startswith('eyJ'):
            raise serializers.ValidationError("Formato de token inválido")
        
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializador para solicitar restablecimiento de contraseña
    """
    email = serializers.EmailField(required=True, max_length=100)
    
    def validate_email(self, value):
        """
        Validar que el email exista en el sistema
        """    
        if not value:
            raise serializers.ValidationError("El email es requerido")
        
        # Verificar formato básico
        if '@' not in value or '.' not in value:
            raise serializers.ValidationError("Formato de email inválido")
        
        return value.lower()  # Normalizar a minúsculas
    
    def get_user(self):
        """
        Obtener usuario por email (si existe)
        """
        email = self.validated_data.get('email')
        try:
            return User.objects.get(email=email, estado='activo')
        except User.DoesNotExist:
            return None


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializador para confirmar restablecimiento de contraseña
    """
    token = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(
        required=True, 
        write_only=True,
        min_length=8,
        max_length=128,
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        required=True, 
        write_only=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, data):
        """
        Validar token y contraseñas
        """
        token = data.get('token')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        # Validar que las contraseñas coincidan
        if new_password != confirm_password:
            raise serializers.ValidationError({
                'confirm_password': 'Las contraseñas no coinciden'
            })
        
        # Validar fortaleza de contraseña
        if len(new_password) < 8:
            raise serializers.ValidationError({
                'new_password': 'La contraseña debe tener al menos 8 caracteres'
            })
        
        # Validar token
        try:
            # Decodificar token JWT
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=['HS256']
            )
            
            # Verificar que sea un token de password reset
            if payload.get('type') != 'password_reset':
                raise serializers.ValidationError({
                    'token': 'Token inválido'
                })
            
            # Verificar expiración
            exp = payload.get('exp')
            if exp and timezone.now().timestamp() > exp:
                raise serializers.ValidationError({
                    'token': 'El enlace ha expirado. Solicita uno nuevo.'
                })
            
            # Obtener usuario
            user_id = payload.get('user_id')
            if not user_id:
                raise serializers.ValidationError({
                    'token': 'Token inválido'
                })
            
            try:
                user = User.objects.get(id_usuario=user_id, estado='activo')
                data['user'] = user
                data['payload'] = payload
            except User.DoesNotExist:
                raise serializers.ValidationError({
                    'token': 'Usuario no encontrado o inactivo'
                })
                
        except jwt.ExpiredSignatureError:
            raise serializers.ValidationError({
                'token': 'El enlace ha expirado. Solicita uno nuevo.'
            })
        except jwt.InvalidTokenError:
            raise serializers.ValidationError({
                'token': 'Token inválido o corrupto'
            })
        except Exception as e:
            raise serializers.ValidationError({
                'token': f'Error validando token: {str(e)}'
            })
        
        return data


class PasswordResetValidateTokenSerializer(serializers.Serializer):
    """
    Serializador para validar token de restablecimiento
    """
    token = serializers.CharField(required=True)
    
    def validate(self, data):
        token = data.get('token')
        
        try:
            # Decodificar token
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=['HS256']
            )
            
            # Verificar tipo
            if payload.get('type') != 'password_reset':
                raise serializers.ValidationError('Token inválido')
            
            # Verificar expiración
            exp = payload.get('exp')
            if exp and timezone.now().timestamp() > exp:
                raise serializers.ValidationError('El enlace ha expirado')
            
            # Obtener usuario
            user_id = payload.get('user_id')
            if not user_id:
                raise serializers.ValidationError('Token inválido')
            
            try:
                user = User.objects.get(id_usuario=user_id, estado='activo')
                data['user'] = user
                data['payload'] = payload
                data['email'] = user.email
            except User.DoesNotExist:
                raise serializers.ValidationError('Usuario no encontrado')
                
        except jwt.ExpiredSignatureError:
            raise serializers.ValidationError('El enlace ha expirado')
        except jwt.InvalidTokenError:
            raise serializers.ValidationError('Token inválido')
        
        return data