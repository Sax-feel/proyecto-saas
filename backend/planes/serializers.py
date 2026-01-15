# planes/serializers.py
from rest_framework import serializers
from .models import Plan

class PlanSerializer(serializers.ModelSerializer):
    """
    Serializador completo para el modelo Plan
    """
    class Meta:
        model = Plan
        fields = [
            'id_plan',
            'nombre',
            'precio',
            'duracion_dias',
            'limite_productos',
            'limite_usuarios',
            'descripcion'
        ]
        read_only_fields = ['id_plan']


class PlanResumenSerializer(serializers.ModelSerializer):
    """
    Serializador resumido para listar planes (sin ID)
    """
    precio_mensual = serializers.SerializerMethodField()
    
    class Meta:
        model = Plan
        fields = [
            'nombre',
            'precio',
            'precio_mensual',
            'duracion_dias',
            'limite_productos',
            'limite_usuarios',
            'descripcion'
        ]
    
    def get_precio_mensual(self, obj):
        """
        Calcula el precio mensual (si la duración no es exactamente 30 días)
        """
        if obj.duracion_dias == 30:
            return obj.precio
        elif obj.duracion_dias > 0:
            return round(obj.precio * 30 / obj.duracion_dias, 2)
        return obj.precio