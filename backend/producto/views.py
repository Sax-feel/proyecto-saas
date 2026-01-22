from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.viewsets import ModelViewSet
from django_filters.rest_framework import DjangoFilterBackend
from django.db import models
from .models import Producto
from .serializers import ProductoSerializer, ProductoCreateSerializer, ProductoPublicSerializer
from categoria.views import IsAdminEmpresa
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from empresas.models import Empresa
from .models import Producto
from .serializers import ProductoPublicSerializer, ProductoSerializer
import logging

logger = logging.getLogger(__name__)

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
        
        # Verificar que la categoría pertenezca a la misma empresa
        categoria_id = request.data.get('categoria')
        if categoria_id:
            try:
                from categoria.models import Categoria
                categoria = Categoria.objects.get(id_categoria=categoria_id)
                if categoria.empresa != empresa:
                    return Response({
                        'status': 'error',
                        'message': 'La categoría no pertenece a su empresa'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except Categoria.DoesNotExist:
                return Response({
                    'status': 'error',
                    'message': 'Categoría no encontrada'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar que el proveedor exista
        proveedor_id = request.data.get('proveedor')
        if proveedor_id:
            try:
                from proveedor.models import Proveedor
                proveedor = Proveedor.objects.get(id_proveedor=proveedor_id)
            except Proveedor.DoesNotExist:
                return Response({
                    'status': 'error',
                    'message': 'Proveedor no encontrado'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        
        producto = serializer.save(empresa=empresa)

        if producto.stock_actual <= producto.stock_minimo:
            self._crear_notificacion_stock_bajo(producto)
        
        return Response({
            'status': 'success',
            'message': 'Producto creado exitosamente',
            'data': ProductoSerializer(producto).data
        }, status=status.HTTP_201_CREATED)
    
    def _crear_notificacion_stock_bajo(self, producto):
        """
        Crea notificación de stock bajo para admin_empresa y vendedores
        """
        try:
            from notificaciones.models import Notificacion
            from relacion_notifica.models import Notifica
            from usuario_empresa.models import Usuario_Empresa
            from roles.models import Rol
            
            # Crear la notificación
            notificacion = Notificacion.objects.create(
                titulo=f'Stock bajo en producto nuevo: {producto.nombre}',
                mensaje=(
                    f'El producto "{producto.nombre}" fue creado con stock bajo. '
                    f'Stock actual: {producto.stock_actual}, Stock mínimo: {producto.stock_minimo}. '
                    f'Se recomienda reponer stock.'
                ),
                tipo='warning'
            )
            
            # Obtener roles necesarios
            rol_admin_empresa = Rol.objects.get(rol='admin_empresa')
            rol_vendedor = Rol.objects.get(rol='vendedor')
            
            # Buscar admin_empresa y vendedores de la empresa
            usuarios_empresa = Usuario_Empresa.objects.filter(
                empresa=producto.empresa,
                id_usuario__rol__in=[rol_admin_empresa, rol_vendedor],
                estado='activo'
            ).select_related('id_usuario')
            
            # Crear notificaciones para cada usuario
            notificaciones_creadas = 0
            for usuario_empresa in usuarios_empresa:
                Notifica.objects.create(
                    id_usuario=usuario_empresa.id_usuario,
                    id_notificacion=notificacion
                )
                notificaciones_creadas += 1
            
            logger.info(f"Notificación de stock bajo creada para {notificaciones_creadas} usuarios en empresa {producto.empresa.nombre}")
            
        except Exception as e:
            logger.error(f"Error al crear notificación de stock bajo: {str(e)}")
    
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
        # Obtener instancia actual para comparar stock
        instance = self.get_object()
        stock_anterior = instance.stock_actual
        
        # Mantener la empresa original
        empresa = self.request.user.usuario_empresa.empresa
        producto_actualizado = serializer.save(empresa=empresa)

        if (producto_actualizado.stock_actual <= producto_actualizado.stock_minimo and 
            stock_anterior > producto_actualizado.stock_minimo):
            self._crear_notificacion_stock_bajo(producto_actualizado, es_actualizacion=True)

    
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
    
    def _crear_notificacion_stock_bajo(self, producto, es_actualizacion=False):
        """
        Crea notificación de stock bajo para admin_empresa y vendedores
        """
        try:
            from notificaciones.models import Notificacion
            from relacion_notifica.models import Notifica
            from usuario_empresa.models import Usuario_Empresa
            from roles.models import Rol
            
            # Determinar el mensaje según si es creación o actualización
            if es_actualizacion:
                titulo = f'Stock bajo en producto actualizado: {producto.nombre}'
                mensaje = (
                    f'El producto "{producto.nombre}" ha sido actualizado y ahora tiene stock bajo. '
                    f'Stock actual: {producto.stock_actual}, Stock mínimo: {producto.stock_minimo}. '
                    f'Se recomienda reponer stock.'
                )
            else:
                titulo = f'Stock bajo en producto nuevo: {producto.nombre}'
                mensaje = (
                    f'El producto "{producto.nombre}" fue creado con stock bajo. '
                    f'Stock actual: {producto.stock_actual}, Stock mínimo: {producto.stock_minimo}. '
                    f'Se recomienda reponer stock.'
                )
            
            # Crear la notificación
            notificacion = Notificacion.objects.create(
                titulo=titulo,
                mensaje=mensaje,
                tipo='warning'
            )
            
            # Obtener roles necesarios
            try:
                rol_admin_empresa = Rol.objects.get(rol='admin_empresa')
                rol_vendedor = Rol.objects.get(rol='vendedor')
                
                roles_filtro = [rol_admin_empresa, rol_vendedor]
            except Rol.DoesNotExist:
                # Si no existen los roles, usar solo admin_empresa como fallback
                try:
                    rol_admin_empresa = Rol.objects.get(rol='admin_empresa')
                    roles_filtro = [rol_admin_empresa]
                except Rol.DoesNotExist:
                    logger.warning(f"Roles no encontrados para notificación de stock bajo")
                    return
            
            # Buscar admin_empresa y vendedores de la empresa
            usuarios_empresa = Usuario_Empresa.objects.filter(
                empresa=producto.empresa,
                id_usuario__rol__in=roles_filtro,
                estado='activo'
            ).select_related('id_usuario')
            
            # Crear notificaciones para cada usuario
            notificaciones_creadas = 0
            for usuario_empresa in usuarios_empresa:
                Notifica.objects.create(
                    id_usuario=usuario_empresa.id_usuario,
                    id_notificacion=notificacion
                )
                notificaciones_creadas += 1
            
            logger.info(f"Notificación de stock bajo creada para {notificaciones_creadas} usuarios en empresa {producto.empresa.nombre}")
            
        except Exception as e:
            logger.error(f"Error al crear notificación de stock bajo: {str(e)}")
            # No fallar la actualización si hay error en notificación

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
    


class ProductosPorEmpresaView(generics.ListAPIView):
    """
    Vista para obtener productos de una empresa específica
    GET para cualquiera - Solo productos activos
    """
    serializer_class = ProductoPublicSerializer
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, id_empresa=None, *args, **kwargs):
        """
        Obtiene productos de una empresa específica
        Se puede pasar id_empresa por URL o por query param
        """
        try:
            # Obtener ID de empresa de la URL o query params
            empresa_id = id_empresa or request.query_params.get('empresa_id')
            
            if not empresa_id:
                return Response({
                    'status': 'error',
                    'message': 'Se requiere el ID de la empresa',
                    'detail': 'Proporcione el parámetro empresa_id en la URL o query params'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verificar que la empresa exista y esté activa
            empresa = get_object_or_404(
                Empresa, 
                id_empresa=empresa_id,
                estado='activo'
            )
            
            # Obtener productos activos de la empresa
            productos = Producto.objects.filter(
                empresa=empresa,
                estado='activo'
            ).select_related('categoria', 'proveedor', 'empresa')
            
            # Aplicar filtros adicionales si existen
            categoria_id = request.query_params.get('categoria_id')
            if categoria_id:
                productos = productos.filter(categoria_id=categoria_id)
            
            proveedor_id = request.query_params.get('proveedor_id')
            if proveedor_id:
                productos = productos.filter(proveedor_id=proveedor_id)
            
            nombre = request.query_params.get('nombre', '')
            if nombre:
                productos = productos.filter(nombre__icontains=nombre)
            
            # Filtros de precio
            precio_min = request.query_params.get('precio_min')
            precio_max = request.query_params.get('precio_max')
            
            if precio_min:
                productos = productos.filter(precio__gte=precio_min)
            if precio_max:
                productos = productos.filter(precio__lte=precio_max)
            
            # Filtro de stock
            solo_disponibles = request.query_params.get('solo_disponibles', '').lower() == 'true'
            if solo_disponibles:
                productos = productos.filter(stock_actual__gt=0)
            
            # Ordenamiento
            orden = request.query_params.get('orden', 'nombre')
            if orden in ['nombre', 'precio', 'stock_actual', 'fecha_creacion']:
                if orden.startswith('-'):
                    productos = productos.order_by(orden)
                else:
                    productos = productos.order_by(orden)
            else:
                productos = productos.order_by('nombre')
            
            serializer = self.get_serializer(productos, many=True)
            
            return Response({
                'status': 'success',
                'empresa': {
                    'id_empresa': empresa.id_empresa,
                    'nombre': empresa.nombre,
                    'nit': empresa.nit,
                    'rubro': empresa.rubro
                },
                'cantidad_productos': productos.count(),
                'estadisticas': {
                    'productos_activos': productos.count(),
                    'productos_agotados': productos.filter(stock_actual__lte=0).count(),
                    'productos_disponibles': productos.filter(stock_actual__gt=0).count(),
                    'precio_promedio': productos.aggregate(
                        avg=models.Avg('precio')
                    )['avg'] or 0
                },
                'productos': serializer.data
            })
            
        except Empresa.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Empresa no encontrada',
                'detail': f'No se encontró una empresa activa con ID {empresa_id}'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': 'Error al obtener productos',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProductosPorEmpresaAdminView(generics.ListAPIView):
    """
    Vista para obtener productos de la empresa del admin_empresa y vendedor
    Solo para admin_empresa autenticado - Incluye todos los estados
    """
    serializer_class = ProductoSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        """
        Obtiene productos de la empresa del admin_empresa autenticado
        """
        try:
            # Verificar que el usuario sea admin_empresa o vendedor
            if not hasattr(request.user, 'rol') or request.user.rol.rol not in ['admin_empresa', 'vendedor']:
                return Response({
                    'status': 'error',
                    'message': 'Permiso denegado',
                    'detail': 'Solo los administradores de empresa pueden acceder a esta vista'
                }, status=status.HTTP_403_FORBIDDEN)
            
            if not hasattr(request.user, 'usuario_empresa'):
                return Response({
                    'status': 'error',
                    'message': 'Usuario sin empresa asignada',
                    'detail': 'El usuario no está asociado a ninguna empresa'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Obtener la empresa del admin_empresa
            empresa = request.user.usuario_empresa.empresa
            
            # Obtener productos (incluye todos los estados para admin)
            productos = Producto.objects.filter(empresa=empresa).select_related(
                'categoria', 'proveedor', 'empresa'
            )
            
            # Aplicar filtros si existen
            estado = request.query_params.get('estado', '')
            if estado:
                productos = productos.filter(estado=estado)
            
            categoria_id = request.query_params.get('categoria_id')
            if categoria_id:
                productos = productos.filter(categoria_id=categoria_id)
            
            proveedor_id = request.query_params.get('proveedor_id')
            if proveedor_id:
                productos = productos.filter(proveedor_id=proveedor_id)
            
            nombre = request.query_params.get('nombre', '')
            if nombre:
                productos = productos.filter(nombre__icontains=nombre)
            
            # Filtros especiales para admin
            necesita_reponer = request.query_params.get('necesita_reponer', '').lower() == 'true'
            if necesita_reponer:
                productos = productos.filter(stock_actual__lte=models.F('stock_minimo'))
            
            agotados = request.query_params.get('agotados', '').lower() == 'true'
            if agotados:
                productos = productos.filter(stock_actual__lte=0)
            
            serializer = self.get_serializer(productos, many=True)
            
            # Calcular estadísticas
            total_productos = productos.count()
            productos_activos = productos.filter(estado='activo').count()
            productos_agotados = productos.filter(stock_actual__lte=0).count()
            productos_reponer = productos.filter(
                stock_actual__lte=models.F('stock_minimo'),
                stock_actual__gt=0
            ).count()
            valor_inventario = sum(
                p.precio * p.stock_actual 
                for p in productos 
                if p.precio and p.stock_actual
            )
            
            return Response({
                'status': 'success',
                'empresa': {
                    'id_empresa': empresa.id_empresa,
                    'nombre': empresa.nombre,
                    'nit': empresa.nit,
                    'estado': empresa.estado
                },
                'cantidad_productos': total_productos,
                'estadisticas': {
                    'productos_activos': productos_activos,
                    'productos_inactivos': productos.filter(estado='inactivo').count(),
                    'productos_agotados': productos_agotados,
                    'productos_reponer': productos_reponer,
                    'valor_total_inventario': valor_inventario,
                    'categorias_diferentes': productos.values('categoria').distinct().count()
                },
                'filtros_aplicados': {
                    'estado': estado,
                    'categoria_id': categoria_id,
                    'proveedor_id': proveedor_id,
                    'nombre': nombre,
                    'necesita_reponer': necesita_reponer,
                    'agotados': agotados
                },
                'productos': serializer.data
            })
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': 'Error al obtener productos',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProductosPorEmpresaConDetallesView(generics.GenericAPIView):
    """
    Vista para obtener productos de una empresa con detalles completos
    GET para cualquiera - Con información de archivos
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, id_empresa):
        """
        Obtiene productos de una empresa con detalles de archivos
        """
        try:
            # Verificar que la empresa exista y esté activa
            empresa = get_object_or_404(
                Empresa, 
                id_empresa=id_empresa,
                estado='activo'
            )
            
            # Obtener productos activos de la empresa
            productos = Producto.objects.filter(
                empresa=empresa,
                estado='activo'
            ).select_related('categoria', 'proveedor', 'empresa')
            
            # Preparar respuesta con detalles
            productos_con_detalles = []
            
            for producto in productos:
                # Obtener archivos del producto
                try:
                    from archivo.models import Archivo
                    archivos = Archivo.objects.filter(
                        producto=producto
                    ).order_by('orden')[:5]  # Límite de 5 archivos por producto
                    
                    archivos_data = []
                    for archivo in archivos:
                        archivos_data.append({
                            'id_archivo': archivo.id_archivo,
                            'nombre': archivo.nombre,
                            'tipo_archivo': archivo.tipo_archivo,
                            'orden': archivo.orden
                        })
                except Exception:
                    archivos_data = []
                
                productos_con_detalles.append({
                    'id_producto': producto.id_producto,
                    'nombre': producto.nombre,
                    'descripcion': producto.descripcion,
                    'precio': float(producto.precio),
                    'stock_actual': producto.stock_actual,
                    'stock_minimo': producto.stock_minimo,
                    'estado': producto.estado,
                    'fecha_creacion': producto.fecha_creacion,
                    'categoria': {
                        'id_categoria': producto.categoria.id_categoria if producto.categoria else None,
                        'nombre': producto.categoria.nombre if producto.categoria else 'Sin categoría'
                    },
                    'proveedor': {
                        'id_proveedor': producto.proveedor.id_proveedor if producto.proveedor else None,
                        'nombre': producto.proveedor.nombre if producto.proveedor else 'Sin proveedor'
                    },
                    'empresa_nombre': producto.empresa.nombre,
                    'necesita_reponer': producto.necesita_reponer,
                    'agotado': producto.agotado,
                    'archivos': archivos_data,
                    'cantidad_archivos': len(archivos_data)
                })
            
            return Response({
                'status': 'success',
                'empresa': {
                    'id_empresa': empresa.id_empresa,
                    'nombre': empresa.nombre,
                    'nit': empresa.nit,
                    'rubro': empresa.rubro,
                    'telefono': empresa.telefono,
                    'email': empresa.email,
                    'direccion': empresa.direccion
                },
                'productos': productos_con_detalles,
                'totales': {
                    'productos_activos': productos.count(),
                    'productos_disponibles': productos.filter(stock_actual__gt=0).count(),
                    'productos_agotados': productos.filter(stock_actual__lte=0).count(),
                    'valor_inventario': sum(p.precio * p.stock_actual for p in productos)
                }
            })
            
        except Empresa.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Empresa no encontrada',
                'detail': f'No se encontró una empresa activa con ID {id_empresa}'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': 'Error al obtener productos',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)