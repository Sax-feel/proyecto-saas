# suscripciones/views.py
from django.utils import timezone
from datetime import timedelta
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.conf import settings
from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from .models import Suscripcion
from admins.models import Admin
from .serializers import (
    SolicitudSuscripcionSerializer,
    SuscripcionSerializer,
    SuscripcionResumenSerializer
)
from usuarios.models import User
import logging
import os

logger = logging.getLogger(__name__)


class SolicitarSuscripcionView(generics.GenericAPIView):
    """
    Vista para que un admin_empresa solicite una suscripción
    Envía correo a administradores del sistema con comprobante PDF
    """
    serializer_class = SolicitudSuscripcionSerializer
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        
        try:
            serializer.is_valid(raise_exception=True)
            
            admin_empresa_user = request.user
            plan = serializer.validated_data['plan_nombre']
            comprobante_pago = serializer.validated_data.get('comprobante_pago')
            observaciones = serializer.validated_data.get('observaciones', '')
            
            # 1. Obtener empresa del contexto del serializer
            empresa = serializer.context.get('empresa')
            if not empresa:
                # Si no está en el contexto, obtener del admin
                empresa = self._obtener_empresa_del_admin(admin_empresa_user)
                if not empresa:
                    return Response({
                        'error': 'Empresa no encontrada',
                        'detail': 'El usuario no está asociado a ninguna empresa',
                        'status': 'error'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # 2. Calcular fecha de fin según duración del plan
            fecha_inicio = timezone.now()
            fecha_fin = fecha_inicio + timedelta(days=plan.duracion_dias)
            
            # 3. Crear suscripción en estado 'pendiente'
            suscripcion = Suscripcion.objects.create(
                plan=plan,  # Cambiado de plan_id
                empresa=empresa,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                estado='pendiente',
                comprobante_pago=comprobante_pago,
                observaciones=observaciones,
                fecha_solicitud=fecha_inicio
            )

            self._crear_notificacion_admins(
                suscripcion=suscripcion,
                empresa=empresa,
                admin_solicitante=admin_empresa_user
            )
            
            # 4. ACTUALIZAR ESTADO DE LA EMPRESA A 'pendiente'
            empresa.estado = 'pendiente'
            empresa.save()
            
            logger.info(f"Suscripción solicitada: {suscripcion.id_suscripcion} - Empresa: {empresa.nombre} (estado actualizado a 'pendiente') - Plan: {plan.nombre}")
            
            # 5. Enviar correo a administradores
            self._enviar_correo_a_admins(suscripcion, admin_empresa_user, empresa)
            
            # 6. Preparar respuesta
            response_data = {
                'message': 'Solicitud de suscripción enviada exitosamente',
                'detail': 'Se ha enviado un correo a los administradores con el comprobante de pago',
                'suscripcion': {
                    'id': suscripcion.id_suscripcion,
                    'plan': plan.nombre,
                    'empresa': empresa.nombre,
                    'precio': plan.precio,
                    'fecha_inicio': fecha_inicio.isoformat(),
                    'fecha_fin': fecha_fin.isoformat(),
                    'estado': 'pendiente',
                    'comprobante': comprobante_pago.name if comprobante_pago else None
                },
                'empresa_actualizada': {
                    'id': empresa.id_empresa,
                    'nombre': empresa.nombre,
                    'estado': empresa.estado,
                    'fecha_actualizacion': empresa.fecha_actualizacion.isoformat()
                },
                'status': 'success'
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except ValidationError as e:
            # Manejar errores de validación del serializer
            return Response({
                'error': 'Error de validación',
                'detail': e.detail,
                'status': 'error'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error solicitando suscripción: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al procesar la solicitud',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def _crear_notificacion_suscripcion_admins(self, suscripcion):
        """
        Crea notificación solo para los administradores del sistema
        sobre una nueva solicitud de suscripción
        """
        try:
            from notificaciones.models import Notificacion
            from relacion_notifica.models import Notifica
            from usuarios.models import User

            # 1. Obtener admins activos
            admins = User.objects.filter(
                rol__rol='admin',
                estado='activo'
            )

            if not admins.exists():
                logger.warning("No hay administradores activos para notificar")
                return

            # 2. Crear resumen de la suscripción (plan + empresa)
            resumen = f'Empresa: {suscripcion.empresa.nombre}, Plan: {suscripcion.plan.nombre}'

            # 3. Crear la notificación
            notificacion = Notificacion.objects.create(
                titulo=f'Nueva solicitud de suscripción #{suscripcion.id_suscripcion}',
                mensaje=(
                    f'Se ha solicitado una nueva suscripción.\n'
                    f'{resumen}.\n'
                    f'Estado: {suscripcion.estado.upper()}.'
                ),
                tipo='info'
            )

            # 4. Asociar notificación a todos los admins
            for admin in admins:
                Notifica.objects.create(
                    id_usuario=admin,
                    id_notificacion=notificacion
                )

            logger.info(f"Notificación de suscripción creada para {admins.count()} admins")

        except Exception as e:
            logger.error(f"Error al crear notificación de suscripción para admins: {str(e)}")
    
    def _obtener_empresa_del_admin(self, admin_empresa_user):
        """Obtiene la empresa asociada al admin_empresa"""
        try:
            from usuario_empresa.models import Usuario_Empresa
            usuario_empresa_rel = Usuario_Empresa.objects.select_related('empresa').get(
                id_usuario=admin_empresa_user
            )
            return usuario_empresa_rel.empresa
        except Usuario_Empresa.DoesNotExist:
            logger.error(f"Usuario {admin_empresa_user.email} no tiene relación Usuario_Empresa")
            return None
        except Exception as e:
            logger.error(f"Error obteniendo empresa del admin: {str(e)}")
            return None
    
    def _enviar_correo_a_admins(self, suscripcion, admin_solicitante, empresa):
        """Envía correo a administradores del sistema"""
        try:
            # 1. Obtener todos los administradores del sistema
            admins = User.objects.filter(
                rol__rol='admin',
                estado='activo'
            ).select_related('rol').order_by('fecha_creacion')
            
            if not admins.exists():
                logger.warning("No hay administradores registrados para enviar correo")
                return
            
            # 2. Tomar el primer admin (más antiguo)
            admin_principal = admins.first()
            try:
                admin_objeto = Admin.objects.get(id_usuario=admin_principal)
                nombre_admin = admin_objeto.nombre_admin
            except Admin.DoesNotExist:
                nombre_admin = admin_principal.email.split('@')[0]
                logger.warning(f"Admin {admin_principal.email} no tiene registro en tabla Admin")
            
            # 3. Obtener todos los objetos Admin para el CC
            admin_emails = []
            for admin_user in admins:
                try:
                    admin_obj = Admin.objects.get(id_usuario=admin_user)
                    admin_emails.append(admin_user.email)
                except Admin.DoesNotExist:
                    # Si no tiene registro Admin, usar igualmente el email
                    admin_emails.append(admin_user.email)
            
            # 4. Preparar datos para el correo
            contexto = {
                'suscripcion': suscripcion,
                'admin_solicitante': admin_solicitante,
                'empresa': empresa,
                'plan': suscripcion.plan,
                'fecha_solicitud': timezone.now(),
                'admin_principal': {
                    'email': admin_principal.email,
                    'nombre': nombre_admin,
                    'fecha_registro': admin_principal.fecha_creacion.strftime('%d/%m/%Y')
                },
                'total_admins': admins.count(),
                'admin_url': f"{settings.FRONTEND_URL}/admin/suscripciones/{suscripcion.id_suscripcion}"
            }
            
            # 5. Renderizar contenido del correo
            subject = f'💰 Nueva Solicitud de Suscripción - {empresa.nombre}'
            html_message = render_to_string('emails/solicitud_suscripcion.html', contexto)
            
            # 6. Crear email con archivo adjunto
            email = EmailMessage(
                subject=subject,
                body=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[admin_principal.email],
                cc=[admin.email for admin in admins[1:5]] if admins.count() > 1 else []
            )
            email.content_subtype = "html"
            
            # 7. Adjuntar archivo PDF si existe
            if suscripcion.comprobante_pago and os.path.exists(suscripcion.comprobante_pago.path):
                with open(suscripcion.comprobante_pago.path, 'rb') as pdf_file:
                    email.attach(
                        f'comprobante_pago_{suscripcion.id_suscripcion}.pdf',
                        pdf_file.read(),
                        'application/pdf'
                    )
            
            # 8. Enviar correo
            email.send()
            
            logger.info(f"Correo enviado a {admin_principal.email} y {len(admins)-1} CCs")
            
        except Exception as e:
            logger.error(f"Error enviando correo a admins: {str(e)}", exc_info=True)
            raise
    
    def _build_reset_url(self, request, token):
        """
        Construir URL para frontend
        """
        # URL para frontend Next.js
        reset_url = 'http://localhost:3000/login'  # Cambiar según tu frontend
        
        return reset_url


class ListaSuscripcionesView(generics.ListAPIView):
    """
    Vista para listar TODAS las suscripciones
    Accesible solo por cualquiera
    """
    serializer_class = SuscripcionResumenSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['estado', 'plan', 'empresa']  # Cambiado
    search_fields = ['empresa__nombre', 'plan__nombre', 'observaciones']  # Cambiado
    ordering_fields = ['fecha_solicitud', 'fecha_inicio', 'fecha_fin', 'plan__precio']  # Cambiado
    ordering = ['-fecha_solicitud']
    
    def get_queryset(self):
        """Retorna todas las suscripciones"""
        return Suscripcion.objects.select_related('plan', 'empresa').all()  # Cambiado
    
    def list(self, request, *args, **kwargs):
        """Lista con estadísticas"""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            # Obtener estadísticas
            estadisticas = self._obtener_estadisticas(queryset)
            
            # Paginación
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response({
                    'suscripciones': serializer.data,
                    'estadisticas': estadisticas,
                    'status': 'success'
                })
            
            serializer = self.get_serializer(queryset, many=True)
            
            return Response({
                'suscripciones': serializer.data,
                'estadisticas': estadisticas,
                'total': queryset.count(),
                'status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Error listando suscripciones: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al obtener suscripciones',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _obtener_estadisticas(self, queryset):
        """Genera estadísticas de suscripciones"""
        total = queryset.count()
        
        # Por estado
        por_estado = {}
        for suscripcion in queryset:
            estado = suscripcion.estado
            por_estado[estado] = por_estado.get(estado, 0) + 1
        
        # Por plan
        por_plan = {}
        ingresos_pendientes = 0
        ingresos_activos = 0
        
        for suscripcion in queryset:
            plan_nombre = suscripcion.plan.nombre  # Cambiado
            por_plan[plan_nombre] = por_plan.get(plan_nombre, 0) + 1
            
            # Calcular ingresos
            if suscripcion.estado == 'pendiente':
                ingresos_pendientes += suscripcion.plan.precio  # Cambiado
            elif suscripcion.estado == 'activo':
                ingresos_activos += suscripcion.plan.precio  # Cambiado
        
        return {
            'total_suscripciones': total,
            'por_estado': por_estado,
            'por_plan': por_plan,
            'ingresos': {
                'pendientes': round(ingresos_pendientes, 2),
                'activos': round(ingresos_activos, 2),
                'total_potencial': round(ingresos_pendientes + ingresos_activos, 2)
            },
            'suscripciones_hoy': queryset.filter(fecha_solicitud__date=timezone.now().date()).count()
        }


class DetalleSuscripcionView(generics.RetrieveAPIView):
    """
    Vista para ver detalles de una suscripción específica
    Accesible por admin o admin_empresa de la empresa relacionada
    """
    serializer_class = SuscripcionSerializer
    permission_classes = [IsAuthenticated]
    queryset = Suscripcion.objects.all()
    lookup_field = 'id_suscripcion'
    
    def check_permissions(self, request):
        """Verifica permisos según rol"""
        super().check_permissions(request)
        
        suscripcion = self.get_object()
        usuario = request.user
        
        # Permitir si es admin del sistema
        if usuario.rol and usuario.rol.rol == 'admin':
            return
        
        # Permitir si es admin_empresa de la empresa de la suscripción
        if usuario.rol and usuario.rol.rol == 'admin_empresa':
            try:
                from usuario_empresa.models import Usuario_Empresa
                usuario_empresa = Usuario_Empresa.objects.get(id_usuario=usuario)
                if usuario_empresa.empresa == suscripcion.empresa:  # Cambiado
                    return
            except Exception:
                pass
        
        # Si no cumple ninguna condición, denegar
        self.permission_denied(
            request,
            message="No tienes permiso para ver esta suscripción",
            code=status.HTTP_403_FORBIDDEN
        )
    
    def retrieve(self, request, *args, **kwargs):
        """Obtiene detalles con información adicional"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance, context={'request': request})
            
            # Agregar información de historial si es admin
            informacion_adicional = {}
            if request.user.rol and request.user.rol.rol == 'admin':
                informacion_adicional = self._obtener_informacion_admin(instance)
            
            return Response({
                'suscripcion': serializer.data,
                'informacion_adicional': informacion_adicional,
                'status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Error obteniendo suscripción: {str(e)}", exc_info=True)
            return Response({
                'error': 'Error al obtener la suscripción',
                'detail': str(e),
                'status': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _obtener_informacion_admin(self, suscripcion):
        """Obtiene información adicional para administradores"""
        informacion = {
            'historial_estados': [],
            'suscripciones_relacionadas': []
        }
        
        # Obtener suscripciones anteriores de la misma empresa
        anteriores = Suscripcion.objects.filter(
            empresa=suscripcion.empresa  # Cambiado
        ).exclude(id_suscripcion=suscripcion.id_suscripcion).order_by('-fecha_solicitud')
        
        if anteriores.exists():
            informacion['suscripciones_relacionadas'] = [
                {
                    'id': s.id_suscripcion,
                    'plan': s.plan.nombre,  # Cambiado
                    'estado': s.estado,
                    'fecha_solicitud': s.fecha_solicitud.isoformat()
                }
                for s in anteriores[:5]
            ]
        
        return informacion


class MisSuscripcionesView(generics.ListAPIView):
    """
    Vista para que un admin_empresa vea las suscripciones de su empresa
    """
    serializer_class = SuscripcionSerializer
    permission_classes = [IsAuthenticated]
    
    def check_permissions(self, request):
        """Verifica que sea admin_empresa"""
        super().check_permissions(request)
        
        if not request.user.rol or request.user.rol.rol != 'admin_empresa':
            self.permission_denied(
                request,
                message="Solo administradores de empresa pueden ver sus suscripciones",
                code=status.HTTP_403_FORBIDDEN
            )
    
    def get_queryset(self):
        """Retorna suscripciones de la empresa del usuario"""
        try:
            from usuario_empresa.models import Usuario_Empresa
            usuario_empresa = Usuario_Empresa.objects.get(id_usuario=self.request.user)
            empresa = usuario_empresa.empresa
            
            return Suscripcion.objects.filter(
                empresa=empresa
            ).select_related('plan', 'empresa').order_by('-fecha_solicitud')  # Cambiado
        except Exception:
            return Suscripcion.objects.none()