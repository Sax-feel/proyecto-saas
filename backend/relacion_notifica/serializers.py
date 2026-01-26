# relacion_notifica/serializers.py
from rest_framework import serializers
from .models import Notifica
from notificaciones.serializers import NotificacionSerializer, NotificacionResumenSerializer

class NotificaSerializer(serializers.ModelSerializer):
    """Serializador para la relación Notifica"""
    notificacion = NotificacionResumenSerializer(source='id_notificacion')
    
    class Meta:
        model = Notifica
        fields = [
            'id',
            'id_usuario',
            'id_notificacion',
            'notificacion',
            'leido',
            'fecha_leido',
            'eliminado'
        ]
        read_only_fields = ['id', 'id_usuario', 'id_notificacion', 'notificacion']


class NotificaUpdateSerializer(serializers.ModelSerializer):
    """Serializador para actualizar estado de notificación"""
    
    class Meta:
        model = Notifica
        fields = ['leido', 'eliminado']
    
    def update(self, instance, validated_data):
        """Actualiza la instancia y marca fecha de leído si corresponde"""
        if validated_data.get('leido') and not instance.leido:
            from django.utils import timezone
            instance.fecha_leido = timezone.now()
        
        if validated_data.get('eliminado'):
            instance.eliminado = True
        
        return super().update(instance, validated_data)


class NotificacionUsuarioSerializer(serializers.Serializer):
    """Serializador para respuesta de notificaciones del usuario"""
    notificaciones = NotificaSerializer(many=True, read_only=True)
    total = serializers.IntegerField()
    no_leidas = serializers.IntegerField()
    leidas = serializers.IntegerField()
    eliminadas = serializers.IntegerField()


class MarcarLeidoSerializer(serializers.Serializer):
    """Serializador para marcar notificaciones como leídas"""
    notificacion_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True
    )
    marcar_todas = serializers.BooleanField(default=False)
    
    def validate(self, data):
        if not data.get('notificacion_ids') and not data.get('marcar_todas'):
            raise serializers.ValidationError(
                "Debe proporcionar notificacion_ids o marcar_todas=True"
            )
        
        # Si se envían notificacion_ids y marcar_todas=True, ignorar los IDs
        if data.get('marcar_todas') and data.get('notificacion_ids'):
            # Si se marca todas, ignoramos los IDs específicos
            data['notificacion_ids'] = []
        
        return data
    
    def validate_notificacion_ids(self, value):
        """Validar que los IDs sean únicos"""
        if value:
            return list(set(value))  # Remover duplicados
        return value