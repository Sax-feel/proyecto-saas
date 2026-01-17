# empresas/serializers.py
from rest_framework import serializers
from .models import Empresa
from admins.models import Admin

class EmpresaSerializer(serializers.ModelSerializer):
    """Serializador para el modelo Empresa"""
    admin_registro = serializers.SerializerMethodField()
    cantidad_clientes = serializers.SerializerMethodField()
    suscripciones_info = serializers.SerializerMethodField()  # ← NUEVO
    
    class Meta:
        model = Empresa
        fields = [
            'id_empresa', 'nombre', 'nit', 'direccion', 'rubro',
            'telefono', 'email', 'estado', 'fecha_creacion',
            'fecha_actualizacion', 'admin_registro', 'cantidad_clientes',
            'suscripciones_info'  # ← NUEVO
        ]
        read_only_fields = [
            'id_empresa', 'fecha_creacion', 'fecha_actualizacion',
            'admin_registro', 'cantidad_clientes', 'suscripciones_info'
        ]
    
    def get_admin_registro(self, obj):
        """Obtiene info del admin que REGISTRÓ la empresa"""
        if obj.admin:
            return {
                'id': obj.admin.id_usuario.id_usuario,
                'nombre': obj.admin.nombre_admin,
                'email': obj.admin.id_usuario.email,
            }
        return None
    
    def get_cantidad_clientes(self, obj):
        """Obtiene cantidad de clientes registrados"""
        try:
            from relacion_tiene.models import Tiene
            return Tiene.objects.filter(id_empresa=obj).count()
        except Exception:
            return 0
    
    def get_suscripciones_info(self, obj):
        """Obtiene información de suscripciones de la empresa"""
        try:
            from suscripciones.models import Suscripcion
            suscripciones = Suscripcion.objects.filter(empresa=obj).order_by('-fecha_solicitud')
            
            suscripciones_data = []
            for suscripcion in suscripciones:
                suscripciones_data.append({
                    'id_suscripcion': suscripcion.id_suscripcion,
                    'plan': suscripcion.plan.nombre,
                    'estado': suscripcion.estado,
                    'fecha_inicio': suscripcion.fecha_inicio.isoformat(),
                    'fecha_fin': suscripcion.fecha_fin.isoformat(),
                    'fecha_solicitud': suscripcion.fecha_solicitud.isoformat()
                })
            
            return {
                'total': suscripciones.count(),
                'activas': suscripciones.filter(estado='activo').count(),
                'pendientes': suscripciones.filter(estado='pendiente').count(),
                'historial': suscripciones_data[:5]  # Últimas 5
            }
        except Exception:
            return {'total': 0, 'activas': 0, 'pendientes': 0, 'historial': []}


class RegistroEmpresaSerializer(serializers.Serializer):
    """Serializador para registro de empresa"""
    nombre = serializers.CharField(max_length=100, required=True)
    nit = serializers.CharField(max_length=20, required=True)
    rubro = serializers.CharField(max_length=20, required=True)  # ← Añadido rubro
    direccion = serializers.CharField(max_length=200, required=True)
    telefono = serializers.CharField(max_length=15, required=True)
    email = serializers.EmailField(required=True)
    
    def validate_nit(self, value):
        """Validar que el NIT no esté registrado"""
        if Empresa.objects.filter(nit=value).exists():
            raise serializers.ValidationError("Este NIT ya está registrado")
        return value
    
    def validate_email(self, value):
        """Validar que el email de empresa no esté registrado"""
        if Empresa.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este email de empresa ya está registrado")
        return value