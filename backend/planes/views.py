# planes/views.py
from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from .models import Plan
from .serializers import PlanSerializer, PlanResumenSerializer
import logging

logger = logging.getLogger(__name__)


class ListaPlanesView(generics.ListAPIView):
    """
    Vista para listar TODOS los planes disponibles
    Accesible por cualquier usuario (sin autenticación)
    """
    serializer_class = PlanResumenSerializer  # Usa el serializador resumido
    permission_classes = [AllowAny]  # Cualquiera puede ver
    queryset = Plan.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['precio', 'limite_productos', 'limite_usuarios', 'nombre']
    ordering = ['precio']  # Ordenar por precio ascendente por defecto
    
    def list(self, request, *args, **kwargs):
        """
        Lista todos los planes con información adicional
        """
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            # Agrupar por tipo (gratuito vs de pago)
            planes_gratuitos = queryset.filter(precio=0)
            planes_de_pago = queryset.filter(precio__gt=0)
            
            # Paginación opcional
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response({
                    'planes': serializer.data,
                    'status': 'success'
                })
            
            serializer = self.get_serializer(queryset, many=True)
            
            return Response({
                'planes': serializer.data,
                'status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Error listando planes: {str(e)}", exc_info=True)
            return Response(
                {
                    'error': 'Error al obtener la lista de planes',
                    'detail': str(e),
                    'status': 'error'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    


class DetallePlanPorNombreView(generics.RetrieveAPIView):
    """
    Vista para obtener detalles de un plan por su nombre
    Accesible por cualquier usuario (sin autenticación)
    """
    serializer_class = PlanSerializer  # Serializador completo
    permission_classes = [AllowAny]
    lookup_field = 'nombre'
    queryset = Plan.objects.all()
    
    def retrieve(self, request, *args, **kwargs):
        """
        Obtiene un plan por nombre
        """
        try:
            nombre_plan = kwargs.get('nombre', '').lower()
            
            # Buscar plan (insensible a mayúsculas)
            try:
                plan = Plan.objects.get(nombre__iexact=nombre_plan)
            except Plan.DoesNotExist:
                # Intentar con la primera letra mayúscula
                nombre_capitalizado = nombre_plan.capitalize()
                plan = Plan.objects.get(nombre=nombre_capitalizado)
            
            serializer = self.get_serializer(plan)
            
            return Response({
                'plan': serializer.data,
                'status': 'success'
            })
            
        except Plan.DoesNotExist:
            logger.warning(f"Plan no encontrado: {kwargs.get('nombre')}")
            return Response(
                {
                    'error': 'Plan no encontrado',
                    'detail': f"No existe un plan con el nombre '{kwargs.get('nombre')}'",
                    'planes_disponibles': list(Plan.objects.values_list('nombre', flat=True)),
                    'status': 'error'
                },
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error obteniendo plan: {str(e)}", exc_info=True)
            return Response(
                {
                    'error': 'Error al obtener el plan',
                    'detail': str(e),
                    'status': 'error'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    