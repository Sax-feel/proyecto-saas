from django.db import transaction
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from usuarios.models import User
from roles.models import Rol
from relacion_tiene.models import Tiene
from .models import Cliente
from .serializers import RegistroClienteSerializer, ClienteSerializer
import logging


logger = logging.getLogger(__name__)

class RegistroClienteView(generics.CreateAPIView):
    """
    Vista pública para que un cliente se registre en una empresa específica.
    Accesible por cualquiera (sin autenticación requerida)
    """
    serializer_class = RegistroClienteSerializer
    permission_classes = [AllowAny]  #  Acceso público
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Registro público de cliente con selección de empresa.
        Crea usuario + cliente + relación con empresa seleccionada.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            logger.info(f"Intento de registro público de cliente: {request.data.get('email')}")
            
            validated_data = serializer.validated_data
            
            # 1. Obtener la empresa seleccionada
            empresa = validated_data['empresa_nombre']
            logger.info(f"Cliente se registra en empresa: {empresa.nombre}")
            
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
            
            # 5. Crear relación en tabla 'tiene' (cliente → empresa)
            tiene_relacion = Tiene.objects.create(
                id_cliente=cliente,
                id_empresa=empresa,
                estado='activo'
            )
            
            logger.info(f"Relación creada: Cliente '{cliente.nombre_cliente}' - Empresa '{empresa.nombre}'")
            
            
            # 7. Preparar respuesta completa
            response_data = {
                'message': 'Cliente registrado exitosamente',
                'detail': f'Te has registrado en la empresa {empresa.nombre}',
                'cliente': {
                    'nit': cliente.nit,
                    'nombre': cliente.nombre_cliente,
                    'email': user.email,
                    'telefono': cliente.telefono_cliente
                },
                'empresa': {
                    'id': empresa.id_empresa,
                    'nombre': empresa.nombre,
                    'nit': empresa.nit,
                    'telefono': empresa.telefono,
                    'direccion': empresa.direccion
                },
                'registro': {
                    'fecha': tiene_relacion.fecha_registro.isoformat(),
                    'estado': tiene_relacion.estado
                },
                'instrucciones': {
                    'login': 'Usa tus credenciales para iniciar sesión',
                    'empresa': 'Puedes registrarte en otras empresas desde tu panel',
                    'contacto': f'Contacta a {empresa.nombre}: {empresa.telefono}'
                },
                'status': 'success'
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error en registro público de cliente: {str(e)}", exc_info=True)
            
            # Rollback en caso de error
            if 'user' in locals():
                user.delete()
                logger.info(f"Usuario {user.email} eliminado por error")
            
            return Response(
                {
                    'error': 'Error en el registro',
                    'detail': str(e),
                    'sugerencia': 'Verifica los datos e intenta nuevamente',
                    'status': 'error'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

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