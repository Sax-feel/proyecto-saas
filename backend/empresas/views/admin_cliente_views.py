from django.utils import timezone
from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from relacion_tiene.models import Tiene
from empresas.models import Empresa
from empresas.serializers import EmpresaSerializer
import logging

logger = logging.getLogger(__name__)

class DetalleEmpresaClienteAdminView(generics.RetrieveAPIView):
    """
    Vista para ver detalle de una empresa específica
    - Admin: Puede ver cualquier empresa
    - Cliente: Solo empresas a las que está registrado
    """
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]
    queryset = Empresa.objects.all()
    lookup_field = 'id_empresa'
    
    def check_permissions(self, request):
        """
        Verifica que el usuario tenga permiso para ver esta empresa
        """
        super().check_permissions(request)
        
        empresa = self.get_object()
        user = request.user
        
        # Admin puede ver cualquier empresa
        if user.rol and user.rol.rol == 'admin':
            return
        
        # Cliente solo puede ver empresas a las que está registrado
        if user.rol and user.rol.rol == 'cliente':
            try:
                from cliente.models import Cliente
                cliente = Cliente.objects.get(id_usuario=user)
                
                # Verificar en tabla 'tiene'
                tiene_relacion = Tiene.objects.filter(
                    id_cliente=cliente,
                    id_empresa=empresa
                ).exists()
                
                if tiene_relacion:
                    return  # Tiene permiso
                
            except Exception:
                pass
        
        # Si no cumple ninguna condición, denegar
        self.permission_denied(
            request,
            message="No tiene permiso para ver esta empresa",
            code=status.HTTP_403_FORBIDDEN
        )
    
    def retrieve(self, request, *args, **kwargs):
        """
        Obtiene detalles de empresa con información adicional
        """
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            
            # Obtener información adicional según rol
            informacion_adicional = self._obtener_informacion_adicional(instance, request.user)
            
            return Response({
                'empresa': serializer.data,
                'informacion_adicional': informacion_adicional,
                'permisos': self._obtener_permisos_usuario(request.user, instance),
                'status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Error obteniendo empresa: {str(e)}", exc_info=True)
            return Response(
                {
                    'error': 'Error al obtener empresa',
                    'detail': str(e),
                    'status': 'error'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _obtener_informacion_adicional(self, empresa, user):
        """
        Obtiene información adicional según el rol
        """
        informacion = {}
        
        # Para admin: información completa
        if user.rol and user.rol.rol == 'admin':
            # Obtener admin_empresa asignado
            try:
                from usuario_empresa.models import Usuario_Empresa
                usuario_empresa = Usuario_Empresa.objects.filter(
                    empresa_id=empresa,
                    id_usuario__rol__rol='admin_empresa'
                ).first()
                
                if usuario_empresa:
                    admin_user = usuario_empresa.id_usuario
                    informacion['admin_empresa'] = {
                        'email': admin_user.email,
                        'estado': admin_user.estado,
                        'fecha_ultimo_login': admin_user.ultimo_login
                    }
            except Exception:
                pass
            
            # Obtener clientes registrados
            try:
                clientes_empresa = Tiene.objects.filter(id_empresa=empresa)
                informacion['clientes_registrados'] = clientes_empresa.count()
                
                # Listar algunos clientes
                clientes_lista = []
                for tiene in clientes_empresa.select_related('id_cliente__id_usuario')[:5]:
                    cliente = tiene.id_cliente
                    clientes_lista.append({
                        'nombre': cliente.nombre_cliente,
                        'nit': cliente.nit,
                        'email': cliente.id_usuario.email
                    })
                
                informacion['clientes_ejemplo'] = clientes_lista
            except Exception:
                pass
        
        # Para cliente: información básica
        elif user.rol and user.rol.rol == 'cliente':
            try:
                from cliente.models import Cliente
                cliente = Cliente.objects.get(id_usuario=user)
                
                # Verificar fecha de registro del cliente en esta empresa
                tiene_relacion = Tiene.objects.get(
                    id_cliente=cliente,
                    id_empresa=empresa
                )
                
                informacion['mi_registro'] = {
                    'fecha_registro': tiene_relacion.fecha_registro,
                    'estado': 'registrado'
                }
            except Exception:
                informacion['mi_registro'] = None
        
        return informacion
    
    def _obtener_permisos_usuario(self, user, empresa):
        """
        Retorna permisos específicos para esta empresa
        """
        permisos = {
            'puede_editar': False,
            'puede_suscribirse': False,
            'puede_contactar': True  # Todos pueden contactar
        }
        
        if user.rol and user.rol.rol == 'admin':
            permisos['puede_editar'] = True
        
        elif user.rol and user.rol.rol == 'cliente':
            # Verificar si ya está registrado
            try:
                from cliente.models import Cliente
                cliente = Cliente.objects.get(id_usuario=user)
                registrado = Tiene.objects.filter(
                    id_cliente=cliente,
                    id_empresa=empresa
                ).exists()
                
                permisos['puede_suscribirse'] = not registrado
            except Exception:
                pass
        
        return permisos



    
class ListaEmpresasClienteAdminView(generics.ListAPIView):
    """
    Vista para listar empresas según permisos:
    - Admin: Todas las empresas
    - Cliente: Solo empresas a las que está registrado (tabla 'tiene')
    """
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['estado']
    search_fields = ['nombre', 'nit', 'email']
    ordering_fields = ['id_empresa', 'nombre', 'fecha_creacion']
    ordering = ['nombre']
    
    def check_permissions(self, request):
        """
        Verifica que el usuario tenga rol 'admin' o 'cliente'
        """
        super().check_permissions(request)
        
        user = request.user
        if not user.rol or user.rol.rol not in ['admin', 'cliente']:
            self.permission_denied(
                request,
                message="Solo administradores o clientes pueden ver empresas",
                code=status.HTTP_403_FORBIDDEN
            )
    
    def get_queryset(self):
        """
        Retorna empresas según el rol del usuario
        """
        user = self.request.user
        
        # ADMIN: Puede ver todas las empresas
        if user.rol.rol == 'admin':
            logger.info(f"Admin {user.email} viendo todas las empresas")
            return Empresa.objects.all()
        
        # CLIENTE: Solo empresas a las que está registrado (tabla 'tiene')
        elif user.rol.rol == 'cliente':
            try:
                from cliente.models import Cliente
                # Obtener el cliente asociado al usuario
                cliente = Cliente.objects.get(id_usuario=user)
                
                # Obtener empresas a través de la tabla 'tiene'
                empresas_ids = Tiene.objects.filter(
                    id_cliente=cliente
                ).values_list('id_empresa', flat=True)
                
                empresas = Empresa.objects.filter(
                    id_empresa__in=empresas_ids,
                    estado='activo'  # Solo empresas activas para clientes
                )
                
                logger.info(f"Cliente {user.email} viendo {empresas.count()} empresas")
                return empresas
                
            except Exception as e:
                logger.error(f"Error obteniendo empresas para cliente {user.email}: {str(e)}")
                return Empresa.objects.none()
    
    def list(self, request, *args, **kwargs):
        """
        Sobrescribir para agregar información adicional
        """
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            # Obtener estadísticas
            estadisticas = self._obtener_estadisticas(queryset, request.user)
            
            # Paginación opcional
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response({
                    'empresas': serializer.data,
                    'estadisticas': estadisticas,
                    'permisos': self._obtener_permisos_usuario(request.user),
                    'status': 'success'
                })
            
            serializer = self.get_serializer(queryset, many=True)
            
            return Response({
                'empresas': serializer.data,
                'estadisticas': estadisticas,
                'total': queryset.count(),
                'permisos': self._obtener_permisos_usuario(request.user),
                'status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Error listando empresas: {str(e)}", exc_info=True)
            return Response(
                {
                    'error': 'Error al listar empresas',
                    'detail': str(e),
                    'status': 'error'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _obtener_estadisticas(self, queryset, user):
        """
        Obtiene estadísticas según el rol
        """
        total = queryset.count()
        
        # Contar por estado
        empresas_por_estado = {}
        for empresa in queryset:
            estado = empresa.estado
            empresas_por_estado[estado] = empresas_por_estado.get(estado, 0) + 1
        
        estadisticas = {
            'total_empresas': total,
            'por_estado': empresas_por_estado,
            'fecha_consulta': timezone.now().isoformat()
        }
        
        # Info adicional para admin
        if user.rol.rol == 'admin':
            from relacion_tiene.models import Tiene
            from usuario_empresa.models import Usuario_Empresa
            
            # Empresas sin clientes
            empresas_con_clientes = Tiene.objects.values('id_empresa').distinct()
            empresas_sin_clientes = queryset.exclude(
                id_empresa__in=empresas_con_clientes
            ).count()
            
            # Empresas sin admin_empresa
            empresas_con_admin = Usuario_Empresa.objects.filter(
                id_usuario__rol__rol='admin_empresa'
            ).values('empresa_id').distinct()
            empresas_sin_admin = queryset.exclude(
                id_empresa__in=empresas_con_admin
            ).count()
            
            estadisticas.update({
                'empresas_sin_clientes': empresas_sin_clientes,
                'empresas_sin_admin': empresas_sin_admin
            })
        
        # Info adicional para cliente
        elif user.rol.rol == 'cliente':
            try:
                from cliente.models import Cliente
                cliente = Cliente.objects.get(id_usuario=user)
                
                # Contar total de empresas activas
                total_empresas_activas = Empresa.objects.filter(estado='activo').count()
                
                estadisticas.update({
                    'total_empresas_disponibles': total_empresas_activas,
                    'porcentaje_registrado': round((total / total_empresas_activas * 100), 1) if total_empresas_activas > 0 else 0
                })
            except Exception:
                pass
        
        return estadisticas
    
    def _obtener_permisos_usuario(self, user):
        """
        Retorna permisos del usuario para esta vista
        """
        permisos = {
            'rol': user.rol.rol,
            'puede_crear': False,
            'puede_editar': False,
            'puede_eliminar': False,
            'puede_cambiar_estado': False,
            'vista': 'limitada' if user.rol.rol == 'cliente' else 'completa'
        }
        
        if user.rol.rol == 'admin':
            permisos.update({
                'puede_crear': True,
                'puede_editar': True,
                'puede_eliminar': True,
                'puede_cambiar_estado': True
            })
        
        return permisos


