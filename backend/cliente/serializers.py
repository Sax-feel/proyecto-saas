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

# cliente/serializers.py
class ClienteSerializer(serializers.ModelSerializer):
    """Serializador para el modelo Cliente con información de empresa"""
    empresa_nombre = serializers.SerializerMethodField()
    empresa_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Cliente
        fields = [
            'id_usuario', 
            'nit', 
            'nombre_cliente', 
            'direccion_cliente', 
            'telefono_cliente',
            'fecha_registro',
            'empresa_nombre',
            'empresa_id'
        ]
        read_only_fields = ['id_usuario']
    
    def get_empresa_nombre(self, obj):
        """Obtener el nombre de la empresa a la que pertenece el cliente"""
        try:
            # Buscar la relación en la tabla Tiene
            tiene_relacion = Tiene.objects.filter(
                id_cliente=obj,
                estado='activo'
            ).first()
            
            if tiene_relacion:
                return tiene_relacion.id_empresa.nombre
            return None
        except Exception:
            return None
    
    def get_empresa_id(self, obj):
        """Obtener el ID de la empresa a la que pertenece el cliente"""
        try:
            tiene_relacion = Tiene.objects.filter(
                id_cliente=obj,
                estado='activo'
            ).first()
            
            if tiene_relacion:
                return tiene_relacion.id_empresa.id_empresa
            return None
        except Exception:
            return None


class RegistroClienteSerializer(serializers.Serializer):
    """Serializador para registro público de cliente SIN empresa inicial"""
    # Datos del usuario
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    
    # Datos del cliente
    nit = serializers.CharField(max_length=20, required=True)
    nombre_cliente = serializers.CharField(max_length=100, required=True)
    direccion_cliente = serializers.CharField(max_length=200, required=True)
    telefono_cliente = serializers.CharField(max_length=15, required=True)
    
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
            
class EmailEmpresaSerializer(serializers.Serializer):
    """Serializador para registrar cliente existente mediante email"""
    email = serializers.EmailField(required=True)
    
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
                return value
            except Cliente.DoesNotExist:
                raise serializers.ValidationError("El cliente no tiene perfil completo")
                
        except User.DoesNotExist:
            raise serializers.ValidationError("Usuario no encontrado")
    
    def validate_empresa_id(self, value):
        """Validar que la empresa exista y esté activa"""
        try:
            empresa = Empresa.objects.get(id_empresa=value, estado='activo')
            return value
        except Empresa.DoesNotExist:
            raise serializers.ValidationError("Empresa no encontrada o no está activa")
    
    


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

class RegistroClienteConEmpresaSerializer(serializers.Serializer):
    """Serializador para registro de cliente con empresa automática"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True, 
        write_only=True, 
        min_length=8,
        style={'input_type': 'password'}
    )
    nit = serializers.CharField(required=True, max_length=20)
    nombre_cliente = serializers.CharField(required=True, max_length=200)
    direccion_cliente = serializers.CharField(
        required=False, 
        allow_blank=True, 
        max_length=300,
        default=''
    )
    telefono_cliente = serializers.CharField(
        required=False, 
        allow_blank=True, 
        max_length=15,
        default=''
    )
    id_empresa = serializers.IntegerField(required=True)
    
    def validate_email(self, value):
        """Validar que el email no esté registrado"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("El email ya está registrado")
        return value
    
    def validate_nit(self, value):
        """Validar que el NIT no esté registrado"""
        if Cliente.objects.filter(nit=value).exists():
            raise serializers.ValidationError("El NIT ya está registrado")
        return value
    
    def validate_id_empresa(self, value):
        """Validar que la empresa exista"""
        try:
            empresa = Empresa.objects.get(id_empresa=value)
            if empresa.estado != 'activo':
                raise serializers.ValidationError("La empresa no está activa")
        except Empresa.DoesNotExist:
            raise serializers.ValidationError("La empresa no existe")
        return value
    
    def create(self, validated_data):
        """Método create que será llamado por la vista"""
        return validated_data  # Retornamos los datos validados


class ClienteResponseSerializer(serializers.ModelSerializer):
    """Serializador para respuesta de registro exitoso"""
    email = serializers.EmailField(source='id_usuario.email')
    tokens = serializers.SerializerMethodField()
    empresa_info = serializers.SerializerMethodField()
    relacion_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Cliente
        fields = [
            'id_usuario', 'nit', 'nombre_cliente', 'email',
            'direccion_cliente', 'telefono_cliente', 'fecha_registro',
            'tokens', 'empresa_info', 'relacion_info'
        ]
        read_only_fields = fields
    
    def get_tokens(self, obj):
        """Genera tokens JWT para el nuevo usuario"""
        from rest_framework_simplejwt.tokens import RefreshToken
        user = obj.id_usuario
        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
    
    def get_empresa_info(self, obj):
        """Obtiene información de la empresa"""
        empresa_id = self.context.get('empresa_id')
        if not empresa_id:
            return None
        
        try:
            empresa = Empresa.objects.get(id_empresa=empresa_id)
            return {
                'id': empresa.id_empresa,
                'nombre': empresa.nombre,
                'nit': empresa.nit,
                'rubro': empresa.rubro,
                'estado': empresa.estado
            }
        except Empresa.DoesNotExist:
            return None
    
    def get_relacion_info(self, obj):
        """Obtiene información de la relación empresa-cliente"""
        empresa_id = self.context.get('empresa_id')
        if not empresa_id:
            return None
        
        try:
            relacion = Tiene.objects.get(
                id_cliente=obj,
                id_empresa_id=empresa_id
            )
            return {
                'estado': relacion.estado,
                'fecha_registro': relacion.fecha_registro,
                'mensaje': 'Cliente registrado exitosamente en la empresa'
            }
        except Tiene.DoesNotExist:
            return None

class NITEmpresaSerializer(serializers.Serializer):
    """Serializador para registrar cliente existente mediante NIT"""
    nit = serializers.CharField(max_length=20, required=True)
    
    def validate_nit(self, value):
        """Validar que el cliente exista por NIT"""
        try:
            cliente = Cliente.objects.get(nit=value)
            return value
        except Cliente.DoesNotExist:
            raise serializers.ValidationError("No existe un cliente con este NIT")
    
    def validate(self, data):
        """Validación adicional"""
        # Aquí puedes agregar más validaciones si es necesario
        return data