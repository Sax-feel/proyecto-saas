from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
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
    path('api/archivos/', include('archivo.urls')),
    path('api/categorias/', include('categoria.urls')),
    path('api/productos/', include('producto.urls')),
    path('api/proveedores/', include('proveedor.urls')),
    path('api/reservas/', include('reservas.urls')),
    path('api/ventas/', include('ventas.urls')),
    
    #ENDPOINTS DE DOCUMENTACIÓN
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    # Swagger UI:
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    # Redoc (opcional):
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)