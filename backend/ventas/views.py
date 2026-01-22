# ventas/views.py
import datetime
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
from reservas.views import EsClientePermission
from usuario_empresa.models import Usuario_Empresa

logger = logging.getLogger(__name__)

class AsignarVendedorService:
    """
    Servicio para asignar automáticamente un vendedor a una venta
    """
    
    @staticmethod
    def asignar_vendedor_automatico(empresa_id):
        """
        Asigna automáticamente un vendedor a la venta
        
        Reglas:
        1. Busca usuarios con rol 'vendedor' en la empresa
        2. Si solo hay uno, ese será asignado
        3. Si hay más de uno, escoge al que tenga menos ventas asignadas
        4. Si hay empate, escoge al primero disponible
        """
        try:
            # Importaciones dentro del método para evitar circular imports
            from usuario_empresa.models import Usuario_Empresa
            from roles.models import Rol
            
            # 1. Obtener rol 'vendedor'
            try:
                rol_vendedor = Rol.objects.get(rol='vendedor')
            except Rol.DoesNotExist:
                logger.error("Rol 'vendedor' no encontrado en el sistema")
                return None
            
            # 2. Buscar vendedores activos en la empresa
            vendedores = Usuario_Empresa.objects.filter(
                empresa_id=empresa_id,
                id_usuario__rol=rol_vendedor,
                estado='activo'
            ).select_related('id_usuario')
            
            if not vendedores:
                logger.warning(f"No hay vendedores activos en la empresa {empresa_id}")
                return None
            
            # 3. Si solo hay un vendedor, asignarlo
            if vendedores.count() == 1:
                vendedor = vendedores.first()
                logger.info(f"Un solo vendedor disponible: {vendedor.id_usuario.email}")
                return vendedor
            
            # 4. Si hay más de uno, contar ventas por vendedor
            vendedores_con_ventas = []
            for vendedor in vendedores:
                ventas_count = Venta.objects.filter(usuario_empresa=vendedor).count()
                vendedores_con_ventas.append({
                    'vendedor': vendedor,
                    'ventas_count': ventas_count
                })
            
            # 5. Ordenar por menor cantidad de ventas
            vendedores_con_ventas.sort(key=lambda x: x['ventas_count'])
            
            # 6. Tomar el vendedor con menos ventas
            menor_ventas = vendedores_con_ventas[0]['ventas_count']
            candidatos = [
                v['vendedor'] for v in vendedores_con_ventas 
                if v['ventas_count'] == menor_ventas
            ]
            
            # 7. Si hay empate, tomar el primero (podría mejorarse con disponibilidad)
            vendedor_asignado = candidatos[0]
            
            logger.info(
                f"Vendedor asignado automáticamente: {vendedor_asignado.id_usuario.email} "
                f"con {menor_ventas} ventas"
            )
            
            return vendedor_asignado
            
        except Exception as e:
            logger.error(f"Error al asignar vendedor automático: {str(e)}", exc_info=True)
            return None


class RealizarCompraView(generics.CreateAPIView):
    """
    Vista para que un cliente realice una compra
    """
    serializer_class = RealizarCompraSerializer
    permission_classes = [IsAuthenticated, EsClientePermission]
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        try:
            logger.info(f"Intento de compra por cliente: {request.user.email}")
            
            serializer = self.get_serializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            
            validated_data = serializer.validated_data
            cliente = validated_data['cliente']
            productos_info = validated_data['productos_info']
            precio_total = validated_data['precio_total']
            reservas_pendientes = validated_data['reservas_pendientes']
            
            # 1. Determinar empresa (asumimos que todos los productos son de la misma empresa)
            empresa = productos_info[0]['producto'].empresa
            
            # 2. Asignar vendedor automáticamente
            vendedor_asignado = AsignarVendedorService.asignar_vendedor_automatico(
                empresa.id_empresa
            )
            
            if not vendedor_asignado:
                return Response({
                    'error': 'No hay vendedores disponibles para atender la compra',
                    'detail': 'Por favor contacte al administrador de la empresa',
                    'status': 'error'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 3. Crear venta
            venta = Venta.objects.create(
                usuario_empresa=vendedor_asignado,
                cliente=cliente,
                precio_total=precio_total
            )
            
            logger.info(f"Venta creada ID: {venta.id_venta}")
            
            # 4. Crear detalles de venta y actualizar stock
            detalles_venta = []
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
                elif producto.stock_actual <= producto.stock_minimo:
                    producto.estado = 'activo'  # Mantener activo pero con stock bajo
                
                producto.save()
                
                # Crear detalle de venta
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
                
                logger.info(f"Detalle venta creado: {producto.nombre} x{cantidad}")
            
            # 5. Actualizar estado de reservas a 'confirmada'
            reservas_confirmadas = []
            for reserva in reservas_pendientes:
                reserva.estado = 'confirmada'
                reserva.save()
                reservas_confirmadas.append({
                    'producto': reserva.id_producto.nombre,
                    'cantidad': reserva.cantidad
                })
                logger.info(f"Reserva confirmada: {reserva.id_producto.nombre}")
            
            # 6. Crear notificación para el cliente
            self._crear_notificacion_compra(cliente, venta, detalles_venta)

            self._crear_notificacion_compra_vendedores(venta, detalles_venta)
            
            # 7. Preparar respuesta
            response_data = {
                'message': 'Compra realizada exitosamente',
                'venta': VentaSerializer(venta).data,
                'detalles': {
                    'numero_venta': venta.id_venta,
                    'fecha': venta.fecha_venta.isoformat(),
                    'precio_total': float(precio_total),
                    'vendedor_asignado': {
                        'id': vendedor_asignado.id_usuario.id_usuario,
                        'email': vendedor_asignado.id_usuario.email
                    },
                    'productos_comprados': detalles_venta,
                    'reservas_confirmadas': reservas_confirmadas if reservas_confirmadas else None
                },
                'status': 'success'
            }
            
            logger.info(f"Compra completada exitosamente ID Venta: {venta.id_venta}")
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        
            
        except Exception as e:
            logger.error(f"Error al realizar compra: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al procesar la compra',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def _crear_notificacion_compra_vendedores(self, venta, detalles_venta):
        """
        Crea notificación de compra para todos los vendedores de la empresa
        """
        try:
            from notificaciones.models import Notificacion
            from relacion_notifica.models import Notifica
            from usuario_empresa.models import Usuario_Empresa
            from roles.models import Rol
            
            # Obtener empresa de la venta
            empresa = venta.usuario_empresa.empresa
            
            # Crear resumen de productos comprados
            productos_texto = ", ".join([f"{detalle['cantidad']}x {detalle['producto']}" 
                                        for detalle in detalles_venta[:3]])  # Primeros 3 productos
            if len(detalles_venta) > 3:
                productos_texto += f" y {len(detalles_venta) - 3} productos más"
            
            # Crear la notificación
            notificacion = Notificacion.objects.create(
                titulo=f'Nueva venta #{venta.id_venta} realizada',
                mensaje=(
                    f'El cliente {venta.cliente.nombre_cliente} ha realizado una compra. '
                    f'Total: ${venta.precio_total}. '
                    f'Productos: {productos_texto}. '
                    f'Vendedor asignado: {venta.usuario_empresa.id_usuario.nombre}'
                ),
                tipo='success'
            )
            
            # Obtener rol vendedor
            rol_vendedor = Rol.objects.get(rol='vendedor')
            
            # Buscar TODOS los vendedores activos de la empresa (no solo el asignado)
            vendedores_empresa = Usuario_Empresa.objects.filter(
                empresa=empresa,
                id_usuario__rol=rol_vendedor,
                estado='activo'
            ).exclude(
                id_usuario=venta.usuario_empresa.id_usuario  # Excluir al vendedor asignado
            ).select_related('id_usuario')
            
            # Crear notificaciones para cada vendedor
            notificaciones_creadas = 0
            for vendedor in vendedores_empresa:
                Notifica.objects.create(
                    id_usuario=vendedor.id_usuario,
                    id_notificacion=notificacion
                )
                notificaciones_creadas += 1
            
            logger.info(f"Notificación de compra creada para {notificaciones_creadas} vendedores en empresa {empresa.nombre}")
            
        except Exception as e:
            logger.error(f"Error al crear notificación de compra para vendedores: {str(e)}")
    
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
                    f'Tu compra #{venta.id_venta} ha sido procesada exitosamente. '
                    f'Total: ${venta.precio_total}. '
                    f'Vendedor asignado: {venta.usuario_empresa.id_usuario.nombre}'
                ),
                tipo='success'
            )
            
            # Asociar notificación al cliente
            Notifica.objects.create(
                id_cliente=cliente,
                id_notificacion=notificacion
            )
            
            logger.info(f"Notificación creada para cliente {cliente.nombre_cliente}")
            
        except Exception as e:
            logger.error(f"Error al crear notificación: {str(e)}")
            # No fallar la compra si hay error en notificación


class HistorialComprasClienteView(generics.ListAPIView):
    """
    Vista para que un cliente vea su historial de compras
    """
    serializer_class = VentaSerializer
    permission_classes = [IsAuthenticated, EsClientePermission]
    
    def get_queryset(self):
        """
        Retorna las compras del cliente autenticado
        """
        try:
            from cliente.models import Cliente
            cliente = Cliente.objects.get(id_usuario=self.request.user)
            
            queryset = Venta.objects.filter(cliente=cliente)
            
            # Filtrar por empresa si se proporciona
            empresa_id = self.request.query_params.get('empresa_id', None)
            if empresa_id:
                queryset = queryset.filter(usuario_empresa__empresa_id=empresa_id)
            
            # Filtrar por fecha si se proporciona
            fecha_desde = self.request.query_params.get('fecha_desde', None)
            fecha_hasta = self.request.query_params.get('fecha_hasta', None)
            
            if fecha_desde:
                queryset = queryset.filter(fecha_venta__gte=fecha_desde)
            if fecha_hasta:
                queryset = queryset.filter(fecha_venta__lte=fecha_hasta)
            
            return queryset.order_by('-fecha_venta')
            
        except Cliente.DoesNotExist:
            return Venta.objects.none()
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Calcular estadísticas
        total_compras = queryset.count()
        total_gastado = sum([venta.precio_total for venta in queryset])
        
        return Response({
            'compras': self.get_serializer(queryset, many=True).data,
            'estadisticas': {
                'total_compras': total_compras,
                'total_gastado': float(total_gastado),
                'promedio_compra': float(total_gastado / total_compras) if total_compras > 0 else 0
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
            request.user.rol.rol == 'vendedor'
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