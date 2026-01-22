# reservas/views.py
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta
import logging

from .models import Reserva
from .serializers import (
    ReservaSerializer, 
    CrearReservaSerializer, 
    CancelarReservaSerializer
)
from producto.models import Producto

logger = logging.getLogger(__name__)

class EsClientePermission(permissions.BasePermission):
    """Permiso personalizado para verificar que el usuario sea cliente"""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'rol') and 
            request.user.rol.rol == 'cliente'
        )


class CrearReservaView(generics.CreateAPIView):
    """
    Vista para que un cliente cree una reserva (Debe estar logueado como cliente)
    """
    serializer_class = CrearReservaSerializer
    permission_classes = [IsAuthenticated, EsClientePermission]
    
    def create(self, request, *args, **kwargs):
        try:
            logger.info(f"Intento de crear reserva por cliente: {request.user.email}")
            
            serializer = self.get_serializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            
            validated_data = serializer.validated_data
            cliente = validated_data['cliente']
            producto = validated_data['producto']
            cantidad = validated_data['cantidad']
            fecha_expiracion = validated_data['fecha_expiracion']
            
            # 1. Reducir el stock del producto
            producto.stock_actual -= cantidad
            
            # Actualizar estado si es necesario
            if producto.stock_actual <= 0:
                producto.estado = 'agotado'
            elif producto.stock_actual <= producto.stock_minimo:
                producto.estado = 'activo'  # Mantener activo pero con stock bajo
            
            producto.save()
            logger.info(f"Stock actualizado para {producto.nombre}: {producto.stock_actual}")
            
            # 2. Crear la reserva
            reserva = Reserva.objects.create(
                id_cliente=cliente,
                id_producto=producto,
                cantidad=cantidad,
                estado='pendiente',
                fecha_expiracion=fecha_expiracion
            )
            
            logger.info(f"Reserva creada exitosamente ID: {reserva.id_cliente}-{reserva.id_producto}")
            
            # 3. Programar tarea para expiración automática (72 horas)
            self._programar_expiracion_reserva(reserva)
            # notificacion para vendedores
            self._crear_notificacion_reserva_vendedores(reserva)
        
            return Response({
                'message': 'Reserva creada exitosamente',
                'reserva': ReservaSerializer(reserva).data,
                'detalles': {
                    'producto': producto.nombre,
                    'cantidad': cantidad,
                    'fecha_expiracion': fecha_expiracion.isoformat(),
                    'tiempo_limite': '72 horas'
                },
                'status': 'success'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error al crear reserva: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al crear la reserva',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def _crear_notificacion_reserva_vendedores(self, reserva):
        """
        Crea notificación de reserva para vendedores de la empresa
        """
        try:
            from notificaciones.models import Notificacion
            from relacion_notifica.models import Notifica
            from usuario_empresa.models import Usuario_Empresa
            from roles.models import Rol
            
            # Obtener empresa del producto reservado
            empresa = reserva.id_producto.empresa
            
            # Crear la notificación
            notificacion = Notificacion.objects.create(
                titulo=f'Nueva reserva de producto: {reserva.id_producto.nombre}',
                mensaje=(
                    f'El cliente {reserva.id_cliente.nombre_cliente} ha reservado '
                    f'{reserva.cantidad} unidades de "{reserva.id_producto.nombre}". '
                    f'Stock reducido de {reserva.id_producto.stock_actual + reserva.cantidad} '
                    f'a {reserva.id_producto.stock_actual}. '
                    f'La reserva expira: {reserva.fecha_expiracion.strftime("%d/%m/%Y %H:%M")}'
                ),
                tipo='info'
            )
            
            # Obtener rol vendedor
            rol_vendedor = Rol.objects.get(rol='vendedor')
            
            # Buscar TODOS los vendedores activos de la empresa
            vendedores_empresa = Usuario_Empresa.objects.filter(
                empresa=empresa,
                id_usuario__rol=rol_vendedor,
                estado='activo'
            ).select_related('id_usuario')
            
            # Crear notificaciones para cada vendedor
            notificaciones_creadas = 0
            for vendedor in vendedores_empresa:
                Notifica.objects.create(
                    id_usuario=vendedor.id_usuario,
                    id_notificacion=notificacion
                )
                notificaciones_creadas += 1
            
            logger.info(f"Notificación de reserva creada para {notificaciones_creadas} vendedores en empresa {empresa.nombre}")
            
        except Exception as e:
            logger.error(f"Error al crear notificación de reserva para vendedores: {str(e)}")

    def _programar_expiracion_reserva(self, reserva):
        """
        Programa la expiración automática de la reserva
        (En producción, usaría Celery o Django Background Tasks)
        """
        # Esta función se ejecutaría con un task scheduler
        # Por ahora solo registramos el evento
        logger.info(f"Reserva programada para expirar: {reserva.fecha_expiracion}")


class CancelarReservaView(generics.UpdateAPIView):
    """
    Vista para que un cliente cancele una reserva
    """
    serializer_class = CancelarReservaSerializer
    permission_classes = [IsAuthenticated, EsClientePermission]
    
    def update(self, request, *args, **kwargs):
        try:
            logger.info(f"Intento de cancelar reserva por cliente: {request.user.email}")
            
            serializer = self.get_serializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            
            validated_data = serializer.validated_data
            reserva = validated_data['reserva']
            producto = reserva.id_producto
            
            # 1. Devolver stock al producto
            producto.stock_actual += reserva.cantidad
            
            # Actualizar estado si es necesario
            if producto.stock_actual > 0 and producto.estado == 'agotado':
                producto.estado = 'activo'
            
            producto.save()
            logger.info(f"Stock devuelto para {producto.nombre}: {producto.stock_actual}")
            
            # 2. Actualizar estado de la reserva
            reserva.estado = 'cancelada'
            reserva.save()
            
            logger.info(f"Reserva cancelada ID: {reserva.id_cliente}-{reserva.id_producto}")

            self._crear_notificacion_cancelacion_reserva(reserva, producto)
            
            return Response({
                'message': 'Reserva cancelada exitosamente',
                'detalles': {
                    'producto': producto.nombre,
                    'cantidad_devuelta': reserva.cantidad,
                    'stock_actual': producto.stock_actual
                },
                'status': 'success'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error al cancelar reserva: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al cancelar la reserva',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_400_BAD_REQUEST)
        
    def _crear_notificacion_cancelacion_reserva(self, reserva, producto):
        """
        Crea notificación de cancelación de reserva para vendedores
        """
        try:
            from notificaciones.models import Notificacion
            from relacion_notifica.models import Notifica
            from usuario_empresa.models import Usuario_Empresa
            from roles.models import Rol
            
            # Obtener empresa del producto
            empresa = producto.empresa
            
            # Crear la notificación
            notificacion = Notificacion.objects.create(
                titulo=f'Reserva cancelada: {producto.nombre}',
                mensaje=(
                    f'El cliente {reserva.id_cliente.nombre_cliente} ha cancelado su reserva '
                    f'de {reserva.cantidad} unidades de "{producto.nombre}". '
                    f'Stock restaurado a {producto.stock_actual}.'
                ),
                tipo='warning'
            )
            
            # Obtener rol vendedor
            rol_vendedor = Rol.objects.get(rol='vendedor')
            
            # Buscar TODOS los vendedores activos de la empresa
            vendedores_empresa = Usuario_Empresa.objects.filter(
                empresa=empresa,
                id_usuario__rol=rol_vendedor,
                estado='activo'
            ).select_related('id_usuario')
            
            # Crear notificaciones para cada vendedor
            notificaciones_creadas = 0
            for vendedor in vendedores_empresa:
                Notifica.objects.create(
                    id_usuario=vendedor.id_usuario,
                    id_notificacion=notificacion
                )
                notificaciones_creadas += 1
            
            logger.info(f"Notificación de cancelación de reserva creada para {notificaciones_creadas} vendedores")
            
        except Exception as e:
            logger.error(f"Error al crear notificación de cancelación de reserva: {str(e)}")


class ListarReservasClienteView(generics.ListAPIView):
    """
    Vista para que un cliente liste sus reservas
    """
    serializer_class = ReservaSerializer
    permission_classes = [IsAuthenticated, EsClientePermission]
    
    def get_queryset(self):
        """
        Retorna las reservas del cliente autenticado
        """
        try:
            from cliente.models import Cliente
            cliente = Cliente.objects.get(id_usuario=self.request.user)
            
            # Filtrar por estado si se proporciona
            estado = self.request.query_params.get('estado', None)
            queryset = Reserva.objects.filter(id_cliente=cliente)
            
            if estado:
                queryset = queryset.filter(estado=estado)
            
            return queryset.order_by('-fecha_reserva')
            
        except Cliente.DoesNotExist:
            return Reserva.objects.none()
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Contar reservas por estado
        estados = {
            'pendiente': queryset.filter(estado='pendiente').count(),
            'confirmada': queryset.filter(estado='confirmada').count(),
            'cancelada': queryset.filter(estado='cancelada').count(),
            'expirada': queryset.filter(estado='expirada').count(),
        }
        
        return Response({
            'reservas': self.get_serializer(queryset, many=True).data,
            'total': queryset.count(),
            'estados': estados,
            'status': 'success'
        })


class VerificarReservasExpiradasView(APIView):
    """
    Vista para verificar y expirar reservas automáticamente
    (Esta vista sería llamada por un cron job)
    """
    permission_classes = [permissions.AllowAny]  # Permiso especial para cron
    
    def get(self, request):
        """
        Verifica y expira reservas pasadas las 72 horas
        """
        try:
            ahora = timezone.now()
            reservas_a_expiar = Reserva.objects.filter(
                estado='pendiente',
                fecha_expiracion__lt=ahora
            )
            
            reservas_expiradas = []
            for reserva in reservas_a_expiar:
                # Devolver stock
                producto = reserva.id_producto
                producto.stock_actual += reserva.cantidad
                producto.save()
                
                # Actualizar estado de reserva
                reserva.estado = 'expirada'
                reserva.save()
                
                reservas_expiradas.append({
                    'id_reserva': f"{reserva.id_cliente.id_usuario}-{reserva.id_producto.id_producto}",
                    'cliente': reserva.id_cliente.nombre_cliente,
                    'producto': reserva.id_producto.nombre,
                    'cantidad': reserva.cantidad
                })
            
            logger.info(f"Reservas expiradas automáticamente: {len(reservas_expiradas)}")
            
            return Response({
                'message': 'Reservas expiradas procesadas',
                'reservas_expiradas': reservas_expiradas,
                'total': len(reservas_expiradas),
                'status': 'success'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error al expirar reservas: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al procesar reservas expiradas',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)