from rest_framework import serializers
from .models import Usuario_Empresa

class Usuario_EmpresaSerializer(serializers.ModelSerializer):

    class Meta:
        model = Usuario_Empresa
        fields = '__all__'