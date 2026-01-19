from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
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
                'empresa': proveedor.empresa.nombre
            }
        }, status=status.HTTP_201_CREATED)

class ProveedorPublicListView(generics.ListAPIView):
    """
    Vista para listar proveedores públicos
    """
    serializer_class = ProveedorSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        # Filtrar por empresa si se proporciona
        empresa_id = self.request.query_params.get('empresa_id')
        if empresa_id:
            return Proveedor.objects.filter(empresa_id=empresa_id, empresa__estado='activo')
        return Proveedor.objects.filter(empresa__estado='activo')