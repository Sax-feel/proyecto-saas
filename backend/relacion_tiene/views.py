# relacion_tiene/views.py
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Tiene
from .serializers import TieneSerializer
import logging

logger = logging.getLogger(__name__)


class EmpresaClientesView(generics.ListAPIView):
    """
    Vista para listar clientes de una empresa específica
    Solo admin_empresa puede ver sus propios clientes
    """
    serializer_class = TieneSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if not self.request.user.rol or self.request.user.rol.rol != 'admin_empresa':
            return Tiene.objects.none()
        
        try:
            from usuario_empresa.models import Usuario_Empresa
            usuario_empresa = Usuario_Empresa.objects.get(id_usuario=self.request.user)
            empresa = usuario_empresa.empresa_id
            
            return Tiene.objects.filter(id_empresa=empresa)
        except Exception:
            return Tiene.objects.none()


class AsociarClienteEmpresaView(generics.CreateAPIView):
    """
    Vista para asociar un cliente existente a otra empresa
    Solo admin_empresa puede asociar clientes
    """
    serializer_class = TieneSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        # Verificar permisos
        if not request.user.rol or request.user.rol.rol != 'admin_empresa':
            return Response(
                {'error': 'Permiso denegado', 'detail': 'Solo admin_empresa puede asociar clientes'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Obtener empresa del admin
        try:
            from usuario_empresa.models import Usuario_Empresa
            usuario_empresa = Usuario_Empresa.objects.get(id_usuario=request.user)
            empresa = usuario_empresa.empresa_id
        except Exception:
            return Response(
                {'error': 'Empresa no encontrada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener cliente
        cliente_id = request.data.get('id_cliente')
        try:
            from cliente.models import Cliente
            cliente = Cliente.objects.get(id_usuario=cliente_id)
        except Cliente.DoesNotExist:
            return Response(
                {'error': 'Cliente no encontrado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear relación
        try:
            tiene = Tiene.objects.create(
                id_cliente=cliente,
                id_empresa=empresa
            )
            
            return Response(
                {
                    'message': 'Cliente asociado a la empresa exitosamente',
                    'relacion': TieneSerializer(tiene).data,
                    'status': 'success'
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': 'Error al asociar cliente', 'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class ActualizarEstadoClienteView(generics.UpdateAPIView):
    """
    Vista para actualizar el estado de un cliente en una empresa
    Solo admin_empresa puede actualizar el estado de sus clientes
    """
    serializer_class = TieneSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        """
        Obtiene la relación Tiene específica que el admin_empresa quiere actualizar
        """
        user = self.request.user
        
        # Verificar que sea admin_empresa
        if not user.rol or user.rol.rol != 'admin_empresa':
            raise self.permission_denied(
                self.request,
                message="Solo administradores de empresa pueden actualizar estados",
                code=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Obtener empresa del admin
            from usuario_empresa.models import Usuario_Empresa
            usuario_empresa = Usuario_Empresa.objects.get(id_usuario=user)
            empresa = usuario_empresa.empresa
            
            # Obtener la relación específica
            relacion_id = self.kwargs.get('pk')
            tiene = Tiene.objects.get(
                id_tiene=relacion_id,
                id_empresa=empresa
            )
            
            return tiene
            
        except Usuario_Empresa.DoesNotExist:
            raise self.permission_denied(
                self.request,
                message="No tienes una empresa asignada",
                code=status.HTTP_403_FORBIDDEN
            )
        except Tiene.DoesNotExist:
            raise self.permission_denied(
                self.request,
                message="Relación no encontrada o no pertenece a tu empresa",
                code=status.HTTP_404_NOT_FOUND
            )
    
    def update(self, request, *args, **kwargs):
        """
        Actualiza solo el estado de la relación
        """
        try:
            tiene = self.get_object()
            
            # Solo permitir actualizar el campo 'estado'
            nuevo_estado = request.data.get('estado')
            
            if nuevo_estado not in ['activo', 'inactivo', 'pendiente']:
                return Response(
                    {
                        'error': 'Estado inválido',
                        'detail': 'El estado debe ser: activo, inactivo o pendiente',
                        'estados_permitidos': ['activo', 'inactivo', 'pendiente'],
                        'status': 'error'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Actualizar estado
            tiene.estado = nuevo_estado
            tiene.save()
            
            # Registrar en logs
            logger.info(
                f"Admin {request.user.email} actualizó estado de cliente "
                f"en empresa {tiene.id_empresa.nombre}"
            )
            
            # Crear respuesta detallada
            serializer = self.get_serializer(tiene)
            
            return Response(
                {
                    'message': 'Estado actualizado exitosamente',
                    'relacion': serializer.data,
                    'status': 'success'
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Error actualizando estado de cliente: {str(e)}")
            return Response(
                {
                    'error': 'Error al actualizar estado',
                    'detail': str(e),
                    'status': 'error'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
