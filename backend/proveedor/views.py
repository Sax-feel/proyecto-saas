from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Proveedor
from .serializers import ProveedorSerializer, ProveedorCreateSerializer

class ProveedorPublicCreateView(generics.CreateAPIView):
    """
    Vista para registrar proveedor (accesible sin autenticación)
    """
    serializer_class = ProveedorCreateSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        proveedor = serializer.save()
        
        return Response({
            'status': 'success',
            'message': 'Proveedor registrado exitosamente',
            'data': {
                'id_proveedor': proveedor.id_proveedor,
                'nombre': proveedor.nombre,
                'telefono': proveedor.telefono,
                'email': proveedor.email
            }
        }, status=status.HTTP_201_CREATED)

class ProveedorPublicListView(generics.ListAPIView):
    """
    Vista para listar proveedores públicos
    """
    serializer_class = ProveedorSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'email', 'telefono', 'direccion']
    ordering_fields = ['nombre', 'fecha_creacion']
    filterset_fields = []  # No hay campos específicos para filtrar
    
    def get_queryset(self):
        queryset = Proveedor.objects.all()
        
        # Aplicar filtros manuales si es necesario
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
        queryset = self.filter_queryset(self.get_queryset())
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                'status': 'success',
                'cantidad_proveedores': queryset.count(),
                'results': serializer.data
            })
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'status': 'success',
            'cantidad_proveedores': queryset.count(),
            'proveedores': serializer.data
        })

class ProveedorDetailView(generics.RetrieveAPIView):
    """
    Vista para ver detalle de proveedor (GET para cualquiera)
    """
    serializer_class = ProveedorSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Proveedor.objects.all()
    lookup_field = 'id_proveedor'
    
    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            
            return Response({
                'status': 'success',
                'proveedor': serializer.data
            })
        except Proveedor.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Proveedor no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)

class ProveedorUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vista para actualizar y eliminar proveedor (solo admin_empresa)
    Si necesitas que estas operaciones requieran autenticación
    """
    serializer_class = ProveedorSerializer
    permission_classes = [permissions.IsAuthenticated]  # Requiere autenticación
    queryset = Proveedor.objects.all()
    lookup_field = 'id_proveedor'
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'status': 'success',
            'message': 'Proveedor actualizado exitosamente',
            'data': serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            'status': 'success',
            'message': 'Proveedor eliminado exitosamente'
        }, status=status.HTTP_204_NO_CONTENT)

class ProveedorStatsView(generics.GenericAPIView):
    """
    Vista para estadísticas de proveedores
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        stats = {
            'total_proveedores': Proveedor.objects.count(),
            'proveedores_recientes': Proveedor.objects.filter(
                fecha_creacion__gte='2024-01-01'  # Ajusta la fecha según necesites
            ).count(),
            'proveedores_por_letra': self._get_proveedores_por_letra()
        }
        
        return Response({
            'status': 'success',
            'data': stats
        })
    
    def _get_proveedores_por_letra(self):
        """Obtener cantidad de proveedores por letra inicial"""
        from django.db.models.functions import Upper, Substr
        from django.db.models import Count
        
        proveedores_por_letra = Proveedor.objects.annotate(
            primera_letra=Upper(Substr('nombre', 1, 1))
        ).values('primera_letra').annotate(
            cantidad=Count('id_proveedor')
        ).order_by('primera_letra')
        
        return {item['primera_letra']: item['cantidad'] for item in proveedores_por_letra}