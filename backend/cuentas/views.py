from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from rest_framework import generics, status, serializers
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny
from usuarios.serializers import RegistroUsuarioSerializer, PerfilUsuarioSerializer, LoginSerializer
from cuentas.serializers import (
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetValidateTokenSerializer
)
from datetime import timedelta
import logging
import jwt


logger = logging.getLogger(__name__)

class RegisterView(generics.CreateAPIView):
    serializer_class = RegistroUsuarioSerializer
    permission_classes = [AllowAny]
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            logger.info(f"Intento de registro: {request.data.get('email')}")
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            
            rol_nombre = user.rol.rol
            self._create_role_profile(user, rol_nombre)

            logger.info(f"Usuario registrado exitosamente: {user.email}")
            response_data = {
                'message': 'Usuario registrado exitosamente',
                'user': PerfilUsuarioSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'status': 'success'
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Error en registro: {str(e)}", exc_info=True)
            if 'user' in locals():
                user.delete()
                logger.info(f"User {user.email} eliminado por error")
            
            return Response(
                {
                    'error': 'Error en el registro',
                    'detail': str(e),
                    'status': 'error'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _create_role_profile(self, user, rol_nombre):
        """
        Crea estructuras adicionales según el rol del usuario.
        Este método es privado (comienza con _) porque es interno.
        """
        
        logger.debug(f"Creando perfil para rol: {rol_nombre}")
        
        if rol_nombre == 'cliente':
            from cliente.models import Cliente
            
            Cliente.objects.create(
                id_usuario=user,
                nit=f"CLI{user.id_usuario:06d}",
                nombre_cliente=user.email.split('@')[0],
                direccion_cliente="Por definir",
                telefono_cliente="0000000000"
            )
            logger.info(f"Perfil de cliente creado para {user.email}")
        
        elif rol_nombre == 'admin':
            from admins.models import Admin
            
            Admin.objects.create(
                id_usuario=user,
                nombre_admin=user.email.split('@')[0],
                telefono_admin="0000000000"
            )
            logger.info(f"Perfil de admin creado para {user.email}")
        
        elif rol_nombre == 'admin_empresa':
            logger.info(f"User {user.email} registrado como admin_empresa")            
            
        elif rol_nombre == 'vendedor':
            logger.info(f"User {user.email} registrado como vendedor")
        else:
            logger.warning(f"Rol '{rol_nombre}' no tiene perfil específico configurado para {user.email}")

#---------------------#
class LoginView(generics.GenericAPIView):
    
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        
        logger.info(f"Intento de login desde IP: {self._get_client_ip(request)}")
        serializer = self.get_serializer(data=request.data)
        
        try:            
            serializer.is_valid(raise_exception=True)
            
        except serializers.ValidationError as e:
            logger.warning(
                f"Login fallido para {request.data.get('email', 'unknown')} "
                f"desde {self._get_client_ip(request)}"
            )
            
            return Response(
                {
                    'error': 'Autenticación fallida',
                    'detail': e.detail,
                    'status': 'error'
                },
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        user = serializer.validated_data['user']
        logger.info(f"Login exitoso: {user.email} (Rol: {user.rol.rol if user.rol else 'sin rol'})")
        
        try:
            refresh = RefreshToken.for_user(user)            
            refresh['email'] = user.email
            refresh['rol'] = user.rol.rol if user.rol else None
            refresh['estado'] = user.estado
            
            user_data = PerfilUsuarioSerializer(user).data
            additional_data = self._get_role_specific_data(user)
            
            response_data = {
                'message': 'Inicio de sesión exitoso',
                'user': user_data,
                'additional_data': additional_data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'token_expiration': {
                    'access': 3600,  # 1 hora en segundos
                    'refresh': 604800,  # 7 días en segundos
                },
                'status': 'success'
            }
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
        
            logger.error(f"Error generando tokens para {user.email}: {str(e)}")
            return Response(
                {
                    'error': 'Error interno del servidor',
                    'detail': 'No se pudieron generar los tokens de acceso',
                    'status': 'error'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_role_specific_data(self, user):
        """
        Retorna datos adicionales según el rol del usuario.
        """
        data = {}    
        rol_nombre = user.rol.rol if user.rol else None
    
        if rol_nombre == 'cliente':
            try:
                from cliente.models import Cliente
                cliente = Cliente.objects.get(id_usuario=user)
                data['cliente'] = {
                    'nit': cliente.nit,
                    'nombre': cliente.nombre_cliente,
                    'telefono': cliente.telefono_cliente
                }
            except Exception:
                data['cliente'] = None
        
        elif rol_nombre == 'admin':
            try:
                from admins.models import Admin
                admin = Admin.objects.get(id_usuario=user)
                data['admin'] = {
                    'nombre': admin.nombre_admin,
                    'telefono': admin.telefono_admin
                }
            except Exception:
                data['admin'] = None
        
        elif rol_nombre == 'admin_empresa':

            try:
                from usuario_empresa.models import Usuario_Empresa
                from empresas.models import Empresa
                
                usuario_empresa = Usuario_Empresa.objects.get(id_usuario=user)
                empresa = usuario_empresa.empresa_id
                
                data['empresa'] = {
                    'id': empresa.id_empresa,
                    'nombre': empresa.nombre,
                    'nit': empresa.nit,
                    'estado': empresa.estado
                }
            except Exception:
                data['empresa'] = None
        
        return data
    
    def _get_client_ip(self, request):
        """
        Obtiene la IP real del cliente.
        Considera proxies y headers X-Forwarded-For.
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
            
        return ip or 'IP desconocida'


#--------------------#

class LogoutView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        logger.info(f"Intento de logout para usuario: {request.user.email}")
        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            logger.warning("Logout fallido: No se proporcionó refresh token")
            return Response(
                {
                    'error': 'Token requerido',
                    'detail': 'Se requiere el token de refresh',
                    'status': 'error'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Verificar y blacklistear el token
            token = RefreshToken(refresh_token)
            token.verify()
            
            user_id = token['user_id']
            
            # Convertir ambos IDs a int para comparación
            token_user_id = int(user_id) if isinstance(user_id, str) else user_id
            request_user_id = int(request.user.id_usuario)
            
            if token_user_id != request_user_id:
                logger.warning(
                    f"Token no pertenece al usuario. "
                    f"Token user_id: {user_id} (type: {type(user_id)}), "
                    f"Request user: {request_user_id} (type: {type(request_user_id)})"
                )
                return Response(
                    {
                        'error': 'Token inválido',
                        'detail': 'El token no pertenece al usuario autenticado',
                        'status': 'error'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            token.blacklist()
            logger.info(f"Logout exitoso. Token blacklisteado para usuario: {request.user.email}")
            
            return Response(
                {
                    'message': 'Cierre de sesión exitoso',
                    'detail': 'El token ha sido invalidado',
                    'status': 'success',
                    'metadata': {
                        'user_id': request_user_id,
                        'email': request.user.email,
                        'logout_time': timezone.now().isoformat()
                    }
                },
                status=status.HTTP_200_OK
            )
            
        except TokenError as e:
            logger.warning(f"Token inválido en logout: {str(e)}")
            error_message = str(e)
            
            if 'token is blacklisted' in error_message.lower():
                friendly_message = 'Este token ya ha sido invalidado'
            elif 'token has expired' in error_message.lower():
                friendly_message = 'El token ha expirado'
            elif 'token is invalid' in error_message.lower():
                friendly_message = 'Token inválido'
            else:
                friendly_message = error_message
            
            return Response(
                {
                    'error': 'Token inválido',
                    'detail': friendly_message,
                    'technical_detail': error_message,
                    'status': 'error',
                    'action': 'Por favor, inicie sesión nuevamente'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
                
        except Exception as e:
            logger.error(f"Error inesperado en logout: {str(e)}", exc_info=True)
            return Response(
                {
                    'error': 'Error interno',
                    'detail': 'Ocurrió un error al procesar el logout',
                    'status': 'error'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def options(self, request, *args, **kwargs):
        """
        Maneja preflight CORS requests.
        """
        response = super().options(request, *args, **kwargs)
        response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        return response
    

class PasswordResetRequestView(generics.GenericAPIView):
    """
    Vista para solicitar restablecimiento de contraseña
    Envía email con enlace de restablecimiento
    """
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        user = serializer.get_user()
        
        # Por seguridad, siempre devolver éxito aunque el email no exista
        if not user:
            logger.info(f"Intento de reset para email no registrado: {email}")
            return Response({
                'message': 'Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.',
                'status': 'success'
            }, status=status.HTTP_200_OK)
        
        try:
            # Generar token JWT para password reset
            token = self._generate_password_reset_token(user)
            
            # Construir URL de frontend
            reset_url = self._build_reset_url(request, token)
            
            # Enviar email
            self._send_password_reset_email(user, reset_url)
            
            logger.info(f"Email de reset enviado a: {user.email}")
            
            return Response({
                'message': 'Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.',
                'status': 'success',
                'metadata': {
                    'email_sent_to': email,
                    'user_id': user.id_usuario,
                    'timestamp': timezone.now().isoformat()
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error enviando email de reset a {email}: {str(e)}", exc_info=True)
            
            # Por seguridad, no revelar el error real
            return Response({
                'message': 'Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.',
                'status': 'success'
            }, status=status.HTTP_200_OK)
    
    def _generate_password_reset_token(self, user):
        """
        Generar token JWT para password reset
        """
        payload = {
            'type': 'password_reset',
            'user_id': user.id_usuario,
            'email': user.email,
            'exp': (timezone.now() + timedelta(hours=24)).timestamp(),  # 24 horas
            'iat': timezone.now().timestamp(),
            'jti': f'pwd_reset_{user.id_usuario}_{timezone.now().timestamp()}'
        }
        
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        return token
    
    def _build_reset_url(self, request, token):
        """
        Construir URL para frontend
        """
        # URL para frontend Next.js
        frontend_url = 'http://localhost:3000'  # Cambiar según tu frontend
        
        reset_url = f"{frontend_url}/reset-password?token={token}"
        return reset_url
    
    def _send_password_reset_email(self, user, reset_url):
        """
        Enviar email con enlace de restablecimiento
        """
        subject = 'Restablecimiento de contraseña - Tu SAAS'
        
        # Contexto para template
        context = {
            'user': user,
            'reset_url': reset_url,
            'expiry_hours': 24,
            'support_email': getattr(settings, 'SUPPORT_EMAIL', 'soporte@tudominio.com'),
            'current_year': timezone.now().year
        }
        
        # Renderizar template HTML
        html_message = render_to_string('emails/password_reset.html', context)
        plain_message = strip_tags(html_message)
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False
        )


class PasswordResetConfirmView(generics.GenericAPIView):
    """
    Vista para confirmar restablecimiento de contraseña
    """
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
            
            user = serializer.validated_data['user']
            new_password = serializer.validated_data['new_password']
            
            # Cambiar contraseña
            user.set_password(new_password)
            user.save()
            
            # Invalidar tokens JWT existentes (opcional)
            # Podrías agregar el token actual a una blacklist
            
            logger.info(f"Contraseña actualizada para usuario: {user.email}")
            
            return Response({
                'message': 'Contraseña actualizada exitosamente',
                'status': 'success',
                'metadata': {
                    'user_id': user.id_usuario,
                    'email': user.email,
                    'password_changed_at': timezone.now().isoformat()
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error actualizando contraseña: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al actualizar contraseña',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetValidateTokenView(generics.GenericAPIView):
    """
    Vista para validar token de restablecimiento
    """
    serializer_class = PasswordResetValidateTokenSerializer
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
            
            user = serializer.validated_data['user']
            payload = serializer.validated_data['payload']
            email = serializer.validated_data['email']
            
            # Calcular tiempo restante
            exp_timestamp = payload.get('exp')
            if exp_timestamp:
                remaining_time = exp_timestamp - timezone.now().timestamp()
                remaining_hours = max(0, remaining_time / 3600)
            else:
                remaining_hours = 0
            
            return Response({
                'message': 'Token válido',
                'status': 'success',
                'data': {
                    'valid': True,
                    'email': email,
                    'user_id': user.id_usuario,
                    'token_type': payload.get('type'),
                    'expires_in_hours': round(remaining_hours, 2),
                    'is_expired': remaining_hours <= 0
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.warning(f"Token de reset inválido: {str(e)}")
            return Response({
                'message': 'Token inválido o expirado',
                'status': 'error',
                'data': {
                    'valid': False,
                    'error': str(e)
                }
            }, status=status.HTTP_400_BAD_REQUEST)