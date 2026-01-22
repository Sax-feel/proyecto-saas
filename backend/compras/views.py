from django.db import transaction
from rest_framework import generics, status, permissions, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from datetime import datetime
import logging

from .models import Compra, DetalleCompra
from .serializers import CompraSerializer, RealizarCompraStockSerializer

logger = logging.getLogger(__name__)


class EsVendedorPermission(permissions.BasePermission):
    """Permiso personalizado para verificar que el usuario sea vendedor"""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'rol') and 
            request.user.rol.rol == 'vendedor'
        )


class RealizarCompraStockView(generics.CreateAPIView):
    """
    Vista para que un vendedor realice compra de nuevo stock
    Accesible solo para rol 'vendedor'
    """
    serializer_class = RealizarCompraStockSerializer
    permission_classes = [IsAuthenticated, EsVendedorPermission]
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Realiza una compra de nuevo stock para productos
        """
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        try:
            validated_data = serializer.validated_data
            usuario_empresa = validated_data['usuario_empresa']
            productos_info = validated_data['productos_info']
            precio_total = validated_data['precio_total']
            
            logger.info(f"Vendedor {request.user.email} realizando compra de stock. Total: {precio_total}")
            
            # 1. Crear la compra
            compra = Compra.objects.create(
                usuario_empresa=usuario_empresa,
                precio_total=precio_total
            )
            
            logger.info(f"Compra creada ID: {compra.id_compra}")
            
            # 2. Crear detalles de compra y actualizar stock
            detalles_compra = []
            for info in productos_info:
                producto = info['producto']
                cantidad = info['cantidad']
                precio_unitario = info['precio_unitario']
                subtotal = info['subtotal']
                
                # Aumentar stock del producto
                producto.stock_actual += cantidad
                
                # Actualizar estado si estaba agotado
                if producto.estado == 'agotado' and producto.stock_actual > 0:
                    producto.estado = 'activo'
                
                producto.save()
                
                # Crear detalle de compra
                detalle = DetalleCompra.objects.create(
                    id_producto=producto,
                    id_compra=compra,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    subtotal=subtotal
                )
                
                detalles_compra.append({
                    'producto': producto.nombre,
                    'cantidad': cantidad,
                    'stock_nuevo': producto.stock_actual,
                    'precio_unitario': float(precio_unitario),
                    'subtotal': float(subtotal)
                })
                
                logger.info(f"Stock actualizado: {producto.nombre} +{cantidad} = {producto.stock_actual}")
            
            # 3. Crear notificación (opcional)
            self._crear_notificacion_compra(request.user, compra, detalles_compra)
            
            # 4. Preparar respuesta
            response_data = {
                'message': 'Compra de stock realizada exitosamente',
                'compra': CompraSerializer(compra).data,
                'detalles': {
                    'numero_compra': compra.id_compra,
                    'fecha': compra.fecha.isoformat(),
                    'precio_total': float(precio_total),
                    'stock_aumentado': detalles_compra
                },
                'status': 'success'
            }
            
            logger.info(f"Compra de stock completada exitosamente ID: {compra.id_compra}")
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error al realizar compra de stock: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al procesar la compra de stock',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def _crear_notificacion_compra(self, vendedor, compra, detalles_compra):
        """
        Crea notificación para el vendedor sobre la compra de stock
        """
        try:
            from notificaciones.models import Notificacion
            from relacion_notifica.models import Notifica
            
            # Resumen de productos comprados
            productos_texto = ", ".join([f"{detalle['cantidad']}x {detalle['producto']}" 
                                        for detalle in detalles_compra[:3]])
            if len(detalles_compra) > 3:
                productos_texto += f" y {len(detalles_compra) - 3} productos más"
            
            # Crear la notificación
            notificacion = Notificacion.objects.create(
                titulo=f'Compra de stock #{compra.id_compra} realizada',
                mensaje=(
                    f'Has realizado una compra de stock por un total de Bs. {compra.precio_total}. '
                    f'Productos: {productos_texto}. '
                    f'Stock actualizado exitosamente.'
                ),
                tipo='info'
            )
            
            # Asociar notificación al vendedor
            Notifica.objects.create(
                id_usuario=vendedor,
                id_notificacion=notificacion
            )
            
            logger.info(f"Notificación creada para vendedor {vendedor.email}")
            
        except Exception as e:
            logger.error(f"Error al crear notificación de compra: {str(e)}")
            # No fallar la compra si hay error en notificación


class ListaComprasVendedorView(generics.ListAPIView):
    """
    Vista para que un vendedor liste todas sus compras realizadas
    Accesible solo para rol 'vendedor'
    """
    serializer_class = CompraSerializer
    permission_classes = [IsAuthenticated, EsVendedorPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['fecha']
    ordering_fields = ['fecha', 'precio_total']
    ordering = ['-fecha']
    
    def get_queryset(self):
        """
        Retorna las compras realizadas por el vendedor autenticado
        """
        try:
            from usuario_empresa.models import Usuario_Empresa
            usuario_empresa = Usuario_Empresa.objects.get(id_usuario=self.request.user)
            
            queryset = Compra.objects.filter(
                usuario_empresa=usuario_empresa
            ).select_related(
                'usuario_empresa',
                'usuario_empresa__id_usuario',
                'usuario_empresa__empresa'
            )
            
            # Filtrar por fecha si se proporcionan
            fecha_inicio = self.request.query_params.get('fecha_inicio')
            fecha_fin = self.request.query_params.get('fecha_fin')
            
            if fecha_inicio:
                queryset = queryset.filter(fecha__date__gte=fecha_inicio)
            if fecha_fin:
                queryset = queryset.filter(fecha__date__lte=fecha_fin)
            
            return queryset
            
        except Usuario_Empresa.DoesNotExist:
            logger.warning(f"Usuario vendedor {self.request.user.email} no tiene empresa asignada")
            return Compra.objects.none()
        except Exception as e:
            logger.error(f"Error obteniendo compras del vendedor: {str(e)}")
            return Compra.objects.none()
    
    def list(self, request, *args, **kwargs):
        """
        Sobrescribimos para agregar estadísticas
        """
        try:
            # Obtener el queryset filtrado
            queryset = self.filter_queryset(self.get_queryset())
            
            # Calcular estadísticas
            total_compras = queryset.count()
            total_invertido = sum(compra.precio_total for compra in queryset)
            compras_hoy = queryset.filter(fecha__date=datetime.now().date()).count()
            invertido_hoy = sum(
                compra.precio_total 
                for compra in queryset.filter(fecha__date=datetime.now().date())
            )
            
            # Paginación
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response({
                    'compras': serializer.data,
                    'estadisticas': {
                        'total_compras': total_compras,
                        'total_invertido': float(total_invertido),
                        'compras_hoy': compras_hoy,
                        'invertido_hoy': float(invertido_hoy),
                        'promedio_compra': float(total_invertido / total_compras) if total_compras > 0 else 0
                    },
                    'status': 'success'
                })
            
            # Sin paginación
            serializer = self.get_serializer(queryset, many=True)
            
            return Response({
                'compras': serializer.data,
                'estadisticas': {
                    'total_compras': total_compras,
                    'total_invertido': float(total_invertido),
                    'compras_hoy': compras_hoy,
                    'invertido_hoy': float(invertido_hoy),
                    'promedio_compra': float(total_invertido / total_compras) if total_compras > 0 else 0
                },
                'status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Error listando compras del vendedor: {str(e)}")
            return Response({
                'error': 'Error al obtener compras',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DetalleCompraVendedorView(generics.RetrieveAPIView):
    """
    Vista para que un vendedor vea el detalle de una compra específica
    Accesible solo para rol 'vendedor'
    """
    serializer_class = CompraSerializer
    permission_classes = [IsAuthenticated, EsVendedorPermission]
    lookup_field = 'id_compra'
    
    def get_queryset(self):
        """
        Retorna solo las compras realizadas por el vendedor autenticado
        """
        try:
            from usuario_empresa.models import Usuario_Empresa
            usuario_empresa = Usuario_Empresa.objects.get(id_usuario=self.request.user)
            return Compra.objects.filter(
                usuario_empresa=usuario_empresa
            ).select_related(
                'usuario_empresa',
                'usuario_empresa__id_usuario',
                'usuario_empresa__empresa'
            )
        except Usuario_Empresa.DoesNotExist:
            return Compra.objects.none()
    
    def retrieve(self, request, *args, **kwargs):
        """
        Sobrescribimos para agregar detalles completos
        """
        try:
            compra = self.get_object()
            serializer = self.get_serializer(compra)
            
            # Obtener detalles de la compra
            detalles = DetalleCompra.objects.filter(
                id_compra=compra
            ).select_related('id_producto')
            
            detalles_data = []
            for detalle in detalles:
                detalles_data.append({
                    'id_producto': detalle.id_producto.id_producto,
                    'producto_nombre': detalle.id_producto.nombre,
                    'descripcion': detalle.id_producto.descripcion,
                    'cantidad': detalle.cantidad,
                    'precio_unitario': float(detalle.precio_unitario),
                    'subtotal': float(detalle.subtotal),
                    'stock_anterior': detalle.id_producto.stock_actual - detalle.cantidad,  # Stock antes de la compra
                    'stock_actual': detalle.id_producto.stock_actual,
                    'stock_minimo': detalle.id_producto.stock_minimo
                })
            
            return Response({
                'compra': serializer.data,
                'detalles': detalles_data,
                'resumen': {
                    'total_productos': len(detalles_data),
                    'total_cantidad': sum(detalle['cantidad'] for detalle in detalles_data),
                    'total_compra': float(compra.precio_total)
                },
                'status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Error obteniendo detalle de compra: {str(e)}")
            return Response({
                'error': 'Error al obtener detalle de compra',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EliminarCompraView(generics.DestroyAPIView):
    """
    Vista para que un vendedor elimine una compra específica
    Accesible solo para rol 'vendedor'
    - Solo elimina el registro de compra, NO revierte el stock
    """
    permission_classes = [IsAuthenticated, EsVendedorPermission]
    
    def delete(self, request, id_compra, *args, **kwargs):
        """
        Elimina una compra específica
        """
        try:
            # 1. Verificar que el usuario sea vendedor y tenga empresa
            try:
                from usuario_empresa.models import Usuario_Empresa
                usuario_empresa = Usuario_Empresa.objects.get(id_usuario=request.user)
            except Usuario_Empresa.DoesNotExist:
                return Response({
                    'error': 'Vendedor sin empresa asignada',
                    'detail': 'No tienes una empresa asignada',
                    'status': 'error'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 2. Buscar la compra específica que pertenezca a este vendedor
            try:
                compra = Compra.objects.get(
                    id_compra=id_compra,
                    usuario_empresa=usuario_empresa
                )
            except Compra.DoesNotExist:
                logger.warning(f"Compra no encontrada: ID {id_compra} para vendedor {request.user.email}")
                return Response({
                    'error': 'Compra no encontrada',
                    'detail': f'No existe la compra con ID {id_compra} o no tienes permisos para eliminarla',
                    'status': 'error'
                }, status=status.HTTP_404_NOT_FOUND)
            
            compra_id = compra.id_compra
            
            # 3. Obtener información de la compra antes de eliminar
            detalles_compra = DetalleCompra.objects.filter(id_compra=compra)
            info_compra = {
                'id_compra': compra.id_compra,
                'fecha': compra.fecha.isoformat(),
                'precio_total': float(compra.precio_total),
                'cantidad_productos': detalles_compra.count(),
                'detalles': [
                    {
                        'producto_id': detalle.id_producto.id_producto,
                        'producto_nombre': detalle.id_producto.nombre,
                        'cantidad': detalle.cantidad,
                        'precio_unitario': float(detalle.precio_unitario)
                    }
                    for detalle in detalles_compra
                ]
            }
            
            logger.info(f"Vendedor {request.user.email} eliminando compra ID: {compra_id}")
            
            # 4. Primero eliminar los detalles de compra
            detalles_eliminados = detalles_compra.delete()
            logger.info(f"Detalles de compra eliminados: {detalles_eliminados}")
            
            # 5. Luego eliminar la compra
            compra.delete()
            
            logger.info(f"Compra ID: {compra_id} eliminada exitosamente")
            
            # 6. Notificación (opcional)
            try:
                self._crear_notificacion_eliminacion(request.user, info_compra)
            except Exception as notif_error:
                logger.error(f"Error en notificación: {str(notif_error)}")
                # No fallar la eliminación por error en notificación
            
            return Response({
                'message': 'Compra eliminada exitosamente',
                'detalles': {
                    'compra_id': compra_id,
                    'fecha_eliminacion': datetime.now().isoformat(),
                    'eliminado_por': request.user.email,
                    'informacion_compra': info_compra
                },
                'advertencia': 'Esta acción NO revierte el stock de los productos',
                'status': 'success'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error eliminando compra: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al eliminar la compra',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _crear_notificacion_eliminacion(self, vendedor, info_compra):
        """
        Crea notificación para el vendedor sobre la eliminación de compra
        """
        try:
            from notificaciones.models import Notificacion
            from relacion_notifica.models import Notifica
            
            # Crear la notificación
            notificacion = Notificacion.objects.create(
                titulo=f'Compra #{info_compra["id_compra"]} eliminada',
                mensaje=(
                    f'Has eliminado la compra #{info_compra["id_compra"]} por un total de Bs. {info_compra["precio_total"]:.2f}. '
                    f'Productos: {info_compra["cantidad_productos"]} artículos.'
                ),
                tipo='warning'
            )
            
            # Asociar notificación al vendedor
            Notifica.objects.create(
                id_usuario=vendedor,
                id_notificacion=notificacion
            )
            
            logger.info(f"Notificación de eliminación creada para vendedor {vendedor.email}")
            
        except Exception as e:
            logger.error(f"Error al crear notificación de eliminación: {str(e)}")
