from rest_framework import serializers

class LogoutSerializer(serializers.Serializer):
    """
    Serializador para validar el token de refresh en logout.
    """
    refresh = serializers.CharField(
        required=True,
        help_text="Token de refresh a invalidar"
    )
    
    def validate_refresh(self, value):
        """
        Validación básica del token.
        """
        if not value or len(value) < 10:
            raise serializers.ValidationError("Token inválido")
        
        if not value.startswith('eyJ'):
            raise serializers.ValidationError("Formato de token inválido")
        
        return value
