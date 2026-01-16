from datetime import datetime, timedelta
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from admins.models import Admin
from empresas.models import Empresa
from planes.models import Plan
from suscripciones.models import Suscripcion
from empresas.serializers import RegistroEmpresaSerializer, EmpresaSerializer
import logging

logger = logging.getLogger(__name__)

class RegistroEmpresaView(generics.CreateAPIView):
    """
    Vista para que un administrador registre una empresa
    """
    serializer_class = RegistroEmpresaSerializer
    permission_classes = [IsAuthenticated]
    
    def check_permissions(self, request):
        """Verifica que el usuario tenga rol 'admin'"""
        super().check_permissions(request)
        
        if not request.user.rol or request.user.rol.rol != 'admin':
            self.permission_denied(
                request,
                message="Solo administradores pueden registrar empresas",
                code=status.HTTP_403_FORBIDDEN
            )
    
    def create(self, request, *args, **kwargs):
        """
        Registra una nueva empresa con el admin autenticado
        y crea suscripción automáticamente
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            logger.info(f"Intento de registro de empresa por admin: {request.user.email}")
            
            validated_data = serializer.validated_data
            
            admin_sistema = self._obtener_admin_sistema(request.user)
            if not admin_sistema:
                return Response(
                    {
                        'error': 'Admin no encontrado',
                        'detail': 'El usuario admin no tiene registro en la tabla Admin',
                        'status': 'error'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 1. Obtener plan seleccionado
            plan_seleccionado = self._obtener_plan(request.data.get('plan_nombre'))
            if not plan_seleccionado:
                return Response(
                    {
                        'error': 'Plan no válido',
                        'detail': 'El plan especificado no existe. Planes disponibles: Free, Startup, Business, Enterprise',
                        'status': 'error'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 2. Crear empresa
            empresa = Empresa.objects.create(
                admin=admin_sistema,  # Cambiado de admin_id
                nombre=validated_data['nombre'],
                nit=validated_data['nit'],
                direccion=validated_data['direccion'],
                telefono=validated_data['telefono'],
                email=validated_data['email'],
                estado='inactivo'
            )
            
            logger.info(f"Empresa registrada exitosamente: {empresa.nombre}")
            
            # 3. Crear suscripción automáticamente
            suscripcion = self._crear_suscripcion(empresa, plan_seleccionado)
            
            logger.info(f"Suscripción creada: Empresa {empresa.nombre} -> Plan {plan_seleccionado.nombre}")
            
            # 4. Preparar respuesta
            response_data = {
                'message': 'Empresa registrada exitosamente con suscripción activa',
                'empresa': EmpresaSerializer(empresa).data,
                'admin_registrador': {
                    'id': admin_sistema.id_usuario.id_usuario,  # Cambiado
                    'email': request.user.email,
                    'nombre': admin_sistema.nombre_admin
                },
                'suscripcion': self._serializar_suscripcion(suscripcion),
                'nota': 'Para asignar un administrador de empresa, use la opción "Registrar Admin de Empresa"',
                'status': 'success'
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error en registro de empresa: {str(e)}", exc_info=True)
            
            # Si hubo error después de crear empresa, revertir
            if 'empresa' in locals():
                empresa.delete()
                logger.info(f"Empresa {empresa.nombre} eliminada por error")
            
            return Response(
                {
                    'error': 'Error en el registro de la empresa',
                    'detail': str(e),
                    'status': 'error'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _obtener_admin_sistema(self, user):
        """
        Obtiene el registro Admin del usuario con rol 'admin'
        """
        try:
            admin = Admin.objects.get(id_usuario=user)  # Cambiado de usuario
            return admin
        except Admin.DoesNotExist:
            # Si no existe registro en Admin, crear uno básico
            logger.warning(f"Usuario admin {user.email} no tiene registro en tabla Admin. Creando...")
            admin = Admin.objects.create(
                id_usuario=user,  # Cambiado de usuario
                nombre_admin=user.email.split('@')[0],
                telefono_admin="0000000000"
            )
            return admin
    
    def _obtener_plan(self, plan_nombre):
        """
        Obtiene el plan por nombre
        """
        if not plan_nombre:
            # Por defecto, usar plan Free
            plan_nombre = 'Free'
        
        try:
            plan = Plan.objects.get(nombre=plan_nombre)
            return plan
        except Plan.DoesNotExist:
            logger.error(f"Plan '{plan_nombre}' no encontrado")
            return None
    
    def _crear_suscripcion(self, empresa, plan):
        """
        Crea una suscripción para la empresa
        """
        # Calcular fecha de fin (hoy + duración del plan)
        fecha_inicio = timezone.now()
        fecha_fin = fecha_inicio + timedelta(days=plan.duracion_dias)
        
        # Determinar estado inicial
        estado = 'inactivo' if plan.precio == 0 else 'pendiente'
        
        suscripcion = Suscripcion.objects.create(
            plan=plan,
            empresa=empresa,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            estado=estado
        )
        
        return suscripcion
    
    def _serializar_suscripcion(self, suscripcion):
        """
        Serializa los datos de la suscripción para la respuesta
        """
        return {
            'id_suscripcion': suscripcion.id_suscripcion,
            'plan': {
                'nombre': suscripcion.plan.nombre,
                'precio': suscripcion.plan.precio,
                'duracion_dias': suscripcion.plan.duracion_dias,
                'limite_productos': suscripcion.plan.limite_productos,
                'limite_usuarios': suscripcion.plan.limite_usuarios,
                'descripcion': suscripcion.plan.descripcion
            },
            'fecha_inicio': suscripcion.fecha_inicio.isoformat(),
            'fecha_fin': suscripcion.fecha_fin.isoformat(),
            'estado': suscripcion.estado,
            'dias_restantes': (suscripcion.fecha_fin - timezone.now()).days
        }
        
from rest_framework.permissions import AllowAny
from rest_framework import generics, status, filters
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from empresas.models import Empresa
from empresas.serializers import EmpresaSerializer
import logging

logger = logging.getLogger(__name__)

class ListaEmpresasView(generics.ListAPIView):
    """
    Vista PÚBLICA para listar empresas activas
    Accesible por cualquier usuario (incluso sin autenticación)
    """
    serializer_class = EmpresaSerializer
    permission_classes = [AllowAny]  # ← Cambiado a AllowAny
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['rubro']  # Solo filtrar por rubro, no por estado
    search_fields = ['nombre', 'nit', 'rubro']
    ordering_fields = ['nombre', 'fecha_creacion']
    ordering = ['nombre']  # Orden alfabético por defecto
    
    def get_queryset(self):
        """
        Retorna solo empresas ACTIVAS para usuarios públicos
        """
        # Para usuarios no autenticados o cualquier usuario: solo empresas activas
        queryset = Empresa.objects.filter(estado='activo')
        
        # Si el usuario está autenticado, podemos dar información adicional
        user = self.request.user
        
        if user.is_authenticated:
            # ADMIN: Puede ver todas las empresas (incluyendo inactivas)
            if user.rol and user.rol.rol == 'admin':
                logger.info(f"Admin {user.email} viendo todas las empresas")
                return Empresa.objects.all()  # Admin ve todo
            
            # ADMIN_EMPRESA: Solo ve su empresa (incluso si no está activa)
            elif user.rol and user.rol.rol == 'admin_empresa':
                try:
                    from usuario_empresa.models import Usuario_Empresa
                    usuario_empresa = Usuario_Empresa.objects.get(id_usuario=user)
                    empresa_usuario = usuario_empresa.empresa
                    logger.info(f"Admin_empresa {user.email} viendo su empresa: {empresa_usuario.nombre}")
                    return Empresa.objects.filter(id_empresa=empresa_usuario.id_empresa)
                except Exception as e:
                    logger.warning(f"Admin_empresa {user.email} no tiene empresa: {str(e)}")
                    return queryset  # Si no tiene empresa, ver solo activas
        
        # Para usuarios no autenticados o clientes: solo empresas activas
        logger.info(f"Usuario {'no autenticado' if not user.is_authenticated else user.email} viendo empresas activas")
        return queryset
    
    def list(self, request, *args, **kwargs):
        """
        Sobrescribir para agregar información contextual
        """
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            
            # Información para el usuario
            user_info = None
            if request.user.is_authenticated:
                user_info = {
                    'email': request.user.email,
                    'rol': request.user.rol.rol if request.user.rol else None,
                    'estado': request.user.estado
                }
            
            # Paginación
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response({
                    'empresas': serializer.data,
                    'usuario': user_info,
                    'permisos': {
                        'puede_registrarse': True,  # Cualquiera puede registrarse
                        'vista': 'publica',
                        'filtros_disponibles': self.filterset_fields
                    },
                    'status': 'success'
                })
            
            # Sin paginación
            serializer = self.get_serializer(queryset, many=True)
            
            return Response({
                'empresas': serializer.data,
                'estadisticas': {
                    'total_listadas': queryset.count(),
                    'total_empresas_activas': total_empresas_activas,
                    'total_empresas_sistema': total_empresas_total,
                    'fecha_consulta': timezone.now().isoformat()
                },
                'usuario': user_info,
                'instrucciones': {
                    'registro': 'Para registrarte como cliente en una empresa, usa el endpoint /api/clientes/registro-cliente/',
                    'contacto': 'Cada empresa tiene su email y teléfono de contacto',
                    'seleccion': 'Usa los filtros para encontrar empresas por rubro o nombre'
                },
                'status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Error listando empresas: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al obtener empresas',
                'detail': str(e),
                'sugerencia': 'Intenta nuevamente más tarde',
                'status': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DetalleEmpresaView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vista para ver, actualizar o eliminar una empresa
    """
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]
    queryset = Empresa.objects.all()
    
    def check_permissions(self, request):
        """
        Verifica permisos según el rol
        """
        super().check_permissions(request)
        
        # Solo admin puede modificar/eliminar empresas
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            if not request.user.rol or request.user.rol.rol != 'admin':
                self.permission_denied(
                    request,
                    message="Solo administradores del sistema pueden modificar empresas",
                    code=status.HTTP_403_FORBIDDEN
                )

class CambiarEstadoEmpresaView(generics.UpdateAPIView):
    """
    Vista para cambiar el estado de una empresa
    Solo para administradores del sistema
    """
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]
    queryset = Empresa.objects.all()
    
    def check_permissions(self, request):
        super().check_permissions(request)
        if not request.user.rol or request.user.rol.rol != 'admin':
            self.permission_denied(
                request,
                message="Solo administradores del sistema pueden cambiar estados",
                code=status.HTTP_403_FORBIDDEN
            )
    
    def update(self, request, *args, **kwargs):
        empresa = self.get_object()
        nuevo_estado = request.data.get('estado')
        
        if nuevo_estado not in dict(Empresa.ESTADOS):
            return Response(
                {'error': 'Estado inválido', 'estados_permitidos': dict(Empresa.ESTADOS)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        empresa.estado = nuevo_estado
        empresa.save()
        
        return Response({
            'message': f'Estado de empresa actualizado a {nuevo_estado}',
            'empresa': EmpresaSerializer(empresa).data,
            'status': 'success'
        })