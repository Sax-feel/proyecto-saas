from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from .models import Categoria
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