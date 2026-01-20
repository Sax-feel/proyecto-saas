from rest_framework import serializers
import os
from .models import Archivo

class ArchivoSerializer(serializers.ModelSerializer):
    """Serializador para Archivo"""
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_empresa = serializers.CharField(source='producto.empresa.nombre', read_only=True)
    tamanio_kb = serializers.SerializerMethodField()
    
    class Meta:
        model = Archivo
        fields = [
            'id_archivo', 'nombre', 'archivo', 'tipo_archivo',
            'orden', 'descripcion', 'fecha_creacion', 'producto',
            'producto_nombre', 'producto_empresa', 'tamanio_kb'
        ]
        read_only_fields = ['id_archivo', 'tipo_archivo', 'fecha_creacion', 'tamanio_kb']
    
    def get_tamanio_kb(self, obj):
        """Obtener tamaño del archivo en KB"""
        if obj.archivo:
            try:
                return round(obj.archivo.size / 1024, 2)
            except:
                return 0
        return 0

class ArchivoCreateSerializer(serializers.ModelSerializer):
    """Serializador para creación de archivo"""
    
    class Meta:
        model = Archivo
        fields = ['archivo', 'descripcion', 'orden', 'producto']
    
    def create(self, validated_data):
        # Obtener nombre del archivo
        archivo = validated_data.get('archivo')
        if archivo and not validated_data.get('nombre'):
            validated_data['nombre'] = os.path.splitext(archivo.name)[0]
        
        return super().create(validated_data)
    
    def validate_producto(self, value):
        """Validar que el producto pertenezca a la misma empresa"""
        empresa = self.context['request'].user.usuario_empresa.empresa
        if value.empresa != empresa:
            raise serializers.ValidationError("El producto no pertenece a su empresa")
        return value

class ArchivoPublicSerializer(serializers.ModelSerializer):
    """Serializador para vista pública de archivos"""
    producto = serializers.CharField(source='producto.nombre', read_only=True)
    
    class Meta:
        model = Archivo
        fields = [
            'id_archivo', 'nombre', 'tipo_archivo', 'orden', 'archivo', 
            'descripcion', 'fecha_creacion', 'producto'
        ]
        read_only_fields = fields
