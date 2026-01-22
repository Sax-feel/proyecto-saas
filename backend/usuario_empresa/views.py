# usuario_empresa/views.py
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from usuarios.models import User
from roles.models import Rol
from empresas.models import Empresa
from admins.models import Admin
from .models import Usuario_Empresa
from .serializers import RegistroUsuarioEmpresaSerializer, UsuarioEmpresaSerializer
import logging

logger = logging.getLogger(__name__)


class RegistroUsuarioEmpresaView(generics.CreateAPIView):
    """
    Vista para registrar usuarios de empresa (vendedor o admin_empresa)
    Permisos:
    - admin puede crear admin_empresa (y asignarlo a una empresa)
    - admin_empresa puede crear vendedor (en SU empresa)
    """
    serializer_class = RegistroUsuarioEmpresaSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """
        Registra un nuevo usuario_empresa según permisos del rol
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            validated_data = serializer.validated_data
            rol_solicitado = validated_data['rol_nombre']
            user_actual = request.user
            
            logger.info(f"Registro de usuario_empresa. Rol: {rol_solicitado}, Por: {user_actual.email} ({user_actual.rol.rol})")
            
            # 1. Obtener el objeto Rol
            rol_obj = Rol.objects.get(rol=rol_solicitado, estado='activo')
            
            # 2. Determinar la empresa según el caso
            empresa = None
            
            if rol_solicitado == 'admin_empresa':
                # CASO A: Admin creando admin_empresa
                if user_actual.rol.rol != 'admin':
                    return Response(
                        {
                            'error': 'Permiso denegado',
                            'detail': 'Solo administradores pueden crear usuarios admin_empresa',
                            'status': 'error'
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                # Obtener empresa por ID proporcionado
                empresa_id = validated_data.get('empresa_id')
                if not empresa_id:
                    return Response(
                        {
                            'error': 'Empresa requerida',
                            'detail': 'Se requiere empresa_id para crear admin_empresa',
                            'status': 'error'
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    empresa = Empresa.objects.get(id_empresa=empresa_id)
                except Empresa.DoesNotExist:
                    return Response(
                        {
                            'error': 'Empresa no encontrada',
                            'detail': f'No existe empresa con ID {empresa_id}',
                            'status': 'error'
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Verificar que la empresa no tenga ya un admin_empresa
                if self._empresa_tiene_admin_empresa(empresa):
                    return Response(
                        {
                            'error': 'Empresa ya tiene administrador',
                            'detail': 'Esta empresa ya tiene un usuario admin_empresa asignado',
                            'status': 'error'
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
            elif rol_solicitado == 'vendedor':
                # CASO B: Admin_empresa creando vendedor
                if user_actual.rol.rol != 'admin_empresa':
                    return Response(
                        {
                            'error': 'Permiso denegado',
                            'detail': 'Solo admin_empresa puede crear vendedores',
                            'status': 'error'
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                # Obtener empresa del admin_empresa actual
                empresa = self._obtener_empresa_usuario(user_actual)
                if not empresa:
                    return Response(
                        {
                            'error': 'Admin sin empresa',
                            'detail': 'El admin_empresa no tiene empresa asignada',
                            'status': 'error'
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # 3. Crear usuario
            nuevo_usuario = User.objects.create_user(
                email=validated_data['email'],
                password=validated_data['password'],
                rol=rol_obj,
                estado='activo'
            )
            
            logger.info(f"Usuario creado: {nuevo_usuario.email} con rol {rol_solicitado}")
            
            # 4. NO crear registro en tabla Admin - SOLO usuario_empresa
            
            # 5. Crear registro en Usuario_Empresa
            usuario_empresa = Usuario_Empresa.objects.create(
                id_usuario=nuevo_usuario,
                empresa=empresa,  # Pasar el objeto Empresa, no el ID
                estado='activo'
            )
            
            logger.info(f"Usuario_Empresa creado: {nuevo_usuario.email} para empresa {empresa.nombre}")
            
            # 6. Preparar respuesta
            response_data = {
                'message': f'Usuario {rol_solicitado} registrado exitosamente',
                'usuario': {
                    'id': nuevo_usuario.id_usuario,
                    'email': nuevo_usuario.email,
                    'rol': nuevo_usuario.rol.rol,
                    'estado': nuevo_usuario.estado
                },
                'usuario_empresa': {
                    'empresa_id': empresa.id_empresa,
                    'empresa_nombre': empresa.nombre,
                    'estado': usuario_empresa.estado
                },
                'empresa': {
                    'id': empresa.id_empresa,
                    'nombre': empresa.nombre,
                    'nit': empresa.nit,
                    'admin_registro': empresa.admin.nombre_admin if empresa.admin_id else None
                },
                'registrado_por': {
                    'id': user_actual.id_usuario,
                    'email': user_actual.email,
                    'rol': user_actual.rol.rol
                },
                'status': 'success'
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error en registro de usuario_empresa: {str(e)}", exc_info=True)
            
            # Rollback: eliminar usuario si se creó
            if 'nuevo_usuario' in locals():
                nuevo_usuario.delete()
                logger.info(f"Usuario {nuevo_usuario.email} eliminado por error")
            
            return Response(
                {
                    'error': 'Error en el registro',
                    'detail': str(e),
                    'status': 'error'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _empresa_tiene_admin_empresa(self, empresa):
        """Verifica si una empresa ya tiene un usuario admin_empresa asignado"""
        try:
            # Buscar usuarios admin_empresa asociados a esta empresa
            usuarios_admin = Usuario_Empresa.objects.filter(
                empresa=empresa,  # Cambiado de empresa_id a empresa
                id_usuario__rol__rol='admin_empresa'
            )
            return usuarios_admin.exists()
        except Exception:
            return False
    
    def _obtener_empresa_usuario(self, usuario):
        """Obtiene la empresa asignada a un usuario a través de Usuario_Empresa"""
        try:
            usuario_empresa = Usuario_Empresa.objects.get(id_usuario=usuario)
            return usuario_empresa.empresa  # Retornar objeto Empresa, no ID
        except Usuario_Empresa.DoesNotExist:
            return None


class ListaUsuariosEmpresaView(generics.ListAPIView):
    """
    Vista para listar usuarios de empresa según permisos
    """
    serializer_class = UsuarioEmpresaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if not user.rol:
            return Usuario_Empresa.objects.none()
        
        # Admin puede ver todos los usuarios_empresa
        if user.rol.rol == 'admin':
            return Usuario_Empresa.objects.all()
        
        # Admin_empresa solo puede ver usuarios de su empresa
        elif user.rol.rol == 'admin_empresa':
            try:
                usuario_empresa = Usuario_Empresa.objects.get(id_usuario=user)
                return Usuario_Empresa.objects.filter(empresa_id=usuario_empresa.empresa_id)
            except Usuario_Empresa.DoesNotExist:
                return Usuario_Empresa.objects.none()
        
        # Vendedor puede ver solo su propio registro
        elif user.rol.rol == 'vendedor':
            return Usuario_Empresa.objects.filter(id_usuario=user)
        
        # Otros roles no pueden ver
        return Usuario_Empresa.objects.none()


class DetalleUsuarioEmpresaView(generics.RetrieveUpdateDestroyAPIView):
    """
    Vista para ver, actualizar o eliminar usuario_empresa
    """
    serializer_class = UsuarioEmpresaSerializer
    permission_classes = [IsAuthenticated]
    queryset = Usuario_Empresa.objects.all()
    
    def check_permissions(self, request):
        """Verifica permisos según rol"""
        super().check_permissions(request)
        
        usuario_empresa = self.get_object()
        user = request.user
        
        # Todos pueden VER su propio registro
        if request.method == 'GET':
            if usuario_empresa.id_usuario == user:
                return  # Puede ver su propio registro
            
            # Admin puede ver todos
            if user.rol.rol == 'admin':
                return
            
            # Admin_empresa puede ver usuarios de su empresa
            if user.rol.rol == 'admin_empresa':
                try:
                    admin_empresa_rel = Usuario_Empresa.objects.get(id_usuario=user)
                    if usuario_empresa.empresa_id == admin_empresa_rel.empresa_id:
                        return
                except Usuario_Empresa.DoesNotExist:
                    pass
        
        # Para MODIFICAR/ELIMINAR
        elif request.method in ['PUT', 'PATCH', 'DELETE']:
            # Solo admin o admin_empresa de la misma empresa puede modificar/eliminar
            if user.rol.rol == 'admin':
                return
            
            elif user.rol.rol == 'admin_empresa':
                # Verificar que el admin_empresa pertenezca a la misma empresa
                try:
                    admin_empresa_rel = Usuario_Empresa.objects.get(id_usuario=user)
                    if usuario_empresa.empresa_id == admin_empresa_rel.empresa_id:
                        return
                except Usuario_Empresa.DoesNotExist:
                    pass
        
        # Si no cumple ninguna condición, denegar
        self.permission_denied(
            request,
            message="Permiso denegado para esta operación",
            code=status.HTTP_403_FORBIDDEN
        )
    
    def perform_destroy(self, instance):
        """Sobrescribir eliminación para cambiar estado en lugar de borrar"""
        instance.estado = 'inactivo'
        instance.save()
        
        # También desactivar el usuario asociado
        usuario = instance.id_usuario
        usuario.estado = 'inactivo'
        usuario.save()
        
        logger.info(f"Usuario_Empresa {instance.id_usuario.email} desactivado por {self.request.user.email}")


class UsuariosPorEmpresaView(generics.ListAPIView):
    """
    Vista para listar todos los usuarios de una empresa específica
    """
    serializer_class = UsuarioEmpresaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        empresa_id = self.kwargs.get('empresa_id')
        user = self.request.user
        
        try:
            empresa = Empresa.objects.get(empresa=empresa_id)
        except Empresa.DoesNotExist:
            return Usuario_Empresa.objects.none()
        
        # Admin puede ver usuarios de cualquier empresa
        if user.rol.rol == 'admin':
            return Usuario_Empresa.objects.filter(empresa_id=empresa)
        
        # Admin_empresa solo puede ver usuarios de SU empresa
        elif user.rol.rol == 'admin_empresa':
            try:
                usuario_empresa = Usuario_Empresa.objects.get(id_usuario=user)
                if usuario_empresa.empresa_id == empresa:
                    return Usuario_Empresa.objects.filter(empresa_id=empresa)
            except Usuario_Empresa.DoesNotExist:
                pass
        
        return Usuario_Empresa.objects.none()