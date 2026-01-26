# ventas/views.py
from datetime import datetime
from rest_framework import generics, status, permissions, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from decimal import Decimal
import logging
from .models import Venta
from detalle_venta.models import DetalleVenta
from .serializers import VentaSerializer, RealizarCompraSerializer
from reservas.views import EsVendedorOAdminEmpresaPermission
from usuario_empresa.models import Usuario_Empresa
logger = logging.getLogger(__name__)

class RealizarCompraView(generics.CreateAPIView):
    """
    Vista para que un vendedor realice una venta (no un cliente)
    """
    serializer_class = RealizarCompraSerializer
    permission_classes = [IsAuthenticated, EsVendedorOAdminEmpresaPermission]    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        try:
            logger.info(f"Intento de venta por vendedor: {request.user.email}")          
            serializer = self.get_serializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)            
            validated_data = serializer.validated_data
            cliente = validated_data['cliente']
            productos_info = validated_data['productos_info']
            precio_total = validated_data['precio_total']
            reservas_pendientes = validated_data['reservas_pendientes']
            
            # 1. Obtener el usuario_empresa (vendedor) que está realizando la venta
            try:
                vendedor = Usuario_Empresa.objects.get(id_usuario=request.user)
            except Usuario_Empresa.DoesNotExist:
                return Response({
                    'error': 'Vendedor no encontrado',
                    'detail': 'No tienes una cuenta de vendedor válida',
                    'status': 'error'
                }, status=status.HTTP_400_BAD_REQUEST)            
            
            # 2. Crear venta
            venta = Venta.objects.create(
                usuario_empresa=vendedor,  # Usar el vendedor logueado
                cliente=cliente,
                precio_total=precio_total
            )            
            logger.info(f"Venta creada ID: {venta.id_venta} por vendedor: {vendedor.id_usuario.email}")
            
            # 3. Crear detalles de venta y actualizar stock
            detalles_venta = []
            productos_agotados = []
            for info in productos_info:
                producto = info['producto']
                cantidad = info['cantidad']
                precio_unitario = info['precio_unitario']
                subtotal = info['subtotal']                
                
                # Verificar stock nuevamente (doble verificación)
                if producto.stock_actual < cantidad:
                    raise serializers.ValidationError(
                        f"Stock insuficiente para {producto.nombre} durante el procesamiento"
                    )                
                
                # Reducir stock
                producto.stock_actual -= cantidad                
                
                # Actualizar estado si es necesario
                if producto.stock_actual <= 0:
                    producto.estado = 'agotado'
                    # Agregar a lista de productos agotados
                    productos_agotados.append({
                        'nombre': producto.nombre,
                        'stock_anterior': producto.stock_actual + cantidad,
                        'stock_actual': producto.stock_actual
                    })
                elif producto.stock_actual <= producto.stock_minimo:
                    producto.estado = 'activo' # Mantener activo pero con stock bajo                
                
                producto.save()
                
                # Detalle venta
                detalle = DetalleVenta.objects.create(
                    id_venta=venta,
                    id_producto=producto,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                    subtotal=subtotal
                )                
                
                detalles_venta.append({
                    'producto': producto.nombre,
                    'cantidad': cantidad,
                    'precio_unitario': float(precio_unitario),
                    'subtotal': float(subtotal)
                })
                logger.info(f"Stock actualizado para {producto.nombre}: {producto.stock_actual}")
            
            # 4. Eliminar las reservas (en lugar de solo confirmarlas)
            reservas_eliminadas = []
            for reserva in reservas_pendientes:
                reservas_eliminadas.append({
                    'producto': reserva.id_producto.nombre,
                    'cantidad': reserva.cantidad
                })
                # Eliminar la reserva de la base de datos
                reserva.delete()
                logger.info(f"Reserva eliminada: {reserva.id_producto.nombre}")
            
            # 5. Crear notificación para el cliente
            self._crear_notificacion_compra(cliente, venta, detalles_venta)
            self._crear_notificacion_venta_vendedor(venta, detalles_venta)

            if productos_agotados:
                self._notificar_agotamiento_stock(venta, productos_agotados)
            
            # 6. Preparar respuesta
            response_data = {
                'message': 'Venta realizada exitosamente',
                'venta': VentaSerializer(venta).data,
                'detalles': {
                    'numero_venta': venta.id_venta,
                    'fecha': venta.fecha_venta.isoformat(),
                    'precio_total': float(precio_total),
                    'vendedor': {
                        'id': vendedor.id_usuario.id_usuario,
                        'email': vendedor.id_usuario.email
                    },
                    'productos_vendidos': detalles_venta,
                    'reservas_eliminadas': reservas_eliminadas if reservas_eliminadas else None
                },
                'status': 'success'
            }            
            
            logger.info(f"Venta completada exitosamente ID: {venta.id_venta}")
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error al realizar venta: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al procesar la venta',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_400_BAD_REQUEST)    
    
    def _crear_notificacion_compra_vendedores(self, venta, detalles_venta):
        """
        Crea notificación de venta para otros vendedores de la empresa
        """
        try:
            from notificaciones.models import Notificacion
            from relacion_notifica.models import Notifica
            from usuario_empresa.models import Usuario_Empresa
            from roles.models import Rol
            
            # Obtener empresa de la venta
            empresa = venta.usuario_empresa.empresa
            
            # Crear resumen de productos vendidos
            productos_texto = ", ".join([f"{detalle['cantidad']}x {detalle['producto']}" 
                                        for detalle in detalles_venta[:3]])  # Primeros 3 productos
            if len(detalles_venta) > 3:
                productos_texto += f" y {len(detalles_venta) - 3} productos más"
            
            # Crear la notificación
            notificacion = Notificacion.objects.create(
                titulo=f'Nueva venta #{venta.id_venta} realizada',
                mensaje=(
                    f'El vendedor {venta.usuario_empresa.id_usuario.email} ha realizado una venta. '
                    f'Cliente: {venta.cliente.nombre_cliente}. '
                    f'Total: ${venta.precio_total}. '
                    f'Productos: {productos_texto}.'
                ),
                tipo='success'
            )
            
            # Obtener rol vendedor
            rol_vendedor = Rol.objects.get(rol='vendedor')            
            
            # Buscar TODOS los vendedores activos de la empresa (no solo el que hizo la venta)
            vendedores_empresa = Usuario_Empresa.objects.filter(
                empresa=empresa,
                id_usuario__rol=rol_vendedor,
                estado='activo'
            ).exclude(
                id_usuario=venta.usuario_empresa.id_usuario  # Excluir al vendedor que hizo la venta
            ).select_related('id_usuario')
            
            # Crear notificaciones para cada vendedor
            notificaciones_creadas = 0
            for vendedor in vendedores_empresa:
                Notifica.objects.create(
                    id_usuario=vendedor.id_usuario,
                    id_notificacion=notificacion
                )
                notificaciones_creadas += 1
            
            logger.info(f"Notificación de venta creada para {notificaciones_creadas} vendedores en empresa {empresa.nombre}")
            
        except Exception as e:
            logger.error(f"Error al crear notificación de venta para vendedores: {str(e)}")
    
    def _crear_notificacion_compra(self, cliente, venta, detalles_venta):
        """
        Crea una notificación para el cliente sobre su compra
        """
        try:
            from notificaciones.models import Notificacion
            from relacion_notifica.models import Notifica
            
            # Crear notificación
            notificacion = Notificacion.objects.create(
                titulo='Compra realizada exitosamente',
                mensaje=(
                    f'El vendedor {venta.usuario_empresa.id_usuario.email} ha procesado tu compra #{venta.id_venta}. '
                    f'Total: ${venta.precio_total}. '
                ),
                tipo='success'
            )
            
            # Asociar notificación al cliente
            Notifica.objects.create(
                id_usuario=cliente,
                id_notificacion=notificacion
            )
            logger.info(f"Notificación creada para cliente {cliente.nombre_cliente}")
            
        except Exception as e:
            logger.error(f"Error al crear notificación: {str(e)}")
            # No fallar la venta si hay error en notificación

    def _notificar_agotamiento_stock(self, venta, productos_agotados):
        """
        Crea notificación cuando un producto se agota por la venta
        Solo para vendedores y admin_empresa de la misma empresa
        """
        try:
            from notificaciones.models import Notificacion
            from relacion_notifica.models import Notifica
            from usuario_empresa.models import Usuario_Empresa
            from roles.models import Rol
        
            # Obtener empresa de la venta
            empresa = venta.usuario_empresa.empresa
        
            # Crear lista de productos agotados
            productos_texto = ", ".join([f"{producto['nombre']}" for producto in productos_agotados[:3]])
            if len(productos_agotados) > 3:
                productos_texto += f" y {len(productos_agotados) - 3} más"
        
            # Crear notificación
            notificacion = Notificacion.objects.create(
                titulo=f'Producto(s) agotado(s) por venta #{venta.id_venta}',
                mensaje=(
                    f'La venta #{venta.id_venta} ha agotado el stock de: {productos_texto}. '
                    f'Es necesario reponer stock.'
                ),
                tipo='warning'
            )
            
            # Obtener roles permitidos (vendedor y admin_empresa)
            roles_permitidos = Rol.objects.filter(rol__in=['vendedor', 'admin_empresa'])
            
            # Buscar TODOS los usuarios de la empresa con roles vendedor o admin_empresa
            usuarios_empresa = Usuario_Empresa.objects.filter(
                empresa=empresa,
                id_usuario__rol__in=roles_permitidos,
                estado='activo'
            ).exclude(
                id_usuario=venta.usuario_empresa.id_usuario  # Excluir al vendedor que hizo la venta
            ).select_related('id_usuario')
            
            # Crear notificaciones para cada usuario
            notificaciones_creadas = 0
            for usuario in usuarios_empresa:
                Notifica.objects.create(
                    id_usuario=usuario.id_usuario,
                    id_notificacion=notificacion
                )
                notificaciones_creadas += 1
            
            logger.info(f"Notificación de agotamiento creada para {notificaciones_creadas} usuarios en empresa {empresa.nombre}")
            
        except Exception as e:
            logger.error(f"Error al crear notificación de agotamiento: {str(e)}")

    def _crear_notificacion_venta_vendedor(self, venta, detalles_venta):
        """
        Crea notificación solo para el vendedor que realizó la venta
        """
        try:
            from notificaciones.models import Notificacion
            from relacion_notifica.models import Notifica
            
            # Obtener vendedor que hizo la venta
            vendedor = venta.usuario_empresa.id_usuario
            
            # Crear resumen de productos vendidos
            productos_texto = ", ".join([f"{detalle['cantidad']}x {detalle['producto']}" 
                                        for detalle in detalles_venta[:3]])
            if len(detalles_venta) > 3:
                productos_texto += f" y {len(detalles_venta) - 3} productos más"
            
            # Crear la notificación
            notificacion = Notificacion.objects.create(
                titulo=f'Venta #{venta.id_venta} completada',
                mensaje=(
                    f'Has realizado una venta exitosa. '
                    f'Cliente: {venta.cliente.nombre_cliente}. '
                    f'Total: Bs. {venta.precio_total:.2f}. '
                    f'Productos: {productos_texto}.'
                ),
                tipo='success'
            )
            
            # Asociar notificación solo al vendedor que hizo la venta
            Notifica.objects.create(
                id_usuario=vendedor,
                id_notificacion=notificacion
            )
            
            logger.info(f"Notificación de venta creada para vendedor {vendedor.email}")
            
        except Exception as e:
            logger.error(f"Error al crear notificación de venta para vendedor: {str(e)}")

class HistorialComprasClienteView(generics.ListAPIView):
    """
    Vista para que un vendedor o admin_empresa vea el historial de compras de clientes
    """
    serializer_class = VentaSerializer
    permission_classes = [IsAuthenticated, EsVendedorOAdminEmpresaPermission]    
    def get_queryset(self):
        """
        Retorna las ventas de la empresa del vendedor
        """
        try:
            # Obtener el usuario_empresa (vendedor)
            usuario_empresa = Usuario_Empresa.objects.get(id_usuario=self.request.user)
            empresa = usuario_empresa.empresa
            
            # Obtener todas las ventas de la empresa
            queryset = Venta.objects.filter(usuario_empresa__empresa=empresa)
            
            # Filtrar por cliente específico si se proporciona
            cliente_id = self.request.query_params.get('cliente_id', None)
            if cliente_id:
                queryset = queryset.filter(cliente_id=cliente_id)            
            
            # Filtrar por fecha si se proporciona
            fecha_desde = self.request.query_params.get('fecha_desde', None)
            fecha_hasta = self.request.query_params.get('fecha_hasta', None)            
            
            if fecha_desde:
                queryset = queryset.filter(fecha_venta__gte=fecha_desde)
            if fecha_hasta:
                queryset = queryset.filter(fecha_venta__lte=fecha_hasta)            
            
            # Filtrar por vendedor si se proporciona
            vendedor_id = self.request.query_params.get('vendedor_id', None)
            if vendedor_id:
                queryset = queryset.filter(usuario_empresa_id=vendedor_id)            
            
            return queryset.order_by('-fecha_venta')            
            
        except Usuario_Empresa.DoesNotExist:
            return Venta.objects.none()    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())        
        # Calcular estadísticas
        total_ventas = queryset.count()
        total_ganancias = sum([venta.precio_total for venta in queryset])        
        return Response({
            'ventas': self.get_serializer(queryset, many=True).data,
            'estadisticas': {
                'total_ventas': total_ventas,
                'total_ganancias': float(total_ganancias),
                'promedio_venta': float(total_ganancias / total_ventas) if total_ventas > 0 else 0
            },
            'status': 'success'
        })

class EsVendedorPermission(permissions.BasePermission):
    """Permiso personalizado para verificar que el usuario sea vendedor"""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'rol') and 
            request.user.rol.rol in ['vendedor', 'admin_empresa']
        )


class ListaVentasVendedorView(generics.ListAPIView):
    """
    Vista para que un vendedor liste todas sus ventas realizadas
    Accesible solo para rol 'vendedor'
    """
    serializer_class = VentaSerializer
    permission_classes = [IsAuthenticated, EsVendedorPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['cliente', 'fecha_venta']
    ordering_fields = ['fecha_venta', 'precio_total']
    ordering = ['-fecha_venta']
    
    def get_queryset(self):
        """
        Retorna las ventas realizadas por el vendedor autenticado
        """
        try:
            # Obtener el usuario_empresa del vendedor autenticado
            usuario_empresa = Usuario_Empresa.objects.get(id_usuario=self.request.user)
            
            # Filtrar ventas por este vendedor
            queryset = Venta.objects.filter(
                usuario_empresa=usuario_empresa
            ).select_related(
                'cliente',
                'usuario_empresa',
                'usuario_empresa__id_usuario',
                'usuario_empresa__empresa'
            )
            
            # Aplicar filtros por fecha si se proporcionan
            fecha_inicio = self.request.query_params.get('fecha_inicio')
            fecha_fin = self.request.query_params.get('fecha_fin')
            
            if fecha_inicio:
                try:
                    fecha_inicio_dt = datetime.strptime(fecha_inicio, '%Y-%m-%d')
                    queryset = queryset.filter(fecha_venta__gte=fecha_inicio_dt)
                except ValueError:
                    logger.warning(f"Fecha inicio inválida: {fecha_inicio}")
            
            if fecha_fin:
                try:
                    fecha_fin_dt = datetime.strptime(fecha_fin, '%Y-%m-%d') + datetime.timedelta(days=1)
                    queryset = queryset.filter(fecha_venta__lt=fecha_fin_dt)
                except ValueError:
                    logger.warning(f"Fecha fin inválida: {fecha_fin}")
            
            # Filtrar por cliente si se proporciona
            cliente_id = self.request.query_params.get('cliente_id')
            if cliente_id:
                queryset = queryset.filter(cliente_id=cliente_id)
            
            # Filtrar por empresa (si el vendedor pertenece a una empresa específica)
            empresa_id = self.request.query_params.get('empresa_id')
            if empresa_id:
                queryset = queryset.filter(usuario_empresa__empresa_id=empresa_id)
            
            return queryset
            
        except Usuario_Empresa.DoesNotExist:
            logger.warning(f"Usuario vendedor {self.request.user.email} no tiene empresa asignada")
            return Venta.objects.none()
        except Exception as e:
            logger.error(f"Error obteniendo ventas del vendedor: {str(e)}", exc_info=True)
            return Venta.objects.none()
    
    def list(self, request, *args, **kwargs):
        """
        Sobrescribimos para agregar estadísticas y filtros personalizados
        """
        try:
            # Obtener el queryset filtrado
            queryset = self.filter_queryset(self.get_queryset())
            
            # Obtener datos del vendedor
            usuario_empresa = Usuario_Empresa.objects.get(id_usuario=request.user)
            empresa = usuario_empresa.empresa
            
            # Calcular estadísticas
            total_ventas = queryset.count()
            total_ganancias = sum(venta.precio_total for venta in queryset)
            ventas_hoy = queryset.filter(
                fecha_venta__date=datetime.now().date()
            ).count()
            ganancias_hoy = sum(
                venta.precio_total 
                for venta in queryset.filter(fecha_venta__date=datetime.now().date())
            )
            
            # Paginación
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response({
                    'ventas': serializer.data,
                    'estadisticas': {
                        'total_ventas': total_ventas,
                        'total_ganancias': float(total_ganancias),
                        'ventas_hoy': ventas_hoy,
                        'ganancias_hoy': float(ganancias_hoy),
                        'promedio_venta': float(total_ganancias / total_ventas) if total_ventas > 0 else 0
                    },
                    'vendedor_info': {
                        'id': request.user.id_usuario,
                        'email': request.user.email,
                        'nombre': request.user.nombre,
                        'empresa': {
                            'id': empresa.id_empresa,
                            'nombre': empresa.nombre,
                            'nit': empresa.nit
                        }
                    },
                    'filtros_aplicados': {
                        'fecha_inicio': request.query_params.get('fecha_inicio'),
                        'fecha_fin': request.query_params.get('fecha_fin'),
                        'cliente_id': request.query_params.get('cliente_id'),
                        'empresa_id': request.query_params.get('empresa_id'),
                        'ordenamiento': request.query_params.get('ordering', '-fecha_venta')
                    },
                    'status': 'success'
                })
            
            # Sin paginación
            serializer = self.get_serializer(queryset, many=True)
            
            return Response({
                'ventas': serializer.data,
                'estadisticas': {
                    'total_ventas': total_ventas,
                    'total_ganancias': float(total_ganancias),
                    'ventas_hoy': ventas_hoy,
                    'ganancias_hoy': float(ganancias_hoy),
                    'promedio_venta': float(total_ganancias / total_ventas) if total_ventas > 0 else 0
                },
                'vendedor_info': {
                    'id': request.user.id_usuario,
                    'email': request.user.email,
                    'empresa': {
                        'id': empresa.id_empresa,
                        'nombre': empresa.nombre,
                        'nit': empresa.nit
                    }
                },
                'filtros_aplicados': {
                    'fecha_inicio': request.query_params.get('fecha_inicio'),
                    'fecha_fin': request.query_params.get('fecha_fin'),
                    'cliente_id': request.query_params.get('cliente_id'),
                    'empresa_id': request.query_params.get('empresa_id'),
                    'ordenamiento': request.query_params.get('ordering', '-fecha_venta')
                },
                'status': 'success'
            })
            
        except Usuario_Empresa.DoesNotExist:
            return Response({
                'error': 'Vendedor sin empresa asignada',
                'detail': 'No tienes una empresa asignada. Contacta al administrador.',
                'status': 'error'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error listando ventas del vendedor: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al obtener ventas',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EliminarVentaView(generics.DestroyAPIView):
    """
    Vista para que un vendedor elimine una venta específica
    """
    permission_classes = [IsAuthenticated, EsVendedorPermission]
    
    def delete(self, request, id_venta, *args, **kwargs):
        """
        Elimina una venta específica
        """
        try:
            # 1. Verificar que el usuario sea vendedor y tenga empresa
            try:
                usuario_empresa = Usuario_Empresa.objects.get(id_usuario=request.user)
            except Usuario_Empresa.DoesNotExist:
                return Response({
                    'error': 'Vendedor sin empresa asignada',
                    'detail': 'No tienes una empresa asignada',
                    'status': 'error'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 2. Buscar la venta específica que pertenezca a este vendedor
            try:
                venta = Venta.objects.get(
                    id_venta=id_venta,
                )
            except Venta.DoesNotExist:
                logger.warning(f"Venta no encontrada: ID {id_venta}")
                return Response({
                    'error': 'Venta no encontrada',
                    'detail': f'No existe la venta con ID {id_venta} o no tienes permisos para eliminarla',
                    'status': 'error'
                }, status=status.HTTP_404_NOT_FOUND)
            
            venta_id = venta.id_venta
            
            # 3. Obtener detalles para logging
            detalles_venta = DetalleVenta.objects.filter(id_venta=venta)
            
            # 4. Registrar información
            info_venta = {
                'id_venta': venta.id_venta,
                'fecha_venta': venta.fecha_venta.isoformat(),
                'precio_total': float(venta.precio_total),
                'cliente_nombre': venta.cliente.nombre_cliente,
                'cantidad_productos': detalles_venta.count(),
            }
            
            logger.info(f"Vendedor {request.user.email} eliminando venta ID: {venta_id}")
            
            # 5. Eliminar detalles primero
            detalles_eliminados = detalles_venta.delete()
            logger.info(f"Detalles eliminados: {detalles_eliminados}")
            
            # 6. Eliminar venta
            venta.delete()
            
            logger.info(f"Venta ID: {venta_id} eliminada exitosamente")
            
            # 7. Notificación (opcional)
            try:
                self._crear_notificacion_eliminacion(request.user, info_venta)
            except Exception as notif_error:
                logger.error(f"Error en notificación: {str(notif_error)}")
                # No fallar la eliminación por error en notificación
            
            return Response({
                'message': 'Venta eliminada exitosamente',
                'detalles': {
                    'venta_id': venta_id,
                    'fecha_eliminacion': datetime.now().isoformat(),
                    'eliminado_por': request.user.email,
                    'informacion': info_venta
                },
                'advertencia': 'Esta acción no restaura el stock de los productos vendidos',
                'status': 'success'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error eliminando venta: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al eliminar la venta',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)