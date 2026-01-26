from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from .models import Proveedor
from .serializers import ProveedorSerializer, ProveedorCreateSerializer
import logging

logger = logging.getLogger(__name__)

# Permiso personalizado para admin_empresa y admin
class AdminEmpresaAdminPermission(permissions.BasePermission):
    """
    Permiso que verifica que el usuario sea admin_empresa o admin
    """
    
    def has_permission(self, request, view):
        # Verificar que el usuario esté autenticado
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Verificar que tenga rol
        if not hasattr(request.user, 'rol'):
            return False
        
        # Verificar que sea admin_empresa O admin
        user_role = request.user.rol.rol
        return user_role in ['admin_empresa', 'admin', 'vendedor']

class ProveedorCreateView(generics.CreateAPIView):
    """
    Vista para registrar proveedor (solo admin_empresa, admin y vendedor)
    """
    serializer_class = ProveedorCreateSerializer
    permission_classes = [IsAuthenticated, AdminEmpresaAdminPermission]
    
    def create(self, request, *args, **kwargs):
        try:
            logger.info(f"Intento de crear proveedor por usuario: {request.user.email}")
            
            # Obtener información del usuario que está creando
            usuario_creador = {
                'id': request.user.id_usuario,
                'email': request.user.email,
                'rol': request.user.rol.rol
            }
            
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            proveedor = serializer.save()
            
            logger.info(f"Proveedor creado exitosamente: {proveedor.nombre} por {request.user.email}")
            
            return Response({
                'status': 'success',
                'message': 'Proveedor registrado exitosamente',
                'data': {
                    'id_proveedor': proveedor.id_proveedor,
                    'nombre': proveedor.nombre,
                    'telefono': proveedor.telefono,
                    'email': proveedor.email,
                    'direccion': proveedor.direccion,
                    'fecha_creacion': proveedor.fecha_creacion
                },
                'creado_por': usuario_creador
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error al crear proveedor: {str(e)}")
            return Response({
                'status': 'error',
                'error': 'Error al crear proveedor',
                'detail': str(e),
                'message': 'No se pudo registrar el proveedor'
            }, status=status.HTTP_400_BAD_REQUEST)

class ProveedorListView(generics.ListAPIView):
    """
    Vista para listar proveedores (solo admin_empresa, admin y vendedor)
    """
    serializer_class = ProveedorSerializer
    permission_classes = [IsAuthenticated, AdminEmpresaAdminPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'email', 'telefono', 'direccion']
    ordering_fields = ['nombre', 'fecha_creacion']
    
    def get_queryset(self):
        queryset = Proveedor.objects.all()
        
        # Aplicar filtros manuales
        nombre = self.request.query_params.get('nombre', '')
        if nombre:
            queryset = queryset.filter(nombre__icontains=nombre)
            
        email = self.request.query_params.get('email', '')
        if email:
            queryset = queryset.filter(email__icontains=email)
            
        return queryset
    
    def list(self, request, *args, **kwargs):
        """
        Sobrescribir para personalizar la respuesta
        """
        try:
            logger.info(f"Listando proveedores por usuario: {request.user.email}")
            
            usuario_solicitante = {
                'id': request.user.id_usuario,
                'email': request.user.email,
                'rol': request.user.rol.rol
            }
            
            queryset = self.filter_queryset(self.get_queryset())
            
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response({
                    'status': 'success',
                    'cantidad_proveedores': queryset.count(),
                    'solicitado_por': usuario_solicitante,
                    'results': serializer.data
                })
            
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'status': 'success',
                'cantidad_proveedores': queryset.count(),
                'solicitado_por': usuario_solicitante,
                'proveedores': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error al listar proveedores: {str(e)}")
            return Response({
                'status': 'error',
                'error': 'Error al listar proveedores',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProveedorDetailView(generics.RetrieveAPIView):
    """
    Vista para ver detalle de proveedor (solo admin_empresa y admin)
    """
    serializer_class = ProveedorSerializer
    permission_classes = [IsAuthenticated, AdminEmpresaAdminPermission]
    queryset = Proveedor.objects.all()
    lookup_field = 'id_proveedor'
    
    def retrieve(self, request, *args, **kwargs):
        try:
            logger.info(f"Consultando detalle de proveedor por usuario: {request.user.email}")
            
            usuario_solicitante = {
                'id': request.user.id_usuario,
                'email': request.user.email,
                'rol': request.user.rol.rol
            }
            
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            
            return Response({
                'status': 'success',
                'solicitado_por': usuario_solicitante,
                'proveedor': serializer.data
            })
            
        except Proveedor.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Proveedor no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error al obtener detalle de proveedor: {str(e)}")
            return Response({
                'status': 'error',
                'error': 'Error al obtener proveedor',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProveedorUpdateView(generics.UpdateAPIView):
    """
    Vista para actualizar proveedor (solo admin_empresa y admin)
    """
    serializer_class = ProveedorSerializer
    permission_classes = [IsAuthenticated, AdminEmpresaAdminPermission]
    queryset = Proveedor.objects.all()
    lookup_field = 'id_proveedor'
    
    def update(self, request, *args, **kwargs):
        try:
            logger.info(f"Actualizando proveedor por usuario: {request.user.email}")
            
            usuario_actualizador = {
                'id': request.user.id_usuario,
                'email': request.user.email,
                'rol': request.user.rol.rol
            }
            
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            
            # Guardar datos anteriores para registro
            datos_anteriores = {
                'nombre': instance.nombre,
                'telefono': instance.telefono,
                'email': instance.email,
                'direccion': instance.direccion
            }
            
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            logger.info(f"Proveedor actualizado: {instance.nombre}")
            
            return Response({
                'status': 'success',
                'message': 'Proveedor actualizado exitosamente',
                'actualizado_por': usuario_actualizador,
                'datos_anteriores': datos_anteriores,
                'datos_nuevos': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error al actualizar proveedor: {str(e)}")
            return Response({
                'status': 'error',
                'error': 'Error al actualizar proveedor',
                'detail': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class ProveedorDeleteView(generics.DestroyAPIView):
    """
    Vista para eliminar proveedor (solo admin_empresa y admin)
    """
    serializer_class = ProveedorSerializer
    permission_classes = [IsAuthenticated, AdminEmpresaAdminPermission]
    queryset = Proveedor.objects.all()
    lookup_field = 'id_proveedor'
    
    def destroy(self, request, *args, **kwargs):
        try:
            logger.info(f"Eliminando proveedor por usuario: {request.user.email}")
            
            usuario_eliminador = {
                'id': request.user.id_usuario,
                'email': request.user.email,
                'rol': request.user.rol.rol
            }
            
            instance = self.get_object()
            
            # Guardar datos antes de eliminar
            datos_eliminados = {
                'id_proveedor': instance.id_proveedor,
                'nombre': instance.nombre,
                'telefono': instance.telefono,
                'email': instance.email,
                'direccion': instance.direccion,
                'fecha_creacion': instance.fecha_creacion
            }
            
            self.perform_destroy(instance)
            
            logger.info(f"Proveedor eliminado: {datos_eliminados['nombre']}")
            
            return Response({
                'status': 'success',
                'message': 'Proveedor eliminado exitosamente',
                'eliminado_por': usuario_eliminador,
                'proveedor_eliminado': datos_eliminados
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error al eliminar proveedor: {str(e)}")
            return Response({
                'status': 'error',
                'error': 'Error al eliminar proveedor',
                'detail': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)