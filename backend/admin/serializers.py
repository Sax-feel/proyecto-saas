from rest_framework import serializers

from apps.admin.models import Admin
from apps.usuario.models import Usuario
from apps.usuario.serializers import UsuarioSerializer

class AdminSerializer(serializers.ModelSerializer):
    usuario = UsuarioSerializer()

    class Meta:
        model = Admin
        fields = [
            'usuario',
            'nombre_admin',
            'telefono_admin'
        ]
        