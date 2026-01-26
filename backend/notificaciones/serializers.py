# notificaciones/serializers.py
from rest_framework import serializers
from .models import Notificacion

class NotificacionSerializer(serializers.ModelSerializer):
    """Serializador para el modelo Notificacion"""
    
    class Meta:
        model = Notificacion
        fields = [
            'id_notificacion',
            'titulo',
            'mensaje',
            'tipo',
            'fecha_creacion'
        ]
        read_only_fields = fields


class NotificacionResumenSerializer(serializers.ModelSerializer):
    """Serializador resumido para notificaciones"""
    tiempo_transcurrido = serializers.SerializerMethodField()
    
    class Meta:
        model = Notificacion
        fields = [
            'id_notificacion',
            'titulo',
            'mensaje',
            'tipo',
            'fecha_creacion',
            'tiempo_transcurrido'
        ]
        read_only_fields = fields
    
    def get_tiempo_transcurrido(self, obj):
        """Calcula el tiempo transcurrido desde la creación"""
        from django.utils import timezone
        from django.utils.timesince import timesince
        
        return timesince(obj.fecha_creacion, timezone.now())