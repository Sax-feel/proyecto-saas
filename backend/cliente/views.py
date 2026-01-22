from django.db import transaction
from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework import serializers
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from datetime import timedelta
from usuarios.models import User
from roles.models import Rol
from relacion_tiene.models import Tiene
from empresas.serializers import EmpresaSerializer
from .models import Cliente
from relacion_tiene.models import Tiene
from empresas.models import Empresa
from usuario_empresa.models import Usuario_Empresa
from .serializers import RegistroClienteSerializer, ClienteSerializer, EmailEmpresaSerializer
from .models import AuditoriaCliente
from .serializers import AuditoriaClienteSerializer, FiltroAuditoriaSerializer, RegistroClienteConEmpresaSerializer
import logging

logger = logging.getLogger(__name__)

class RegistroClienteConEmpresaView(generics.CreateAPIView):
    """
    Vista pública para que un cliente se registre con empresa automáticamente.
    Se usa cuando el cliente se registra desde una página específica de empresa.
    """
    serializer_class = RegistroClienteConEmpresaSerializer  # Necesitaremos crear este serializador
    permission_classes = [AllowAny]  # Acceso público
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Registro de cliente con empresa automática.
        Crea usuario + cliente + relación con empresa.
        """
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError as e:
            logger.error(f"Error de validación en serializador: {e.detail}")
            return Response(
                {
                    'error': 'Error de validación',
                    'detail': e.detail,
                    'status': 'error'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            logger.info(f"Intento de registro de cliente con empresa: {request.data.get('email')}")
            
            validated_data = serializer.validated_data
            id_empresa = validated_data['id_empresa']
            logger.info(f"Tipo de id_empresa: {type(id_empresa)}")
            logger.info(f"Valor de id_empresa: {id_empresa}")
            
            # 1. Verificar que la empresa exista y esté activa
            try:
                empresa = Empresa.objects.get(
                    id_empresa=id_empresa,
                    estado='activo'
                )
            except Empresa.DoesNotExist:
                return Response(
                    {
                        'error': 'Empresa no disponible',
                        'detail': 'La empresa no existe o no está activa',
                        'status': 'error'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
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
                direccion_cliente=validated_data.get('direccion_cliente', ''),
                telefono_cliente=validated_data.get('telefono_cliente', '')
            )
            
            logger.info(f"Cliente registrado: {cliente.nit}")
            
            # 5. Crear relación con empresa
            try:
                # Verificar si ya existe la relación
                relacion_existente = Tiene.objects.filter(
                    id_cliente=cliente,
                    id_empresa=empresa
                ).exists()
                
                if not relacion_existente:
                    tiene = Tiene.objects.create(
                        id_cliente=cliente,
                        id_empresa=empresa,
                        estado='activo'
                    )
                    logger.info(f"Relación creada: Cliente {cliente.nombre_cliente} - Empresa {empresa.nombre}")
                else:
                    logger.info(f"Relación ya existía: Cliente {cliente.nombre_cliente} - Empresa {empresa.nombre}")
                    # Actualizar estado a activo si estaba inactivo
                    Tiene.objects.filter(
                        id_cliente=cliente,
                        id_empresa=empresa
                    ).update(estado='activo')
            
            except Exception as rel_error:
                logger.error(f"Error creando relación empresa-cliente: {str(rel_error)}")
                # No fallar el registro si hay error en la relación
        
            # 6. Generar tokens de autenticación
            from rest_framework_simplejwt.tokens import RefreshToken
            
            refresh = RefreshToken.for_user(user)
            tokens = {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
            
            # 7. Preparar respuesta
            response_data = {
                'message': 'Cliente registrado exitosamente',
                'detail': 'Tu cuenta ha sido creada y asociada con la empresa',
                'cliente': {
                    'id': cliente.id_usuario,
                    'nit': cliente.nit,
                    'nombre': cliente.nombre_cliente,
                    'email': user.email,
                    'telefono': cliente.telefono_cliente,
                    'fecha_registro': cliente.fecha_registro.isoformat()
                },
                'empresa': {
                    'id': empresa.id_empresa,
                    'nombre': empresa.nombre,
                    'nit': empresa.nit,
                    'estado': empresa.estado
                },
                'relacion': {
                    'estado': 'activo',
                    'fecha_registro': cliente.fecha_registro.isoformat(),
                    'mensaje': f'Cliente registrado en empresa {empresa.nombre}'
                },
                'tokens': tokens,
                'status': 'success'
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error en registro de cliente con empresa: {str(e)}", exc_info=True)
            
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
            if not request.user.rol or request.user.rol.rol == ['admin_empresa', 'admin']:
                self.permission_denied(
                    request,
                    message="Solo administradores de empresa pueden modificar clientes",
                    code=status.HTTP_403_FORBIDDEN
                )

class RegistrarClienteExistenteView(generics.CreateAPIView):
    """
    Vista para que un admin_empresa registre un cliente EXISTENTE en su empresa
    Solo necesita el email del cliente
    Crea la relación en tabla 'tiene'
    """
    serializer_class = EmailEmpresaSerializer  # El serializador que creamos
    permission_classes = [IsAuthenticated]
    
    def check_permissions(self, request):
        """
        Verifica que el usuario tenga rol 'admin_empresa'
        y que pertenezca a la empresa especificada
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
        Registra un cliente existente en la empresa del admin_empresa
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            logger.info(f"Registro de cliente existente por admin_empresa: {request.user.email}")
            
            # 1. Obtener datos validados del serializer
            validated_data = serializer.validated_data
            user_cliente = validated_data['email']  # Objeto User del cliente
            try:
                usuario_empresa = Usuario_Empresa.objects.get(id_usuario=request.user)
                empresa = usuario_empresa.empresa
                logger.info(f"Admin_empresa {request.user.email} pertenece a empresa {empresa.nombre}")
            except Usuario_Empresa.DoesNotExist:
                return Response(
                    {
                        'error': 'Admin sin empresa',
                        'detail': 'No tienes una empresa asignada',
                        'status': 'error'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            if usuario_empresa.estado != 'activo':
                return Response(
                    {
                        'error': 'Admin inactivo',
                        'detail': 'Tu cuenta de administrador no está activa en esta empresa',
                        'status': 'error'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # 2. Verificar que el admin_empresa pertenezca a la empresa especificada
            admin_empresa = self._verificar_permiso_empresa(request.user, empresa)
            if not admin_empresa:
                return Response(
                    {
                        'error': 'Permiso denegado',
                        'detail': 'No pertenece a esta empresa',
                        'status': 'error'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # 3. Obtener el cliente
            try:
                cliente = Cliente.objects.get(id_usuario=user_cliente)
            except Cliente.DoesNotExist:
                return Response(
                    {
                        'error': 'Cliente no encontrado',
                        'detail': 'El usuario no tiene perfil de cliente completo',
                        'status': 'error'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 5. Verificar que el cliente no esté ya registrado en esta empresa
            if Tiene.objects.filter(id_cliente=cliente, id_empresa=empresa).exists():
                return Response(
                    {
                        'error': 'Cliente ya registrado',
                        'detail': f'El cliente {cliente.nombre_cliente} ya está registrado en {empresa.nombre}',
                        'status': 'error'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            

            # 4. Crear relación en tabla 'tiene'
            tiene_relacion = Tiene.objects.create(
                id_cliente=cliente,
                id_empresa=empresa,
                estado='activo',
                fecha_registro=timezone.now()
            )
            
            logger.info(f"Cliente {cliente.nombre_cliente} registrado en empresa {empresa.nombre}")
            
            # 5. Preparar respuesta
            from .serializers import ClienteRegistroResponseSerializer
            
            response_serializer = ClienteRegistroResponseSerializer(
                cliente,
                context={
                    'empresa_nombre': empresa.nombre,
                    'fecha_registro': tiene_relacion.fecha_registro.isoformat()
                }
            )
            
            response_data = {
                'message': 'Cliente registrado exitosamente en la empresa',
                'detail': f'{cliente.nombre_cliente} ahora es cliente de {empresa.nombre}',
                'cliente': response_serializer.data,
                'relacion': {
                    'id': tiene_relacion.id_tiene if hasattr(tiene_relacion, 'id_tiene') else 'compuesta',
                    'empresa_id': empresa.id_empresa,
                    'cliente_id': cliente.nit,
                    'estado': tiene_relacion.estado,
                    'fecha_registro': tiene_relacion.fecha_registro.isoformat()
                },
                'registrado_por': {
                    'email': request.user.email,
                    'empresa': empresa.nombre
                },
                'status': 'success'
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error registrando cliente existente: {str(e)}", exc_info=True)
            return Response(
                {
                    'error': 'Error en el registro del cliente',
                    'detail': str(e),
                    'status': 'error'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _verificar_permiso_empresa(self, user, empresa):
        """
        Verifica que el admin_empresa pertenezca a la empresa especificada
        """
        try:
            from usuario_empresa.models import Usuario_Empresa
            usuario_empresa = Usuario_Empresa.objects.get(
                id_usuario=user,
                empresa=empresa
            )
            return usuario_empresa
        except Usuario_Empresa.DoesNotExist:
            logger.warning(f"Usuario {user.email} no pertenece a empresa {empresa.nombre}")
            return None

class MisEmpresasView(generics.ListAPIView):
    """
    Vista para que un cliente vea las empresas en las que está registrado
    """
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]
    
    def check_permissions(self, request):
        """Verificar que sea cliente"""
        super().check_permissions(request)
        
        if not request.user.rol or request.user.rol.rol != 'cliente':
            self.permission_denied(
                request,
                message="Solo clientes pueden ver sus empresas",
                code=status.HTTP_403_FORBIDDEN
            )
    
    def list(self, request, *args, **kwargs):
        """Listar empresas del cliente"""
        try:
            # Obtener el cliente
            cliente = Cliente.objects.get(id_usuario=request.user)
            
            # Obtener empresas a través de la tabla 'tiene'
            relaciones = Tiene.objects.filter(
                id_cliente=cliente,
                estado='activo'
            ).select_related('id_empresa')
            
            empresas = [relacion.id_empresa for relacion in relaciones]
            
            # Serializar empresas
            from empresas.serializers import EmpresaSerializer
            serializer = EmpresaSerializer(empresas, many=True)
            
            return Response({
                'empresas': serializer.data,
                'total': len(empresas),
                'status': 'success'
            })
            
        except Cliente.DoesNotExist:
            return Response({
                'error': 'Cliente no encontrado',
                'detail': 'No existe perfil de cliente para este usuario',
                'status': 'error'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error obteniendo empresas del cliente: {str(e)}")
            return Response({
                'error': 'Error al obtener empresas',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class ListaAuditoriaClienteView(generics.ListAPIView):
    """
    Vista para listar auditorías de clientes
    Solo accesible por admin y admin_empresa
    """
    serializer_class = AuditoriaClienteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['accion', 'cliente_id', 'usuario_id']
    search_fields = ['cliente_nombre', 'cliente_nit', 'detalles']
    ordering_fields = ['fecha', 'accion', 'cliente_nombre']
    ordering = ['-fecha']
    
    def check_permissions(self, request):
        """Verifica permisos"""
        super().check_permissions(request)
        
        user = request.user
        if not user.rol or user.rol.rol not in ['admin', 'admin_empresa']:
            self.permission_denied(
                request,
                message="No tiene permisos para ver auditorías",
                code=status.HTTP_403_FORBIDDEN
            )
    
    def get_queryset(self):
        """Filtra auditorías según permisos"""
        user = self.request.user
        
        queryset = AuditoriaCliente.objects.all()
        
        # Si es admin_empresa, solo ver auditorías de sus clientes
        if user.rol and user.rol.rol == 'admin_empresa':
            try:
                from usuario_empresa.models import Usuario_Empresa
                usuario_empresa = Usuario_Empresa.objects.get(id_usuario=user)
                empresa = usuario_empresa.empresa
                
                # Obtener clientes de esta empresa
                from relacion_tiene.models import Tiene
                clientes_empresa = Tiene.objects.filter(
                    id_empresa=empresa
                ).values_list('id_cliente_id', flat=True)
                
                # Filtrar auditorías de estos clientes
                queryset = queryset.filter(
                    cliente_id__in=clientes_empresa
                )
            except Exception as e:
                logger.warning(f"Error filtrando auditorías para admin_empresa: {str(e)}")
                return AuditoriaCliente.objects.none()
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Lista con filtros avanzados"""
        try:
            # Aplicar filtros manuales
            queryset = self.filter_queryset(self.get_queryset())
            
            # Filtros adicionales desde query params
            fecha_desde = request.query_params.get('fecha_desde')
            fecha_hasta = request.query_params.get('fecha_hasta')
            
            if fecha_desde:
                queryset = queryset.filter(fecha__date__gte=fecha_desde)
            if fecha_hasta:
                queryset = queryset.filter(fecha__date__lte=fecha_hasta)
            
            
            # Últimos 30 días
            ultimos_30_dias = timezone.now() - timedelta(days=30)
            
            # Paginación
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response({
                    'auditorias': serializer.data,
                    'status': 'success'
                })
            
            serializer = self.get_serializer(queryset, many=True)
            
            return Response({
                'auditorias': serializer.data,
                'status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Error listando auditorías: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al obtener auditorías',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AuditoriaClienteFiltradaView(generics.GenericAPIView):
    """
    Vista para filtrar auditorías con parámetros avanzados
    """
    serializer_class = FiltroAuditoriaSerializer
    permission_classes = [IsAuthenticated]
    
    def check_permissions(self, request):
        """Verifica permisos"""
        super().check_permissions(request)
        
        user = request.user
        if not user.rol or user.rol.rol not in ['admin', 'admin_empresa']:
            self.permission_denied(
                request,
                message="No tiene permisos para ver auditorías",
                code=status.HTTP_403_FORBIDDEN
            )
    
    def post(self, request, *args, **kwargs):
        """Filtra auditorías con múltiples criterios"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            filtros = serializer.validated_data
            queryset = AuditoriaCliente.objects.all()
            
            # Aplicar filtros
            if filtros.get('fecha_desde'):
                queryset = queryset.filter(fecha__date__gte=filtros['fecha_desde'])
            if filtros.get('fecha_hasta'):
                queryset = queryset.filter(fecha__date__lte=filtros['fecha_hasta'])
            if filtros.get('accion'):
                queryset = queryset.filter(accion=filtros['accion'])
            if filtros.get('cliente_id'):
                queryset = queryset.filter(cliente_id=filtros['cliente_id'])
            if filtros.get('usuario_id'):
                queryset = queryset.filter(usuario_id=filtros['usuario_id'])
            
            # Ordenar por fecha descendente
            queryset = queryset.order_by('-fecha')
            
            # Serializar resultados
            auditoria_serializer = AuditoriaClienteSerializer(queryset, many=True)
            
            return Response({
                'auditorias': auditoria_serializer.data,
                'total': queryset.count(),
                'filtros_aplicados': filtros,
                'status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Error filtrando auditorías: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al filtrar auditorías',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_400_BAD_REQUEST)


class DetalleAuditoriaClienteView(generics.RetrieveAPIView):
    """
    Vista para ver detalle de una auditoría específica
    """
    serializer_class = AuditoriaClienteSerializer
    permission_classes = [IsAuthenticated]
    queryset = AuditoriaCliente.objects.all()
    lookup_field = 'id'
    
    def check_permissions(self, request):
        """Verifica permisos"""
        super().check_permissions(request)
        
        user = request.user
        if not user.rol or user.rol.rol not in ['admin', 'admin_empresa']:
            self.permission_denied(
                request,
                message="No tiene permisos para ver auditorías",
                code=status.HTTP_403_FORBIDDEN
            )

class ListaTodosClientesView(generics.ListAPIView):
    """
    Vista para listar TODOS los clientes del sistema
    Solo accesible por rol 'admin'
    Devuelve cliente con información de empresa
    """
    serializer_class = ClienteSerializer  # Usa el nuevo serializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Verifica que el usuario tenga rol 'admin'
        """
        # Verificar si el usuario tiene rol y es 'admin'
        if not hasattr(self.request.user, 'rol'):
            return Cliente.objects.none()
        
        if self.request.user.rol.rol != 'admin':
            return Cliente.objects.none()
        
        # Si es admin, retornar todos los clientes
        return Cliente.objects.all().select_related('id_usuario')
    
    def list(self, request, *args, **kwargs):
        """
        Sobrescribimos para dar mensaje de error personalizado
        """
        # Verificar permisos primero
        if not hasattr(self.request.user, 'rol'):
            return Response(
                {"error": "Usuario sin rol asignado"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if self.request.user.rol.rol != 'admin':
            return Response(
                {"error": "Solo los administradores pueden ver todos los clientes"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Llamar al método original
        return super().list(request, *args, **kwargs)
    