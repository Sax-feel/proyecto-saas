# empresas/serializers.py
from rest_framework import serializers
from .models import Empresa
from admins.models import Admin

class EmpresaSerializer(serializers.ModelSerializer):
    """Serializador para el modelo Empresa"""
    admin_registro = serializers.SerializerMethodField()
    cantidad_clientes = serializers.SerializerMethodField()
    
    class Meta:
        model = Empresa
        fields = [
            'id_empresa', 'nombre', 'nit', 'direccion', 
            'telefono', 'email', 'estado', 'fecha_creacion',
            'fecha_actualizacion', 'admin_registro', 'cantidad_clientes'
        ]
        read_only_fields = [
            'id_empresa', 'fecha_creacion', 'fecha_actualizacion',
            'admin_registro', 'cantidad_clientes'
        ]
    def get_admin_registro(self, obj):
        """Obtiene info del admin que REGISTRÓ la empresa"""
        if obj.admin_id:
            return {
                'id': obj.admin_id.id_usuario.id_usuario,
                'nombre': obj.admin_id.nombre_admin,
                'email': obj.admin_id.id_usuario.email
            }
        return None
    
    def get_tiene_admin_empresa(self, obj):
        """Verifica si la empresa tiene un admin_empresa asignado"""
        try:
            from usuario_empresa.models import Usuario_Empresa
            tiene_admin = Usuario_Empresa.objects.filter(
                empresa_id=obj,
                id_usuario__rol__rol='admin_empresa'
            ).exists()
            return tiene_admin
        except Exception:
            return False
    
    def get_cantidad_clientes(self, obj):
        """Obtiene cantidad de clientes registrados"""
        try:
            from relacion_tiene.models import Tiene
            return Tiene.objects.filter(id_empresa=obj).count()
        except Exception:
            return 0

class RegistroEmpresaSerializer(serializers.Serializer):
    """Serializador para registro de empresa - CON plan"""
    # Datos de empresa SOLAMENTE
    nombre = serializers.CharField(max_length=100, required=True)
    nit = serializers.CharField(max_length=20, required=True)
    direccion = serializers.CharField(max_length=200, required=True)
    telefono = serializers.CharField(max_length=15, required=True)
    email = serializers.EmailField(required=True)
    plan_nombre = serializers.CharField(
        max_length=100, 
        required=False, 
        default='Free',
        help_text="Nombre del plan: Free, Startup, Business, Enterprise"
    )
    
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
    
    def validate_plan_nombre(self, value):
        """Validar que el plan exista"""
        if value:
            try:
                from planes.models import Plan
                Plan.objects.get(nombre=value)
                return value
            except Plan.DoesNotExist:
                raise serializers.ValidationError(
                    f"Plan '{value}' no existe. Planes disponibles: Free, Startup, Business, Enterprise"
                )
        return value