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
    - Solo admin puede registrar
    - El admin que registra se guarda en admin_id automáticamente
    - Crea automáticamente una suscripción según el plan seleccionado
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
                admin_id=admin_sistema, 
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
                    'id': admin_sistema.id_usuario.id_usuario,
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
            admin = Admin.objects.get(id_usuario=user)
            return admin
        except Admin.DoesNotExist:
            # Si no existe registro en Admin, crear uno básico
            logger.warning(f"Usuario admin {user.email} no tiene registro en tabla Admin. Creando...")
            admin = Admin.objects.create(
                id_usuario=user,
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
        # Si el plan es gratuito, activar inmediatamente
        # Si es de pago, poner como pendiente hasta el pago
        estado = 'inactivo' if plan.precio == 0 else 'pendiente'
        
        suscripcion = Suscripcion.objects.create(
            plan_id=plan,
            empresa_id=empresa,
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
                'nombre': suscripcion.plan_id.nombre,
                'precio': suscripcion.plan_id.precio,
                'duracion_dias': suscripcion.plan_id.duracion_dias,
                'limite_productos': suscripcion.plan_id.limite_productos,
                'limite_usuarios': suscripcion.plan_id.limite_usuarios,
                'descripcion': suscripcion.plan_id.descripcion
            },
            'fecha_inicio': suscripcion.fecha_inicio.isoformat(),
            'fecha_fin': suscripcion.fecha_fin.isoformat(),
            'estado': suscripcion.estado,
            'dias_restantes': (suscripcion.fecha_fin - timezone.now()).days
        }
        
class ListaEmpresasView(generics.ListAPIView):
    """
    Vista para listar empresas
    Solo admin puede ver todas las empresas
    """
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.rol and self.request.user.rol.rol == 'admin':
            return Empresa.objects.all()
        
        elif self.request.user.rol and self.request.user.rol.rol == 'admin_empresa':
            try:
                from usuario_empresa.models import Usuario_Empresa
                usuario_empresa = Usuario_Empresa.objects.get(id_usuario=self.request.user)
                return Empresa.objects.filter(id_empresa=usuario_empresa.empresa_id.id_empresa)
            except Exception:
                return Empresa.objects.none()
        
        return Empresa.objects.none()


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