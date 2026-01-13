# empresas/urls.py
from django.urls import path
from .views import (
    RegistroEmpresaView, 
    ListaEmpresasView, 
    DetalleEmpresaView,
    CambiarEstadoEmpresaView
)

urlpatterns = [
    path('registrar/', RegistroEmpresaView.as_view(), name='registrar-empresa'),
    path('listar/', ListaEmpresasView.as_view(), name='lista-empresas'),
    path('<int:pk>/', DetalleEmpresaView.as_view(), name='detalle-empresa'),
    path('<int:pk>/cambiar-estado/', CambiarEstadoEmpresaView.as_view(), name='cambiar-estado-empresa'),
]