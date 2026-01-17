from rest_framework import serializers
from .models import Cliente
from usuarios.models import User
from rest_framework import serializers
from .models import Cliente
from usuarios.models import User
from empresas.models import Empresa
from relacion_tiene.models import Tiene
from rest_framework import serializers
from .models import AuditoriaCliente

class ClienteSerializer(serializers.ModelSerializer):
    """Serializador para el modelo Cliente"""
    
    class Meta:
        model = Cliente
        fields = ['nit', 'nombre_cliente', 'direccion_cliente', 'telefono_cliente']
        read_only_fields = ['id_usuario']


class RegistroClienteSerializer(serializers.Serializer):
    """Serializador para registro público de cliente con selección de empresa"""
    # Datos del usuario
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    
    # Datos del cliente
    nit = serializers.CharField(max_length=20, required=True)
    nombre_cliente = serializers.CharField(max_length=100, required=True)
    direccion_cliente = serializers.CharField(max_length=200, required=True)
    telefono_cliente = serializers.CharField(max_length=15, required=True)
    
    # Nombre de la empresa a la que se quiere registrar
    empresa_nombre = serializers.CharField(
        max_length=100, 
        required=True,
        help_text="Nombre de la empresa a la que quiere registrarse"
    )
    
    def validate_email(self, value):
        """Validar que el email no esté registrado"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este email ya está registrado")
        return value
    
    def validate_nit(self, value):
        """Validar que el NIT no esté registrado"""
        if Cliente.objects.filter(nit=value).exists():
            raise serializers.ValidationError("Este NIT ya está registrado")
        return value
    
    def validate_empresa_nombre(self, value):
        """Validar que la empresa exista y esté activa"""
        try:
            empresa = Empresa.objects.get(nombre__iexact=value, estado='activo')
            return empresa
        except Empresa.DoesNotExist:
            # Mostrar empresas disponibles
            empresas_disponibles = Empresa.objects.filter(
                estado='activo'
            ).values_list('nombre', flat=True)[:10]
            
            if empresas_disponibles:
                raise serializers.ValidationError(
                    f"Empresa '{value}' no encontrada o no está activa. "
                    f"Empresas disponibles: {', '.join(empresas_disponibles)}"
                )
            else:
                raise serializers.ValidationError(
                    f"Empresa '{value}' no encontrada. No hay empresas activas disponibles."
                )
            
class EmailEmpresaSerializer(serializers.Serializer):
    """Serializador para registrar cliente existente mediante email"""
    email = serializers.EmailField(required=True)
    empresa_id = serializers.IntegerField(required=True)
    
    def validate_email(self, value):
        """Validar que el usuario exista y sea cliente"""
        try:
            user = User.objects.get(email=value)
            
            # Verificar que sea cliente
            if not user.rol or user.rol.rol != 'cliente':
                raise serializers.ValidationError("El usuario no es un cliente")
            
            # Verificar que exista el registro de cliente
            try:
                cliente = Cliente.objects.get(id_usuario=user)
                return user  # Retornar el usuario para usarlo después
            except Cliente.DoesNotExist:
                raise serializers.ValidationError("El cliente no tiene perfil completo")
                
        except User.DoesNotExist:
            raise serializers.ValidationError("Usuario no encontrado")
    
    def validate_empresa_id(self, value):
        """Validar que la empresa exista y esté activa"""
        try:
            empresa = Empresa.objects.get(id_empresa=value, estado='activo')
            return empresa
        except Empresa.DoesNotExist:
            raise serializers.ValidationError("Empresa no encontrada o no está activa")
    
    def validate(self, data):
        """Validaciones adicionales"""
        user = data['email']  # En realidad es el objeto User
        empresa = data['empresa_id']  # En realidad es el objeto Empresa
        
        # Verificar que el cliente no esté ya registrado en esta empresa
        try:
            cliente = Cliente.objects.get(id_usuario=user)
            if Tiene.objects.filter(id_cliente=cliente, id_empresa=empresa).exists():
                raise serializers.ValidationError({
                    'error': 'Cliente ya registrado',
                    'detail': f'El cliente {user.email} ya está registrado en esta empresa'
                })
        except Cliente.DoesNotExist:
            pass
        
        return data


class ClienteRegistroResponseSerializer(serializers.ModelSerializer):
    """Serializador para respuesta de registro de cliente existente"""
    email = serializers.EmailField(source='id_usuario.email')
    nombre_cliente = serializers.CharField()
    empresa_nombre = serializers.SerializerMethodField()
    fecha_registro = serializers.SerializerMethodField()
    
    class Meta:
        model = Cliente
        fields = ['nit', 'nombre_cliente', 'email', 'empresa_nombre', 'fecha_registro']
    
    def get_empresa_nombre(self, obj):
        """Obtener nombre de la empresa desde el contexto"""
        return self.context.get('empresa_nombre', '')
    
    def get_fecha_registro(self, obj):
        """Obtener fecha de registro desde el contexto"""
        return self.context.get('fecha_registro', '')


class AuditoriaClienteSerializer(serializers.ModelSerializer):
    usuario_email = serializers.SerializerMethodField()
    cliente_info = serializers.SerializerMethodField()
    detalles_formateados = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditoriaCliente
        fields = [
            'id', 'accion', 'cliente_info', 'detalles', 
            'detalles_formateados', 'usuario_email', 'ip_address',
            'fecha', 'user_agent'
        ]
        read_only_fields = fields
    
    def get_usuario_email(self, obj):
        return obj.usuario.email if obj.usuario else 'Sistema'
    
    def get_cliente_info(self, obj):
        # Usar la propiedad segura del modelo
        return obj.cliente_info
    
    def get_detalles_formateados(self, obj):
        """Devuelve detalles en formato legible"""
        if not obj.detalles:
            return "Sin detalles"
        
        try:
            detalles = obj.detalles
            
            if obj.accion == 'ACTUALIZADO':
                cambios = []
                for campo, valores in detalles.get('cambios', {}).items():
                    campo_nombre = campo.replace('_cliente', '').replace('_', ' ').title()
                    cambios.append(f"{campo_nombre}: {valores.get('anterior', 'N/A')} → {valores.get('nuevo', 'N/A')}")
                
                if cambios:
                    return "; ".join(cambios)
            
            # Para creación o eliminación
            if 'nombre' in detalles:
                info_parts = []
                if 'nombre' in detalles:
                    info_parts.append(f"Nombre: {detalles['nombre']}")
                if 'nit' in detalles:
                    info_parts.append(f"NIT: {detalles['nit']}")
                if 'usuario_email' in detalles:
                    info_parts.append(f"Email: {detalles['usuario_email']}")
                
                return " | ".join(info_parts) if info_parts else "Información básica guardada"
            
            return str(detalles)
            
        except Exception:
            return "Detalles no disponibles en formato legible"


class FiltroAuditoriaSerializer(serializers.Serializer):
    fecha_desde = serializers.DateField(required=False)
    fecha_hasta = serializers.DateField(required=False)
    accion = serializers.ChoiceField(
        choices=AuditoriaCliente.ACCIONES, 
        required=False
    )
    cliente_id = serializers.IntegerField(required=False)
    usuario_id = serializers.IntegerField(required=False)
    cliente_nombre = serializers.CharField(required=False)