from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from .models import Categoria
from empresas.models import Empresa
from .serializers import CategoriaSerializer, CategoriaCreateSerializer

class IsAdminEmpresa(permissions.BasePermission):
    """
    Permiso personalizado para verificar que el usuario sea admin_empresa
    """
    def has_permission(self, request, view):
        # Para métodos GET, permitir a cualquiera
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Para otros métodos, verificar que sea admin_empresa
        if not request.user.is_authenticated:
            return False
        
        if not hasattr(request.user, 'rol') or request.user.rol.rol != 'admin_empresa':
            return False
        
        if not hasattr(request.user, 'usuario_empresa'):
            return False
        
        return True
    
    def has_object_permission(self, request, view, obj):
        # Para métodos GET, permitir a cualquiera
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Para otros métodos, verificar que el objeto pertenezca a la empresa del admin
        empresa_usuario = request.user.usuario_empresa.empresa
        return obj.empresa == empresa_usuario

class CategoriaCreateView(generics.CreateAPIView):
    """
    Vista para crear categoría (solo admin_empresa)
    """
    serializer_class = CategoriaCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminEmpresa]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Obtener la empresa del usuario admin_empresa
        empresa = request.user.usuario_empresa.empresa
        categoria = serializer.save(empresa=empresa)
        
        return Response({
            'status': 'success',
            'message': 'Categoría creada exitosamente',
            'data': CategoriaSerializer(categoria).data
        }, status=status.HTTP_201_CREATED)

class CategoriaListView(generics.ListAPIView):
    """
    Vista para listar categorías (GET para cualquiera)
    """
    serializer_class = CategoriaSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre', 'fecha_creacion']
    filterset_fields = ['estado', 'empresa']
    
    def get_queryset(self):
        # Solo categorías de empresas activas
        return Categoria.objects.filter(empresa__estado='activo').select_related('empresa')

class CategoriaDetailView(generics.RetrieveAPIView):
    """
    Vista para ver detalle de categoría (GET para cualquiera)
    """
    serializer_class = CategoriaSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Categoria.objects.filter(empresa__estado='activo')
    lookup_field = 'id_categoria'

class CategoriaUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vista para actualizar y eliminar categoría (solo admin_empresa)
    """
    serializer_class = CategoriaSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminEmpresa]
    lookup_field = 'id_categoria'
    
    def get_queryset(self):
        # Solo categorías de la empresa del admin
        empresa = self.request.user.usuario_empresa.empresa
        return Categoria.objects.filter(empresa=empresa)
    
    def perform_update(self, serializer):
        # Mantener la empresa original
        empresa = self.request.user.usuario_empresa.empresa
        serializer.save(empresa=empresa)
    
    def perform_destroy(self, instance):
        # Verificar que no haya productos asociados
        if instance.productos.exists():
            raise PermissionDenied({
                'status': 'error',
                'message': 'No se puede eliminar la categoría porque tiene productos asociados',
                'cantidad_productos': instance.productos.count()
            })
        instance.delete()
    
    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return Response({
                'status': 'success',
                'message': 'Categoría eliminada exitosamente'
            }, status=status.HTTP_204_NO_CONTENT)
        except PermissionDenied as e:
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)

class CategoriasPorEmpresaView(generics.ListAPIView):
    """
    Vista para obtener categorías de una empresa específica
    GET para cualquiera
    """
    serializer_class = CategoriaSerializer
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, id_empresa=None, *args, **kwargs):
        """
        Obtiene categorías de una empresa específica
        Se puede pasar id_empresa por URL o por query param
        """
        try:
            # Obtener ID de empresa de la URL o query params
            empresa_id = id_empresa or request.query_params.get('empresa_id')
            
            if not empresa_id:
                return Response({
                    'status': 'error',
                    'message': 'Se requiere el ID de la empresa',
                    'detail': 'Proporcione el parámetro empresa_id en la URL o query params'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verificar que la empresa exista y esté activa
            empresa = get_object_or_404(
                Empresa, 
                id_empresa=empresa_id,
                estado='activo'
            )
            
            # Obtener categorías de la empresa
            categorias = Categoria.objects.filter(
                empresa=empresa,
                estado='activo'
            ).select_related('empresa')
            
            # Aplicar filtros adicionales si existen
            nombre = request.query_params.get('nombre', '')
            if nombre:
                categorias = categorias.filter(nombre__icontains=nombre)
            
            serializer = self.get_serializer(categorias, many=True)
            
            return Response({
                'status': 'success',
                'empresa': {
                    'id_empresa': empresa.id_empresa,
                    'nombre': empresa.nombre,
                    'nit': empresa.nit
                },
                'cantidad_categorias': categorias.count(),
                'categorias': serializer.data
            })
            
        except Empresa.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Empresa no encontrada',
                'detail': f'No se encontró una empresa activa con ID {empresa_id}'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': 'Error al obtener categorías',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CategoriasPorEmpresaAdminView(generics.ListAPIView):
    """
    Vista para obtener categorías de la empresa del admin_empresa
    Solo para admin_empresa autenticado
    """
    serializer_class = CategoriaSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        """
        Obtiene categorías de la empresa del admin_empresa autenticado
        """
        try:
            # Verificar que el usuario sea admin_empresa
            if not hasattr(request.user, 'rol') or request.user.rol.rol != 'admin_empresa':
                return Response({
                    'status': 'error',
                    'message': 'Permiso denegado',
                    'detail': 'Solo los administradores de empresa pueden acceder a esta vista'
                }, status=status.HTTP_403_FORBIDDEN)
            
            if not hasattr(request.user, 'usuario_empresa'):
                return Response({
                    'status': 'error',
                    'message': 'Usuario sin empresa asignada',
                    'detail': 'El usuario no está asociado a ninguna empresa'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Obtener la empresa del admin_empresa
            empresa = request.user.usuario_empresa.empresa
            
            # Obtener categorías (pueden incluir inactivas para admin)
            categorias = Categoria.objects.filter(empresa=empresa).select_related('empresa')
            
            # Aplicar filtros si existen
            estado = request.query_params.get('estado', '')
            if estado:
                categorias = categorias.filter(estado=estado)
            
            nombre = request.query_params.get('nombre', '')
            if nombre:
                categorias = categorias.filter(nombre__icontains=nombre)
            
            serializer = self.get_serializer(categorias, many=True)
            
            return Response({
                'status': 'success',
                'empresa': {
                    'id_empresa': empresa.id_empresa,
                    'nombre': empresa.nombre,
                    'nit': empresa.nit,
                    'estado': empresa.estado
                },
                'cantidad_categorias': categorias.count(),
                'cantidad_activas': categorias.filter(estado='activo').count(),
                'categorias': serializer.data
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': 'Error al obtener categorías',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CategoriasPorEmpresaConEstadisticasView(generics.GenericAPIView):
    """
    Vista para obtener categorías de una empresa con estadísticas
    GET para cualquiera
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, id_empresa):
        """
        Obtiene categorías de una empresa con estadísticas de productos
        """
        try:
            # Verificar que la empresa exista y esté activa
            empresa = get_object_or_404(
                Empresa, 
                id_empresa=id_empresa,
                estado='activo'
            )
            
            # Obtener categorías activas de la empresa
            categorias = Categoria.objects.filter(
                empresa=empresa,
                estado='activo'
            ).select_related('empresa')
            
            # Preparar respuesta con estadísticas
            categorias_con_estadisticas = []
            
            for categoria in categorias:
                # Contar productos por categoría
                productos_count = categoria.productos.filter(estado='activo').count()
                
                categorias_con_estadisticas.append({
                    'id_categoria': categoria.id_categoria,
                    'nombre': categoria.nombre,
                    'descripcion': categoria.descripcion,
                    'estado': categoria.estado,
                    'fecha_creacion': categoria.fecha_creacion,
                    'empresa_nombre': categoria.empresa.nombre,
                    'estadisticas': {
                        'cantidad_productos': productos_count,
                        'productos_activos': productos_count,
                        'necesita_categorizacion': productos_count == 0
                    }
                })
            
            return Response({
                'status': 'success',
                'empresa': {
                    'id_empresa': empresa.id_empresa,
                    'nombre': empresa.nombre,
                    'nit': empresa.nit,
                    'rubro': empresa.rubro,
                    'cantidad_categorias': categorias.count()
                },
                'categorias': categorias_con_estadisticas,
                'totales': {
                    'categorias_activas': categorias.count(),
                    'productos_totales': sum(cat['estadisticas']['cantidad_productos'] for cat in categorias_con_estadisticas)
                }
            })
            
        except Empresa.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Empresa no encontrada',
                'detail': f'No se encontró una empresa activa con ID {id_empresa}'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': 'Error al obtener categorías',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)