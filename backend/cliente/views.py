from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from usuarios.models import User
from roles.models import Rol
from relacion_tiene.models import Tiene
from .models import Cliente
from .serializers import RegistroClienteSerializer, ClienteSerializer
import logging

logger = logging.getLogger(__name__)

class RegistroClienteView(generics.CreateAPIView):
    """
    Vista para que una empresa registre un cliente.
    Solo accesible por usuarios con rol 'admin_empresa'
    """
    serializer_class = RegistroClienteSerializer
    permission_classes = [IsAuthenticated]
    
    def check_permissions(self, request):
        """
        Verifica que el usuario tenga rol 'admin_empresa'
        """
        super().check_permissions(request)
        
        if not request.user.rol or request.user.rol.rol != 'admin_empresa':
            self.permission_denied(
                request,
                message="Solo administradores de empresa pueden registrar clientes",
                code=status.HTTP_403_FORBIDDEN
            )
    
    def create(self, request, *args, **kwargs):
        """
        Registra un nuevo cliente (crea usuario + datos de cliente + relación con empresa)
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            logger.info(f"Intento de registro de cliente por empresa: {request.user.email}")
            
            # 1. Obtener la empresa del admin_empresa
            empresa = self._obtener_empresa_usuario(request.user)
            if not empresa:
                return Response(
                    {
                        'error': 'Empresa no encontrada',
                        'detail': 'El administrador no está asociado a una empresa',
                        'status': 'error'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            validated_data = serializer.validated_data
            
            # 2. Obtener rol 'cliente'
            try:
                rol_cliente = Rol.objects.get(rol='cliente', estado='activo')
            except Rol.DoesNotExist:
                return Response(
                    {
                        'error': 'Rol no disponible',
                        'detail': 'El rol de cliente no está configurado en el sistema',
                        'status': 'error'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 3. Crear usuario
            user = User.objects.create_user(
                email=validated_data['email'],
                password=validated_data['password'],
                rol=rol_cliente,
                estado='activo'
            )
            
            logger.info(f"Usuario creado para cliente: {user.email}")
            
            # 4. Crear cliente
            cliente = Cliente.objects.create(
                id_usuario=user,
                nit=validated_data['nit'],
                nombre_cliente=validated_data['nombre_cliente'],
                direccion_cliente=validated_data['direccion_cliente'],
                telefono_cliente=validated_data['telefono_cliente']
            )
            
            logger.info(f"Cliente registrado exitosamente: {cliente.nit}")
            
            # 5. Crear relación en tabla 'tiene'
            tiene_relacion = Tiene.objects.create(
                id_cliente=cliente,
                id_empresa=empresa
            )
            
            logger.info(f"Relación creada: Cliente '{cliente.nombre_cliente}' - Empresa '{empresa.nombre}'")
            
            # 6. Preparar respuesta
            response_data = {
                'message': 'Cliente registrado exitosamente y asociado a la empresa',
                'cliente': ClienteSerializer(cliente).data,
                'usuario': {
                    'id': user.id_usuario,
                    'email': user.email,
                    'rol': user.rol.rol,
                    'estado': user.estado
                },
                'empresa_asociada': {
                    'id': empresa.id_empresa,
                    'nombre': empresa.nombre,
                    'nit': empresa.nit
                },
                'relacion_tiene': {
                    'id': tiene_relacion.id_tiene if hasattr(tiene_relacion, 'id_tiene') else 'compuesta',
                    'fecha_registro': tiene_relacion.fecha_registro.isoformat()
                },
                'registrado_por': request.user.email,
                'status': 'success'
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error en registro de cliente: {str(e)}", exc_info=True)
            
            # Rollback: eliminar lo creado
            if 'user' in locals():
                user.delete()
                logger.info(f"Usuario {user.email} eliminado por error")
            if 'cliente' in locals() and Cliente.objects.filter(id_usuario=user).exists():
                cliente.delete()
                logger.info(f"Cliente eliminado por error")
            
            return Response(
                {
                    'error': 'Error en el registro del cliente',
                    'detail': str(e),
                    'status': 'error'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _obtener_empresa_usuario(self, user):
        """
        Obtiene la empresa asociada al usuario admin_empresa
        """
        try:
            from usuario_empresa.models import Usuario_Empresa
            usuario_empresa = Usuario_Empresa.objects.get(id_usuario=user)
            return usuario_empresa.empresa_id
        except Exception as e:
            logger.warning(f"No se pudo obtener empresa para usuario {user.email}: {str(e)}")
            return None


class ListaClientesView(generics.ListAPIView):
    """
    Vista para listar clientes (solo para admin_empresa)
    """
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Solo admin_empresa puede ver clientes
        """
        if self.request.user.rol and self.request.user.rol.rol == 'admin_empresa':
            return Cliente.objects.all()
        return Cliente.objects.none()


class DetalleClienteView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vista para ver, actualizar o eliminar un cliente
    """
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]
    queryset = Cliente.objects.all()
    
    def check_permissions(self, request):
        """
        Verifica permisos según el rol
        """
        super().check_permissions(request)
        
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            if not request.user.rol or request.user.rol.rol != 'admin_empresa':
                self.permission_denied(
                    request,
                    message="Solo administradores de empresa pueden modificar clientes",
                    code=status.HTTP_403_FORBIDDEN
                )