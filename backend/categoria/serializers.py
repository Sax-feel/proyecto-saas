from rest_framework import serializers
from .models import Categoria

class CategoriaSerializer(serializers.ModelSerializer):
    """Serializador para Categoria"""
    empresa_nombre = serializers.CharField(source='empresa.nombre', read_only=True)
    
    class Meta:
        model = Categoria
        fields = [
            'id_categoria', 'nombre', 'descripcion', 
            'estado', 'empresa', 'empresa_nombre', 'fecha_creacion'
        ]
        read_only_fields = ['id_categoria', 'fecha_creacion']
    
    def validate_nombre(self, value):
        """Validar que el nombre sea único por empresa"""
        if self.instance:
            # En actualización, verificar si otro registro tiene el mismo nombre
            empresa = self.instance.empresa
            if Categoria.objects.filter(
                nombre=value, 
                empresa=empresa
            ).exclude(id_categoria=self.instance.id_categoria).exists():
                raise serializers.ValidationError("Ya existe una categoría con este nombre en la empresa")
        else:
            # En creación, verificar desde el contexto
            empresa = self.context['request'].user.usuario_empresa.empresa
            if Categoria.objects.filter(nombre=value, empresa=empresa).exists():
                raise serializers.ValidationError("Ya existe una categoría con este nombre")
        return value

class CategoriaCreateSerializer(serializers.ModelSerializer):
    """Serializador para creación de categoría"""
    
    class Meta:
        model = Categoria
        fields = ['nombre', 'descripcion']