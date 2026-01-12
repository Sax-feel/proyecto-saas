from rest_framework import serializers
from apps.cliente.models import Cliente
from apps.usuario.models import Usuario
from apps.usuario.models import UsuarioSerializer

class ClienteSerializer(serializers.Serializer):
    usuario = UsuarioSerializer()

    class Meta:
        model = Cliente
        fields = [
            'usuario',
            'nombre',
            'nit',
            'telefono',
            'direccion',
            'fecha_registro'
        ]