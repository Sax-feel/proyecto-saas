from django.db import transaction
from rest_framework import generics, status, filters
from rest_framework.response import Response
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from datetime import timedelta
from usuarios.models import User
from roles.models import Rol
from relacion_tiene.models import Tiene
from empresas.serializers import EmpresaSerializer
from .serializers import (
    RegistroClienteConEmpresaSerializer,
    ClienteResponseSerializer
)
from .models import Cliente
from empresas.models import Empresa
from usuario_empresa.models import Usuario_Empresa
from .serializers import RegistroClienteSerializer, ClienteSerializer, EmailEmpresaSerializer
from .models import AuditoriaCliente
from .serializers import AuditoriaClienteSerializer, FiltroAuditoriaSerializer, RegistroClienteConEmpresaSerializer, NITEmpresaSerializer
import logging

logger = logging.getLogger(__name__)

class RegistroClienteConEmpresaView(generics.CreateAPIView):
    """
    Vista pública para registrar un cliente con empresa automáticamente
    POST /api/clientes/registrar-con-empresa/
    """
    serializer_class = RegistroClienteConEmpresaSerializer
    permission_classes = [AllowAny]
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Proceso completo de registro:
        1. Validar datos
        2. Crear usuario
        3. Crear cliente
        4. Crear relación con empresa
        5. Retornar respuesta con tokens
        """
        try:
            logger.info(f"Iniciando registro de cliente con empresa")
            
            # 1. Validar datos con serializador
            serializer = self.get_serializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"Error de validación: {serializer.errors}")
                return Response({
                    'status': 'error',
                    'error': 'Error de validación',
                    'detail': serializer.errors,
                    'message': 'Por favor corrige los errores en el formulario'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            validated_data = serializer.validated_data
            empresa_id = validated_data['id_empresa']
            
            # 2. Obtener empresa
            try:
                empresa = Empresa.objects.get(
                    id_empresa=empresa_id,
                    estado='activo'
                )
                logger.info(f"Empresa encontrada: {empresa.nombre} (ID: {empresa.id_empresa})")
            except Empresa.DoesNotExist:
                logger.error(f"Empresa no encontrada o inactiva: ID {empresa_id}")
                return Response({
                    'status': 'error',
                    'error': 'Empresa no disponible',
                    'detail': 'La empresa no existe o no está activa',
                    'message': 'No se puede registrar en esta empresa'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 3. Obtener rol 'cliente'
            try:
                rol_cliente = Rol.objects.get(rol='cliente', estado='activo')
                logger.info(f"Rol cliente obtenido: {rol_cliente.rol}")
            except Rol.DoesNotExist:
                logger.error("Rol 'cliente' no encontrado en el sistema")
                return Response({
                    'status': 'error',
                    'error': 'Configuración del sistema incompleta',
                    'detail': 'El rol de cliente no está configurado',
                    'message': 'Contacta al administrador del sistema'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # 4. Crear usuario
            try:
                user = User.objects.create_user(
                    email=validated_data['email'],
                    password=validated_data['password'],
                    rol=rol_cliente,
                    estado='activo'
                )
                logger.info(f"Usuario creado exitosamente: {user.email}")
            except Exception as e:
                logger.error(f"Error al crear usuario: {str(e)}")
                return Response({
                    'status': 'error',
                    'error': 'Error al crear usuario',
                    'detail': str(e),
                    'message': 'No se pudo crear la cuenta de usuario'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 5. Crear cliente
            try:
                cliente = Cliente.objects.create(
                    id_usuario=user,
                    nit=validated_data['nit'],
                    nombre_cliente=validated_data['nombre_cliente'],
                    direccion_cliente=validated_data.get('direccion_cliente', ''),
                    telefono_cliente=validated_data.get('telefono_cliente', '')
                )
                logger.info(f"Cliente creado exitosamente: {cliente.nombre_cliente} (NIT: {cliente.nit})")
            except Exception as e:
                # Rollback: eliminar usuario si falla crear cliente
                user.delete()
                logger.error(f"Error al crear cliente, usuario eliminado: {str(e)}")
                return Response({
                    'status': 'error',
                    'error': 'Error al crear perfil de cliente',
                    'detail': str(e),
                    'message': 'No se pudo crear el perfil del cliente'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 6. Crear relación con empresa
            try:
                # Verificar si ya existe relación
                if Tiene.objects.filter(
                    id_cliente=cliente,
                    id_empresa=empresa
                ).exists():
                    # Actualizar si ya existe
                    Tiene.objects.filter(
                        id_cliente=cliente,
                        id_empresa=empresa
                    ).update(estado='activo')
                    logger.info(f"Relación ya existía, actualizada a activo")
                else:
                    # Crear nueva relación
                    tiene = Tiene.objects.create(
                        id_cliente=cliente,
                        id_empresa=empresa,
                        estado='activo'
                    )
                    logger.info(f"Relación empresa-cliente creada exitosamente")
                
            except Exception as e:
                logger.error(f"Error creando relación empresa-cliente: {str(e)}")
                # No hacemos rollback aquí, el cliente ya está creado
                # Solo logueamos el error pero continuamos
            
            # 7. Preparar respuesta exitosa
            response_serializer = ClienteResponseSerializer(
                cliente,
                context={'empresa_id': empresa_id}
            )
            
            response_data = {
                'status': 'success',
                'message': 'Cliente registrado exitosamente',
                'detail': 'Tu cuenta ha sido creada y asociada con la empresa',
                'data': response_serializer.data,
                'instrucciones': {
                    'login': 'Usa tu email y contraseña para iniciar sesión',
                    'empresa': f'Estás registrado en: {empresa.nombre}',
                    'siguientes_pasos': 'Ya puedes realizar compras en la empresa'
                }
            }
            
            logger.info(f"Registro completado exitosamente para: {cliente.nombre_cliente}")
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error general en registro de cliente: {str(e)}", exc_info=True)
            
            # Rollback general si hubo error antes de crear el usuario
            if 'user' in locals():
                try:
                    user.delete()
                    logger.info(f"Usuario {user.email} eliminado por error general")
                except:
                    pass
            
            return Response({
                'status': 'error',
                'error': 'Error interno del servidor',
                'detail': str(e),
                'message': 'Ocurrió un error inesperado. Por favor intenta nuevamente.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InfoEmpresaParaRegistroView(generics.RetrieveAPIView):
    """
    Vista para obtener información de empresa para mostrar en el formulario de registro
    GET /api/clientes/empresa-registro/{id}/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, id_empresa, *args, **kwargs):
        """
        Retorna información básica de la empresa para mostrar en el formulario
        """
        try:
            empresa = Empresa.objects.get(
                id_empresa=id_empresa,
                estado='activo'
            )
            
            # Contar clientes registrados en esta empresa
            cantidad_clientes = Tiene.objects.filter(
                id_empresa=empresa,
                estado='activo'
            ).count()
            
            data = {
                'status': 'success',
                'empresa': {
                    'id': empresa.id_empresa,
                    'nombre': empresa.nombre,
                    'nit': empresa.nit,
                    'rubro': empresa.rubro,
                    'direccion': empresa.direccion,
                    'telefono': empresa.telefono,
                    'email': empresa.email,
                    'estado': empresa.estado,
                    'fecha_creacion': empresa.fecha_creacion,
                    'cantidad_clientes': cantidad_clientes
                },
                'mensaje': f'Registro para: {empresa.nombre}',
                'instrucciones': 'Completa el formulario para registrarte como cliente'
            }
            
            return Response(data)
            
        except Empresa.DoesNotExist:
            return Response({
                'status': 'error',
                'error': 'Empresa no encontrada',
                'detail': f'No existe la empresa con ID {id_empresa}',
                'message': 'La empresa especificada no existe o no está activa'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error obteniendo información de empresa: {str(e)}")
            return Response({
                'status': 'error',
                'error': 'Error al obtener información',
                'detail': str(e),
                'message': 'No se pudo obtener la información de la empresa'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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

class RegistrarClienteExistenteNITView(generics.CreateAPIView):
    """
    Vista para que vendedor o admin_empresa registre un cliente EXISTENTE en su empresa
    Usa el NIT del cliente (no email)
    Crea la relación en tabla 'tiene'
    Acceso: vendedor, admin_empresa
    """
    serializer_class = NITEmpresaSerializer
    permission_classes = [IsAuthenticated]
    
    def check_permissions(self, request):
        """
        Verifica que el usuario tenga rol 'vendedor' o 'admin_empresa'
        """
        super().check_permissions(request)
        
        if not request.user.rol or request.user.rol.rol not in ['vendedor', 'admin_empresa']:
            self.permission_denied(
                request,
                message="Solo vendedores y administradores de empresa pueden registrar clientes",
                code=status.HTTP_403_FORBIDDEN
            )
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Registra un cliente existente en la empresa usando su NIT
        """
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            logger.info(f"Registro de cliente por NIT iniciado por: {request.user.email} (rol: {request.user.rol.rol})")
            
            # 1. Obtener datos validados
            nit_cliente = serializer.validated_data['nit']
            
            # 2. Obtener información del usuario que realiza la operación
            user = request.user
            
            # 3. Verificar que el usuario sea usuario_empresa
            try:
                usuario_empresa = Usuario_Empresa.objects.get(
                    id_usuario=user,
                    estado='activo'
                )
                empresa = usuario_empresa.empresa
                logger.info(f"Usuario {user.email} pertenece a empresa {empresa.nombre}")
            except Usuario_Empresa.DoesNotExist:
                return Response(
                    {
                        'error': 'Usuario sin empresa',
                        'detail': 'No tienes una empresa asignada o tu cuenta no está activa',
                        'status': 'error'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 4. Verificar estado de la empresa
            if empresa.estado != 'activo':
                return Response(
                    {
                        'error': 'Empresa inactiva',
                        'detail': 'La empresa no está activa',
                        'status': 'error'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 5. Obtener el cliente por NIT
            try:
                cliente = Cliente.objects.get(nit=nit_cliente)
                logger.info(f"Cliente encontrado: {cliente.nombre_cliente} (NIT: {cliente.nit})")
            except Cliente.DoesNotExist:
                return Response(
                    {
                        'error': 'Cliente no encontrado',
                        'detail': f'No existe un cliente con NIT: {nit_cliente}',
                        'status': 'error'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # 6. Verificar que el cliente no esté ya registrado en esta empresa
            relacion_existente = Tiene.objects.filter(
                id_cliente=cliente, 
                id_empresa=empresa
            ).first()
            
            if relacion_existente:
                if relacion_existente.estado == 'activo':
                    return Response(
                        {
                            'error': 'Cliente ya registrado',
                            'detail': f'El cliente {cliente.nombre_cliente} ya está registrado en {empresa.nombre}',
                            'status': 'error',
                            'relacion_existente': {
                                'estado': relacion_existente.estado,
                                'fecha_registro': relacion_existente.fecha_registro.isoformat()
                            }
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                else:
                    # Si existe pero está inactivo, reactivarlo
                    relacion_existente.estado = 'activo'
                    relacion_existente.fecha_registro = timezone.now()
                    relacion_existente.save()
                    tiene_relacion = relacion_existente
                    accion = 'reactivado'
                    logger.info(f"Relación reactivada para cliente {cliente.nombre_cliente}")
            else:
                # 7. Crear nueva relación en tabla 'tiene'
                tiene_relacion = Tiene.objects.create(
                    id_cliente=cliente,
                    id_empresa=empresa,
                    estado='activo',
                    fecha_registro=timezone.now()
                )
                accion = 'registrado'
                logger.info(f"Nueva relación creada para cliente {cliente.nombre_cliente}")
            
            # 8. Registrar auditoría
            try:
                auditoria_data = {
                    'cliente_id': cliente.id_usuario.id_usuario,
                    'cliente_nombre': cliente.nombre_cliente,
                    'cliente_nit': cliente.nit,
                    'cliente_email': cliente.id_usuario.email,
                    'accion': 'ACTUALIZADO',  # O 'CREADO' según sea el caso
                    'detalles': {
                        'accion': accion,
                        'cliente': {
                            'nombre': cliente.nombre_cliente,
                            'nit': cliente.nit,
                            'email': cliente.id_usuario.email
                        },
                        'empresa': {
                            'id': empresa.id_empresa,
                            'nombre': empresa.nombre
                        },
                        'registrado_por': {
                            'email': user.email,
                            'rol': user.rol.rol
                        }
                    },
                    'usuario': user,
                    'ip_address': request.META.get('REMOTE_ADDR', ''),
                    'user_agent': request.META.get('HTTP_USER_AGENT', '')
                }
                
                # Si ya existe el modelo AuditoriaCliente
                AuditoriaCliente.objects.create(**auditoria_data)
            except Exception as e:
                logger.error(f"Error registrando auditoría: {str(e)}")
                # Continuar aunque falle la auditoría
            
            # 9. Preparar respuesta
            response_data = {
                'message': f'Cliente {accion} exitosamente',
                'detail': f'{cliente.nombre_cliente} ahora es cliente de {empresa.nombre}',
                'cliente': {
                    'nit': cliente.nit,
                    'nombre_cliente': cliente.nombre_cliente,
                    'email': cliente.id_usuario.email,
                    'direccion_cliente': cliente.direccion_cliente,
                    'telefono_cliente': cliente.telefono_cliente,
                    'fecha_registro_cliente': cliente.fecha_registro.isoformat()
                },
                'empresa': {
                    'id': empresa.id_empresa,
                    'nombre': empresa.nombre,
                    'nit': empresa.nit,
                    'rubro': empresa.rubro
                },
                'relacion': {
                    'estado': tiene_relacion.estado,
                    'fecha_registro': tiene_relacion.fecha_registro.isoformat(),
                    'accion_realizada': accion
                },
                'registrado_por': {
                    'email': user.email,
                    'rol': user.rol.rol,
                    'empresa': empresa.nombre
                },
                'status': 'success'
            }
            
            logger.info(f"Cliente {cliente.nombre_cliente} {accion} en empresa {empresa.nombre} por {user.email}")
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except serializer.ValidationError as e:
            logger.warning(f"Error de validación: {str(e)}")
            return Response(
                {
                    'error': 'Datos inválidos',
                    'detail': str(e),
                    'status': 'error'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error registrando cliente por NIT: {str(e)}", exc_info=True)
            return Response(
                {
                    'error': 'Error en el registro del cliente',
                    'detail': 'Ocurrió un error interno al procesar la solicitud',
                    'status': 'error'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
    Solo accesible por rol 'admin', 'vendedor', 'admin_empresa'
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
        
        if self.request.user.rol.rol not in ['admin','vendedor','admin_empresa']:
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
        
        if self.request.user.rol.rol not in ['admin','vendedor','admin_empresa']:
            return Response(
                {"error": "Solo los administradores pueden ver todos los clientes"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Llamar al método original
        return super().list(request, *args, **kwargs)
    
# cliente/views.py
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Cliente
from .serializers import ClienteSerializer
from usuario_empresa.models import Usuario_Empresa
from relacion_tiene.models import Tiene
from django.db.models import Q
import logging

logger = logging.getLogger(__name__)

# cliente/views.py
class ClientePorNITView(generics.RetrieveAPIView):
    """
    Vista para obtener un cliente por su NIT.
    Solo accesible para vendedores o admin_empresa de la misma empresa.
    """
    serializer_class = ClienteSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'nit'
    
    def get_permissions(self):
        """Permisos personalizados"""
        permission_classes = [permissions.IsAuthenticated]
        
        # Verificar que sea usuario_empresa con rol vendedor o admin_empresa
        user = self.request.user
        
        if not hasattr(user, 'rol'):
            return [permissions.IsAuthenticated()]
        
        # Verificar que tenga rol válido
        if user.rol.rol not in ['vendedor', 'admin_empresa']:
            return [permissions.IsAuthenticated()]  # Se manejará en get_object
        
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """
        Retorna el queryset filtrado por empresa del usuario autenticado
        """
        user = self.request.user
        
        # 1. Verificar que el usuario sea usuario_empresa
        try:
            usuario_empresa = Usuario_Empresa.objects.get(id_usuario=user)
        except Usuario_Empresa.DoesNotExist:
            logger.warning(f"Usuario {user.email} no es usuario_empresa")
            return Cliente.objects.none()
        
        # 2. Verificar rol
        if user.rol.rol not in ['vendedor', 'admin_empresa']:
            logger.warning(f"Usuario {user.email} no tiene rol válido (rol actual: {user.rol.rol})")
            return Cliente.objects.none()
        
        # 3. Obtener clientes de la misma empresa
        empresa = usuario_empresa.empresa
        
        # Obtener IDs de clientes relacionados con la empresa
        clientes_empresa_ids = Tiene.objects.filter(
            id_empresa=empresa,
            estado='activo'
        ).values_list('id_cliente_id', flat=True)
        
        # Retornar clientes de la empresa
        return Cliente.objects.filter(
            id_usuario_id__in=clientes_empresa_ids
        ).select_related('id_usuario')
    
    def get_object(self):
        """
        Obtiene el cliente por NIT y verifica permisos
        """
        nit = self.kwargs.get('nit')  # Definir la variable nit aquí
        
        # 1. Verificar que el usuario sea usuario_empresa
        try:
            usuario_empresa = Usuario_Empresa.objects.get(id_usuario=self.request.user)
        except Usuario_Empresa.DoesNotExist:
            return Response({
                'error': 'No autorizado',
                'detail': 'Solo usuarios empresa pueden acceder a esta información'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # 2. Verificar rol
        if self.request.user.rol.rol not in ['vendedor', 'admin_empresa']:
            return Response({
                'error': 'No autorizado',
                'detail': 'Solo vendedores y administradores de empresa pueden ver clientes'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # 3. Buscar cliente por NIT
        try:
            cliente = Cliente.objects.get(nit=nit)
        except Cliente.DoesNotExist:
            return Response({
                'error': 'Cliente no encontrado',
                'detail': f'No existe un cliente con NIT: {nit}'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 4. Verificar que el cliente pertenezca a la misma empresa
        empresa = usuario_empresa.empresa
        
        try:
            relacion = Tiene.objects.get(
                id_cliente=cliente,
                id_empresa=empresa,
                estado='activo'
            )
        except Tiene.DoesNotExist:
            logger.warning(f"Cliente {cliente.nit} no pertenece a empresa {empresa.nombre}")
            return Response({
                'error': 'No autorizado',
                'detail': 'El cliente no pertenece a tu empresa'
            }, status=status.HTTP_403_FORBIDDEN)
        
        return cliente
    
    def retrieve(self, request, *args, **kwargs):
        """
        Manejo personalizado de la respuesta
        """
        try:
            nit = self.kwargs.get('nit')  # Obtener el NIT aquí también
            cliente = self.get_object()
            
            # Si get_object retorna Response (error), lo devolvemos
            if isinstance(cliente, Response):
                return cliente
            
            serializer = self.get_serializer(cliente)
            
            # Obtener información de la empresa actual
            usuario_empresa = Usuario_Empresa.objects.get(id_usuario=request.user)
            empresa = usuario_empresa.empresa
            
            # Obtener relación específica
            relacion = Tiene.objects.get(
                id_cliente=cliente,
                id_empresa=empresa,
                estado='activo'
            )
            
            response_data = serializer.data
            response_data['relacion_empresa'] = {
                'empresa_id': empresa.id_empresa,
                'empresa_nombre': empresa.nombre,
                'estado_relacion': relacion.estado,
                'fecha_registro_empresa': relacion.fecha_registro.isoformat()
            }
            
            logger.info(f"Cliente obtenido por NIT: {nit} por usuario: {request.user.email}")
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Error obteniendo cliente por NIT: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error interno del servidor',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)