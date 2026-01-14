from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from relacion_tiene.models import Tiene
from empresas.models import Empresa
from empresas.serializers import EmpresaSerializer
import logging

logger = logging.getLogger(__name__)

class EmpresasDisponiblesClienteView(generics.ListAPIView):
    """
    Vista para que un cliente vea empresas disponibles para registrarse
    (Empresas activas a las que NO está registrado)
    """
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]
    
    def check_permissions(self, request):
        """
        Solo clientes pueden acceder
        """
        super().check_permissions(request)
        
        if not request.user.rol or request.user.rol.rol != 'cliente':
            self.permission_denied(
                request,
                message="Solo clientes pueden ver empresas disponibles",
                code=status.HTTP_403_FORBIDDEN
            )
    
    def get_queryset(self):
        """
        Retorna empresas activas a las que el cliente NO está registrado
        """
        user = self.request.user
        
        try:
            from cliente.models import Cliente
            cliente = Cliente.objects.get(id_usuario=user)
            
            # Empresas donde el cliente YA está registrado
            empresas_registradas = Tiene.objects.filter(
                id_cliente=cliente
            ).values_list('id_empresa', flat=True)
            
            # Empresas activas NO registradas
            empresas_disponibles = Empresa.objects.filter(
                estado='activo'
            ).exclude(
                id_empresa__in=empresas_registradas
            )
            
            logger.info(f"Cliente {user.email} tiene {empresas_disponibles.count()} empresas disponibles")
            return empresas_disponibles
            
        except Exception as e:
            logger.error(f"Error obteniendo empresas disponibles: {str(e)}")
            return Empresa.objects.none()
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        return Response({
            'empresas_disponibles': self.get_serializer(queryset, many=True).data,
            'total_disponibles': queryset.count(),
            'status': 'success'
        })
    
class EmpresasDisponiblesClienteView(generics.ListAPIView):
    """
    Vista para que un cliente vea empresas disponibles para registrarse
    (Empresas activas a las que NO está registrado)
    """
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]
    
    def check_permissions(self, request):
        """
        Solo clientes pueden acceder
        """
        super().check_permissions(request)
        
        if not request.user.rol or request.user.rol.rol != 'cliente':
            self.permission_denied(
                request,
                message="Solo clientes pueden ver empresas disponibles",
                code=status.HTTP_403_FORBIDDEN
            )
    
    def get_queryset(self):
        """
        Retorna empresas activas a las que el cliente NO está registrado
        """
        user = self.request.user
        
        try:
            from cliente.models import Cliente
            cliente = Cliente.objects.get(id_usuario=user)
            
            # Empresas donde el cliente YA está registrado
            empresas_registradas = Tiene.objects.filter(
                id_cliente=cliente
            ).values_list('id_empresa', flat=True)
            
            # Empresas activas NO registradas
            empresas_disponibles = Empresa.objects.filter(
                estado='activo'
            ).exclude(
                id_empresa__in=empresas_registradas
            )
            
            logger.info(f"Cliente {user.email} tiene {empresas_disponibles.count()} empresas disponibles")
            return empresas_disponibles
            
        except Exception as e:
            logger.error(f"Error obteniendo empresas disponibles: {str(e)}")
            return Empresa.objects.none()
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        return Response({
            'empresas_disponibles': self.get_serializer(queryset, many=True).data,
            'total_disponibles': queryset.count(),
            'status': 'success'
        })