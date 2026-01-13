from django.utils import timezone
from rest_framework import generics, status, serializers
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import AllowAny
from usuarios.models import User
from cuentas.serializers import LogoutSerializer
from usuarios.serializers import RegistroUsuarioSerializer, PerfilUsuarioSerializer, LoginSerializer
import logging

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