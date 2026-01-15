# suscripciones/serializers.py
from rest_framework import serializers
from .models import Suscripcion
from empresas.serializers import EmpresaSerializer
from planes.serializers import PlanSerializer
from usuarios.serializers import PerfilUsuarioSerializer
import os

class ComprobantePagoField(serializers.FileField):
    """Campo personalizado para validar archivos PDF"""
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
    
    def to_internal_value(self, data):
        # Validar que sea un archivo
        if not data:
            raise serializers.ValidationError("Debe adjuntar un comprobante de pago")
        
        # Validar extensión PDF
        file_name = data.name.lower()
        if not file_name.endswith('.pdf'):
            raise serializers.ValidationError("El archivo debe ser PDF (.pdf)")
        
        # Validar tamaño (máximo 5MB)
        max_size = 5 * 1024 * 1024  # 5MB
        if data.size > max_size:
            raise serializers.ValidationError(f"El archivo no debe superar los 5MB. Tamaño actual: {data.size / 1024 / 1024:.2f}MB")
        
        return super().to_internal_value(data)


class SolicitudSuscripcionSerializer(serializers.Serializer):
    """
    Serializador para solicitar una nueva suscripción
    """
    plan_nombre = serializers.CharField(max_length=100, required=True)
    comprobante_pago = ComprobantePagoField(required=True)
    observaciones = serializers.CharField(required=False, allow_blank=True, max_length=500)
    
    def validate_plan_nombre(self, value):
        """Validar que el plan exista"""
        from planes.models import Plan
        try:
            plan = Plan.objects.get(nombre__iexact=value)
            return plan
        except Plan.DoesNotExist:
            planes_disponibles = list(Plan.objects.values_list('nombre', flat=True))
            raise serializers.ValidationError(
                f"Plan '{value}' no existe. Planes disponibles: {', '.join(planes_disponibles)}"
            )
    
    def validate(self, data):
        """Validaciones adicionales"""
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError("Request no disponible en contexto")
        
        user = request.user  # Esto es un objeto User, NO una Empresa
        
        # Verificar que el usuario sea admin_empresa
        if not user.rol or user.rol.rol != 'admin_empresa':
            raise serializers.ValidationError({
                'error': 'Solo administradores de empresa pueden solicitar suscripciones'
            })
        
        # Obtener la empresa del admin_empresa
        try:
            from usuario_empresa.models import Usuario_Empresa
            usuario_empresa_rel = Usuario_Empresa.objects.get(id_usuario=user)
            empresa = usuario_empresa_rel.empresa_id  # Esto SÍ es una instancia de Empresa
            
            # Verificar si ya tiene una suscripción activa o pendiente
            from .models import Suscripcion
            suscripcion_activa = Suscripcion.objects.filter(
                empresa_id=empresa,  # Usar la instancia de Empresa
                estado__in=['activo', 'pendiente']
            ).exists()
            
            if suscripcion_activa:
                raise serializers.ValidationError({
                    'error': 'Ya tienes una suscripción activa o pendiente'
                })
            
            # Guardar la empresa en el contexto para usarla después
            self.context['empresa'] = empresa
            
        except Usuario_Empresa.DoesNotExist:
            raise serializers.ValidationError({
                'error': 'No estás asociado a ninguna empresa como administrador'
            })
        
        return data
    
    def create(self, validated_data):
        """Este método no se usa realmente, pero Django lo espera"""
        pass


class SuscripcionSerializer(serializers.ModelSerializer):
    """
    Serializador completo para suscripciones
    """
    plan = PlanSerializer(source='plan_id', read_only=True)
    empresa = EmpresaSerializer(source='empresa_id', read_only=True)
    admin_aprobador_info = PerfilUsuarioSerializer(source='admin_aprobador', read_only=True)
    dias_restantes = serializers.SerializerMethodField()
    comprobante_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Suscripcion
        fields = [
            'id_suscripcion',
            'plan',
            'empresa',
            'fecha_inicio',
            'fecha_fin',
            'estado',
            'dias_restantes',
            'comprobante_url',
            'comprobante_pago',
            'fecha_aprobacion',
            'admin_aprobador_info',
            'observaciones',
            'fecha_solicitud'
        ]
        read_only_fields = [
            'id_suscripcion', 'fecha_inicio', 'fecha_fin', 
            'estado', 'fecha_aprobacion', 'admin_aprobador',
            'fecha_solicitud'
        ]
    
    def get_dias_restantes(self, obj):
        """Calcula días restantes de la suscripción"""
        from django.utils import timezone
        if obj.estado != 'activo':
            return 0
        
        hoy = timezone.now().date()
        fecha_fin = obj.fecha_fin.date()
        
        if fecha_fin < hoy:
            return 0
        
        return (fecha_fin - hoy).days
    
    def get_comprobante_url(self, obj):
        """Retorna URL del comprobante si existe"""
        if obj.comprobante_pago:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.comprobante_pago.url)
        return None


class SuscripcionResumenSerializer(serializers.ModelSerializer):
    """
    Serializador resumido para listar suscripciones
    """
    plan_nombre = serializers.CharField(source='plan_id.nombre')
    empresa_nombre = serializers.CharField(source='empresa_id.nombre')
    precio_plan = serializers.FloatField(source='plan_id.precio')
    
    class Meta:
        model = Suscripcion
        fields = [
            'id_suscripcion',
            'plan_nombre',
            'empresa_nombre',
            'precio_plan',
            'fecha_inicio',
            'fecha_fin',
            'estado',
            'fecha_solicitud'
        ]