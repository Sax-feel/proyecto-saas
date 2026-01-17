# relacion_tiene/serializers.py
from rest_framework import serializers
from .models import Tiene
from cliente.serializers import ClienteSerializer
from empresas.serializers import EmpresaSerializer

class TieneSerializer(serializers.ModelSerializer):
    cliente = ClienteSerializer(source='id_cliente', read_only=True)
    
    class Meta:
        model = Tiene
        fields = ['id_cliente', 'id_empresa', 'fecha_registro', 'cliente']
        read_only_fields = ['fecha_registro']