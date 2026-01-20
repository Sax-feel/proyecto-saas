from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from .models import Archivo
from .serializers import ArchivoSerializer, ArchivoCreateSerializer, ArchivoPublicSerializer
from categoria.views import IsAdminEmpresa

class IsAdminEmpresaOrReadOnly(permissions.BasePermission):
    """
    Permiso personalizado para admin_empresa en escritura, lectura para cualquiera
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
        
        # Para otros métodos, verificar que el archivo pertenezca a la empresa del admin
        empresa_usuario = request.user.usuario_empresa.empresa
        return obj.producto.empresa == empresa_usuario

class ArchivoCreateView(generics.CreateAPIView):
    """
    Vista para crear archivo (solo admin_empresa)
    """
    serializer_class = ArchivoCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminEmpresa]
    parser_classes = [MultiPartParser, FormParser]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        archivo = serializer.save()
        
        return Response({
            'status': 'success',
            'message': 'Archivo subido exitosamente',
            'data': ArchivoSerializer(archivo).data
        }, status=status.HTTP_201_CREATED)

class ArchivoListView(generics.ListAPIView):
    """
    Vista para listar archivos (GET para cualquiera)
    """
    serializer_class = ArchivoPublicSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'descripcion', 'producto__nombre']
    ordering_fields = ['nombre', 'fecha_creacion', 'orden']
    filterset_fields = ['tipo_archivo', 'producto']
    
    def get_queryset(self):
        # Solo archivos de productos de empresas activas
        return Archivo.objects.filter(
            producto__empresa__estado='activo'
        ).select_related('producto__empresa')

class ArchivoDetailView(generics.RetrieveAPIView):
    """
    Vista para ver detalle de archivo (GET para cualquiera)
    """
    serializer_class = ArchivoPublicSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return Archivo.objects.filter(
            producto__empresa__estado='activo'
        ).select_related('producto__empresa')

class ArchivoUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vista para actualizar y eliminar archivo (solo admin_empresa)
    """
    serializer_class = ArchivoSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminEmpresa]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        # Solo archivos de la empresa del admin
        empresa = self.request.user.usuario_empresa.empresa
        return Archivo.objects.filter(
            producto__empresa=empresa
        ).select_related('producto')
    
    def perform_destroy(self, instance):
        # Eliminar el archivo físico del servidor
        if instance.archivo:
            instance.archivo.delete()
        instance.delete()
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'status': 'success',
            'message': 'Archivo actualizado exitosamente',
            'data': serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            'status': 'success',
            'message': 'Archivo eliminado exitosamente'
        }, status=status.HTTP_204_NO_CONTENT)

class ArchivoPorProductoView(generics.ListAPIView):
    """
    Vista para obtener archivos por producto (GET para cualquiera)
    """
    serializer_class = ArchivoPublicSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        producto_id = self.kwargs['producto_id']
        
        return Archivo.objects.filter(
            producto_id=producto_id,
            producto__empresa__estado='activo'
        ).select_related('producto__empresa').order_by('orden')
    
