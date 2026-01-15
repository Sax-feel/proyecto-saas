# usuarios/views.py
from django.utils import timezone
from rest_framework import generics, status, permissions, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models.deletion import ProtectedError
from .models import User
from .serializers import UserSerializer, PerfilUsuarioSerializer
from roles.models import Rol
import logging

logger = logging.getLogger(__name__)


# usuarios/views.py
class ListaUsuariosView(generics.ListAPIView):
    """
    Vista para listar TODOS los usuarios del sistema
    Solo accesible por usuarios con rol 'admin'
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['email', 'estado']
    ordering_fields = ['id_usuario', 'email', 'fecha_creacion']
    ordering = ['id_usuario']
    
    def check_permissions(self, request):
        """
        Verifica que el usuario tenga rol 'admin'
        """
        super().check_permissions(request)
        
        if not request.user.rol or request.user.rol.rol != 'admin':
            self.permission_denied(
                request,
                message="Solo administradores pueden ver todos los usuarios",
                code=status.HTTP_403_FORBIDDEN
            )
    
    def get_queryset(self):
        """
        Retorna todos los usuarios con información relacionada optimizada
        """
        # Optimización: select_related para rol, prefetch para relaciones
        return User.objects.select_related('rol').all()
    
    def list(self, request, *args, **kwargs):
        """
        Sobrescribir para agregar estadísticas
        """
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            # Paginación opcional
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response({
                    'usuarios': serializer.data,
                    'estadisticas': self._obtener_estadisticas(queryset),
                    'status': 'success'
                })
            
            serializer = self.get_serializer(queryset, many=True)
            
            return Response({
                'usuarios': serializer.data,
                'estadisticas': self._obtener_estadisticas(queryset),
                'total': queryset.count(),
                'status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Error listando usuarios: {str(e)}", exc_info=True)
            return Response(
                {
                    'error': 'Error al listar usuarios',
                    'detail': str(e),
                    'status': 'error'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _obtener_estadisticas(self, queryset):
        """
        Obtiene estadísticas de usuarios
        """
        total = queryset.count()
        
        # Contar por rol
        usuarios_por_rol = {}
        usuarios_con_empresa_por_rol = {}
        
        for user in queryset:
            rol_nombre = user.rol.rol if user.rol else 'sin_rol'
            usuarios_por_rol[rol_nombre] = usuarios_por_rol.get(rol_nombre, 0) + 1
            
            # Contar usuarios con empresa por rol
            serializer = self.get_serializer(user)
            empresas = serializer.data.get('empresas', [])
            if empresas:
                usuarios_con_empresa_por_rol[rol_nombre] = usuarios_con_empresa_por_rol.get(rol_nombre, 0) + 1
        
        # Contar por estado
        usuarios_por_estado = {}
        for user in queryset:
            estado = user.estado
            usuarios_por_estado[estado] = usuarios_por_estado.get(estado, 0) + 1
        
        return {
            'total_usuarios': total,
            'por_rol': usuarios_por_rol,
            'con_empresa_por_rol': usuarios_con_empresa_por_rol,
            'por_estado': usuarios_por_estado,
            'ultima_actualizacion': timezone.now().isoformat()
        }


class DetalleUsuarioCompletoView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vista para ver, actualizar o eliminar cualquier usuario
    Solo accesible por administradores
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    queryset = User.objects.all()
    lookup_field = 'id_usuario'
    
    def check_permissions(self, request):
        """
        Verifica que el usuario tenga rol 'admin'
        """
        super().check_permissions(request)
        
        if not request.user.rol or request.user.rol.rol != 'admin':
            self.permission_denied(
                request,
                message="Solo administradores pueden ver detalles de usuarios",
                code=status.HTTP_403_FORBIDDEN
            )
    
    def retrieve(self, request, *args, **kwargs):
        """
        Obtiene detalles completos de un usuario
        """
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            
            # Obtener información adicional según el rol
            informacion_adicional = self._obtener_informacion_adicional(instance)
            
            return Response({
                'usuario': serializer.data,
                'informacion_adicional': informacion_adicional,
                'status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Error obteniendo usuario: {str(e)}", exc_info=True)
            return Response(
                {
                    'error': 'Error al obtener usuario',
                    'detail': str(e),
                    'status': 'error'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, *args, **kwargs):
        """
        Actualiza un usuario (solo admin)
        """
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            
            # Guardar cambios
            self.perform_update(serializer)
            
            logger.info(f"Usuario {instance.email} actualizado por admin {request.user.email}")
            
            return Response({
                'message': 'Usuario actualizado exitosamente',
                'usuario': serializer.data,
                'status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Error actualizando usuario: {str(e)}", exc_info=True)
            return Response(
                {
                    'error': 'Error al actualizar usuario',
                    'detail': str(e),
                    'status': 'error'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        """
        Elimina físicamente un usuario de la base de datos
        """
        try:
            instance = self.get_object()
        
        # No permitir eliminarse a sí mismo
            if instance.id_usuario == request.user.id_usuario:
                return Response(
                    {
                        'error': 'Acción no permitida',
                        'detail': 'No puedes eliminar tu propia cuenta',
                        'status': 'error'
                    },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Guardar información del usuario antes de eliminarlo
            usuario_info = {
                'id': instance.id_usuario,
                'email': instance.email,
                'rol': instance.rol.rol if instance.rol else 'sin_rol',
                'fecha_creacion': instance.fecha_creacion,
                'estado': instance.estado
            }
        
        # Eliminar el usuario físicamente de la base de datos
            instance.delete()
        
            logger.info(f"Usuario {usuario_info['email']} eliminado físicamente por admin {request.user.email}")
        
            return Response({
                'message': 'Usuario eliminado exitosamente de la base de datos',
                'usuario_eliminado': usuario_info,
                'status': 'success'
            }, status=status.HTTP_200_OK)
        
        except ProtectedError as e:
            # Manejar error de integridad referencial
            logger.error(f"Error de integridad al eliminar usuario: {str(e)}", exc_info=True)
            return Response(
                {
                    'error': 'No se puede eliminar el usuario',
                    'detail': 'El usuario tiene registros relacionados (empresa, suscripciones, etc.)',
                    'sugerencia': 'Elimina primero los registros asociados o cambia el estado a inactivo',
                    'status': 'error'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error eliminando usuario: {str(e)}", exc_info=True)
            return Response(
                {
                    'error': 'Error al eliminar usuario',
                    'detail': str(e),
                    'status': 'error'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _obtener_informacion_adicional(self, usuario):
        """
        Obtiene información adicional según el rol del usuario
        """
        informacion = {}
        rol_nombre = usuario.rol.rol if usuario.rol else None
        
        if rol_nombre == 'cliente':
            try:
                from cliente.models import Cliente
                cliente = Cliente.objects.get(id_usuario=usuario)
                informacion['cliente'] = {
                    'nit': cliente.nit,
                    'nombre': cliente.nombre_cliente,
                    'telefono': cliente.telefono_cliente,
                    'direccion': cliente.direccion_cliente
                }
            except Exception:
                informacion['cliente'] = None
        
        elif rol_nombre == 'admin':
            try:
                from admins.models import Admin
                admin = Admin.objects.get(id_usuario=usuario)
                informacion['admin'] = {
                    'nombre': admin.nombre_admin,
                    'telefono': admin.telefono_admin
                }
            except Exception:
                informacion['admin'] = None
        
        elif rol_nombre == 'admin_empresa' or rol_nombre == 'vendedor':
            try:
                from usuario_empresa.models import Usuario_Empresa
                usuario_empresa = Usuario_Empresa.objects.get(id_usuario=usuario)
                empresa = usuario_empresa.empresa_id
                
                informacion['empresa'] = {
                    'id': empresa.id_empresa,
                    'nombre': empresa.nombre,
                    'nit': empresa.nit,
                    'estado': empresa.estado
                }
                
                informacion['usuario_empresa'] = {
                    'estado': usuario_empresa.estado,
                    'fecha_modificacion': usuario_empresa.fecha_modificacion
                }
            except Exception:
                informacion['empresa'] = None
                informacion['usuario_empresa'] = None
        
        return informacion


class BuscarUsuariosView(generics.ListAPIView):
    """
    Vista para buscar usuarios por diferentes criterios
    Solo accesible por administradores
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def check_permissions(self, request):
        super().check_permissions(request)
        if not request.user.rol or request.user.rol.rol != 'admin':
            self.permission_denied(
                request,
                message="Solo administradores pueden buscar usuarios",
                code=status.HTTP_403_FORBIDDEN
            )
    
    def get_queryset(self):
        queryset = User.objects.select_related('rol').all()
        
        # Filtros por parámetros GET
        email = self.request.query_params.get('email', None)
        rol = self.request.query_params.get('rol', None)
        estado = self.request.query_params.get('estado', None)
        
        if email:
            queryset = queryset.filter(email__icontains=email)
        
        if rol:
            queryset = queryset.filter(rol__rol=rol)
        
        if estado:
            queryset = queryset.filter(estado=estado)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        return Response({
            'resultados': self.get_serializer(queryset, many=True).data,
            'total_resultados': queryset.count(),
            'parametros_busqueda': {
                'email': request.query_params.get('email'),
                'rol': request.query_params.get('rol'),
                'estado': request.query_params.get('estado')
            },
            'status': 'success'
        })