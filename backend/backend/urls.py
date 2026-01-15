from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('cuentas.urls')),
    path('api/clientes/', include('cliente.urls')),
    path('api/relaciones/', include('relacion_tiene.urls')),
    path('api/empresas/', include('empresas.urls')),
    path('api/usuarios-empresa/', include('usuario_empresa.urls')),
    path('api/usuarios/', include('usuarios.urls')),
    path('api/empresas/', include('empresas.urls')),
    path('api/planes/', include('planes.urls')),
    path('api/suscripciones/', include('suscripciones.urls')),

    #ENDPOINTS DE DOCUMENTACIÓN
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    # Swagger UI:
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    # Redoc (opcional):
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
