# relacion_notifica/views.py
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q, Count
from django.utils import timezone
from .models import Notifica
from .serializers import (
    NotificaSerializer, 
    NotificaUpdateSerializer,
    NotificacionUsuarioSerializer,
    MarcarLeidoSerializer
)
from usuarios.models import User
import logging

logger = logging.getLogger(__name__)

class ListarNotificacionesView(generics.ListAPIView):
    """
    Vista para listar notificaciones del usuario autenticado.
    Acceso: vendedor, admin_empresa, admin
    """
    serializer_class = NotificaSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Retorna las notificaciones del usuario que no están eliminadas"""
        user = self.request.user
        
        # Verificar que el usuario tenga rol permitido
        if not hasattr(user, 'rol') or user.rol.rol not in ['vendedor', 'admin_empresa', 'admin']:
            return Notifica.objects.none()
        
        # Filtrar notificaciones no eliminadas del usuario
        queryset = Notifica.objects.filter(
            id_usuario=user,
            eliminado=False
        ).select_related('id_notificacion').order_by('-id_notificacion__fecha_creacion')
        
        # Filtrar por tipo si se especifica
        tipo = self.request.query_params.get('tipo')
        if tipo:
            queryset = queryset.filter(id_notificacion__tipo=tipo)
        
        # Filtrar por estado de lectura
        leido = self.request.query_params.get('leido')
        if leido is not None:
            leido_bool = leido.lower() in ['true', '1', 'yes']
            queryset = queryset.filter(leido=leido_bool)
        
        # Limitar resultados si se especifica
        limit = self.request.query_params.get('limit')
        if limit and limit.isdigit():
            queryset = queryset[:int(limit)]
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Respuesta personalizada con estadísticas"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # Obtener estadísticas
        total = queryset.count()
        no_leidas = queryset.filter(leido=False).count()
        leidas = queryset.filter(leido=True).count()
        
        # Contar eliminadas (aunque no se muestren)
        eliminadas = Notifica.objects.filter(
            id_usuario=request.user,
            eliminado=True
        ).count()
        
        # Serializar datos
        serializer = self.get_serializer(queryset, many=True)
        
        response_data = {
            'notificaciones': serializer.data,
            'total': total,
            'no_leidas': no_leidas,
            'leidas': leidas,
            'eliminadas': eliminadas,
            'status': 'success'
        }
        
        return Response(response_data)


class EstadisticasNotificacionesView(APIView):
    """
    Vista para obtener estadísticas de notificaciones del usuario
    Acceso: vendedor, admin_empresa, admin
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Verificar rol
        if not hasattr(user, 'rol') or user.rol.rol not in ['vendedor', 'admin_empresa', 'admin']:
            return Response({
                'error': 'No autorizado',
                'detail': 'Rol no permitido'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Obtener estadísticas generales
            total = Notifica.objects.filter(id_usuario=user, eliminado=False).count()
            no_leidas = Notifica.objects.filter(id_usuario=user, leido=False, eliminado=False).count()
            leidas = Notifica.objects.filter(id_usuario=user, leido=True, eliminado=False).count()
            eliminadas = Notifica.objects.filter(id_usuario=user, eliminado=True).count()
            
            # Estadísticas por tipo
            tipos_stats = Notifica.objects.filter(
                id_usuario=user,
                eliminado=False
            ).values(
                'id_notificacion__tipo'
            ).annotate(
                total=Count('id'),
                no_leidas=Count('id', filter=Q(leido=False))
            ).order_by('id_notificacion__tipo')
            
            # Estadísticas por fecha (últimos 7 días)
            from datetime import timedelta
            siete_dias_atras = timezone.now() - timedelta(days=7)
            
            notificaciones_recientes = Notifica.objects.filter(
                id_usuario=user,
                eliminado=False,
                id_notificacion__fecha_creacion__gte=siete_dias_atras
            ).count()
            
            return Response({
                'total': total,
                'no_leidas': no_leidas,
                'leidas': leidas,
                'eliminadas': eliminadas,
                'por_tipo': list(tipos_stats),
                'ultimos_7_dias': notificaciones_recientes,
                'status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Error obteniendo estadísticas: {str(e)}")
            return Response({
                'error': 'Error interno',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ActualizarNotificacionView(generics.UpdateAPIView):
    """
    Vista para actualizar estado de una notificación (leído/eliminado)
    Acceso: vendedor, admin_empresa, admin
    """
    serializer_class = NotificaUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Notifica.objects.all()
    
    def get_object(self):
        """Obtiene la notificación verificando que pertenezca al usuario"""
        obj = generics.get_object_or_404(Notifica, pk=self.kwargs.get('pk'))
        
        # Verificar que la notificación pertenezca al usuario
        if obj.id_usuario != self.request.user:
            self.permission_denied(
                self.request,
                message="No tienes permiso para modificar esta notificación"
            )
        
        # Verificar rol
        user = self.request.user
        if not hasattr(user, 'rol') or user.rol.rol not in ['vendedor', 'admin_empresa', 'admin']:
            self.permission_denied(
                self.request,
                message="Rol no permitido"
            )
        
        return obj
    
    def update(self, request, *args, **kwargs):
        """Actualiza el estado de la notificación"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            
            # Si se marca como leído y no estaba leído, establecer fecha
            if serializer.validated_data.get('leido') and not instance.leido:
                instance.fecha_leido = timezone.now()
            
            self.perform_update(serializer)
            
            return Response({
                'message': 'Notificación actualizada exitosamente',
                'notificacion': NotificaSerializer(instance).data,
                'status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Error actualizando notificación: {str(e)}")
            return Response({
                'error': 'Error al actualizar notificación',
                'detail': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


# relacion_notifica/views.py - Mantén solo estas dos para marcar leídas
class MarcarNotificacionesLeidasView(APIView):
    """
    Vista única para marcar notificaciones como leídas
    POST /api/notificaciones/marcar-leidas/
    
    Ejemplos de uso:
    1. Marcar todas: {"marcar_todas": true}
    2. Marcar específicas: {"notificacion_ids": [1, 2, 3]}
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        user = request.user
        
        # Verificar rol
        if not hasattr(user, 'rol') or user.rol.rol not in ['vendedor', 'admin_empresa', 'admin']:
            return Response({
                'error': 'No autorizado',
                'detail': 'Rol no permitido'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # VALIDAR DATOS CON EL SERIALIZADOR
            serializer = MarcarLeidoSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data
            
            # Obtener datos validados
            notificacion_ids = data.get('notificacion_ids', [])
            marcar_todas = data.get('marcar_todas', False)
            
            ahora = timezone.now()
            filtro = Q(id_usuario=user) & Q(eliminado=False) & Q(leido=False)
            
            if marcar_todas:
                # Filtrar todas las notificaciones no leídas
                queryset = Notifica.objects.filter(filtro)
                actualizadas = queryset.update(leido=True, fecha_leido=ahora)
                
                return Response({
                    'message': f'✅ Marcadas {actualizadas} notificaciones como leídas',
                    'actualizadas': actualizadas,
                    'accion': 'todas',
                    'status': 'success'
                })
            
            else:
                # Filtrar notificaciones específicas
                filtro &= Q(id__in=notificacion_ids)
                queryset = Notifica.objects.filter(filtro)
                actualizadas = queryset.update(leido=True, fecha_leido=ahora)
                
                return Response({
                    'message': f'✅ Marcadas {actualizadas} notificaciones como leídas',
                    'actualizadas': actualizadas,
                    'solicitadas': len(notificacion_ids),
                    'ids_procesados': list(queryset.values_list('id', flat=True)),
                    'accion': 'especificas',
                    'status': 'success'
                })
                
        except serializer.ValidationError as e:
            # Captura errores de validación del serializador
            return Response({
                'error': 'Error de validación',
                'detail': e.detail,
                'status': 'error'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error marcando notificaciones como leídas: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al procesar la solicitud',
                'detail': 'Ocurrió un error interno',
                'status': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EliminarNotificacionView(generics.DestroyAPIView):
    """
    Vista para eliminar (soft delete) una notificación
    Acceso: vendedor, admin_empresa, admin
    """
    permission_classes = [permissions.IsAuthenticated]
    queryset = Notifica.objects.all()
    
    def get_object(self):
        """Obtiene la notificación verificando que pertenezca al usuario"""
        obj = generics.get_object_or_404(Notifica, pk=self.kwargs.get('pk'))
        
        # Verificar que la notificación pertenezca al usuario
        if obj.id_usuario != self.request.user:
            self.permission_denied(
                self.request,
                message="No tienes permiso para eliminar esta notificación"
            )
        
        # Verificar rol
        user = self.request.user
        if not hasattr(user, 'rol') or user.rol.rol not in ['vendedor', 'admin_empresa', 'admin']:
            self.permission_denied(
                self.request,
                message="Rol no permitido"
            )
        
        return obj
    
    def perform_destroy(self, instance):
        """Realiza soft delete en lugar de eliminar físicamente"""
        instance.eliminado = True
        instance.save()
        logger.info(f"Notificación {instance.id} marcada como eliminada por usuario {self.request.user.email}")
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            'message': 'Notificación eliminada exitosamente',
            'status': 'success'
        }, status=status.HTTP_200_OK)


class NotificacionesRecientesView(generics.ListAPIView):
    """
    Vista para obtener notificaciones recientes (últimas 10)
    Acceso: vendedor, admin_empresa, admin
    """
    serializer_class = NotificaSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        # Verificar rol
        if not hasattr(user, 'rol') or user.rol.rol not in ['vendedor', 'admin_empresa', 'admin']:
            return Notifica.objects.none()
        
        # Obtener últimas 10 notificaciones no eliminadas
        return Notifica.objects.filter(
            id_usuario=user,
            eliminado=False
        ).select_related('id_notificacion').order_by('-id_notificacion__fecha_creacion')[:10]
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Obtener contador de no leídas
        no_leidas = Notifica.objects.filter(
            id_usuario=request.user,
            leido=False,
            eliminado=False
        ).count()
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'notificaciones': serializer.data,
            'total': queryset.count(),
            'no_leidas': no_leidas,
            'status': 'success'
        })