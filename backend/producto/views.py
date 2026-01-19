from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from .models import Producto
from .serializers import ProductoSerializer, ProductoCreateSerializer, ProductoPublicSerializer
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
        
        # Para otros métodos, verificar que el producto pertenezca a la empresa del admin
        empresa_usuario = request.user.usuario_empresa.empresa
        return obj.empresa == empresa_usuario

class ProductoCreateView(generics.CreateAPIView):
    """
    Vista para crear producto (solo admin_empresa)
    """
    serializer_class = ProductoCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminEmpresa]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Obtener la empresa del usuario admin_empresa
        empresa = request.user.usuario_empresa.empresa
        producto = serializer.save(empresa=empresa)
        
        return Response({
            'status': 'success',
            'message': 'Producto creado exitosamente',
            'data': ProductoSerializer(producto).data
        }, status=status.HTTP_201_CREATED)

class ProductoListView(generics.ListAPIView):
    """
    Vista para listar productos (GET para cualquiera)
    """
    serializer_class = ProductoPublicSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre', 'precio', 'stock_actual', 'fecha_creacion']
    filterset_fields = ['estado', 'categoria', 'proveedor', 'empresa']
    
    def get_queryset(self):
        # Solo productos de empresas activas
        queryset = Producto.objects.filter(
            empresa__estado='activo',
            estado='activo'
        ).select_related('categoria', 'proveedor', 'empresa')
        
        # Filtros adicionales
        precio_min = self.request.query_params.get('precio_min')
        precio_max = self.request.query_params.get('precio_max')
        
        if precio_min:
            queryset = queryset.filter(precio__gte=precio_min)
        if precio_max:
            queryset = queryset.filter(precio__lte=precio_max)
        
        return queryset

class ProductoDetailView(generics.RetrieveAPIView):
    """
    Vista para ver detalle de producto (GET para cualquiera)
    """
    serializer_class = ProductoPublicSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        return Producto.objects.filter(
            empresa__estado='activo',
            estado='activo'
        ).select_related('categoria', 'proveedor', 'empresa')

class ProductoUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vista para actualizar y eliminar producto (solo admin_empresa)
    """
    serializer_class = ProductoSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminEmpresa]
    
    def get_queryset(self):
        # Solo productos de la empresa del admin
        empresa = self.request.user.usuario_empresa.empresa
        return Producto.objects.filter(empresa=empresa).select_related('categoria', 'proveedor')
    
    def perform_update(self, serializer):
        # Mantener la empresa original
        empresa = self.request.user.usuario_empresa.empresa
        serializer.save(empresa=empresa)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'status': 'success',
            'message': 'Producto actualizado exitosamente',
            'data': serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            'status': 'success',
            'message': 'Producto eliminado exitosamente'
        }, status=status.HTTP_204_NO_CONTENT)

class ProductoStatsView(generics.GenericAPIView):
    """
    Vista para estadísticas de productos (solo admin_empresa)
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminEmpresa]
    
    def get(self, request):
        empresa = request.user.usuario_empresa.empresa
        productos = Producto.objects.filter(empresa=empresa)
        
        stats = {
            'total_productos': productos.count(),
            'productos_activos': productos.filter(estado='activo').count(),
            'productos_agotados': productos.filter(stock_actual__lte=0).count(),
            'productos_reponer': productos.filter(
                stock_actual__lte=models.F('stock_minimo'),
                stock_actual__gt=0
            ).count(),
            'valor_total_inventario': sum(p.precio * p.stock_actual for p in productos if p.precio and p.stock_actual),
            'categorias_diferentes': productos.values('categoria').distinct().count(),
        }
        
        return Response({
            'status': 'success',
            'data': stats
        })