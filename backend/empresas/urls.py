# empresas/urls.py
from django.urls import path
from .views import (
    RegistroEmpresaView, 
    ListaEmpresasView, 
    DetalleEmpresaView,
    CambiarEstadoEmpresaView,
    ListaEmpresasClienteAdminView,
    DetalleEmpresaClienteAdminView,
    EmpresasDisponiblesClienteView,
    RegistroEmpresaView,
    CambiarEstadoEmpresaView 
)

urlpatterns = [
    path('registrar/', RegistroEmpresaView.as_view(), name='registrar-empresa'),
    path('listar/', ListaEmpresasView.as_view(), name='lista-empresas'),
    path('<int:pk>/', DetalleEmpresaView.as_view(), name='detalle-empresa'),
    path('<int:pk>/cambiar-estado/', CambiarEstadoEmpresaView.as_view(), name='cambiar-estado-empresa'),
    path('listar/', ListaEmpresasClienteAdminView.as_view(), name='lista-empresas-cliente-admin'),
    path('<int:id_empresa>/', DetalleEmpresaClienteAdminView.as_view(), name='detalle-empresa-cliente-admin'),
    path('disponibles/', EmpresasDisponiblesClienteView.as_view(), name='empresas-disponibles-cliente'),
    path('registrar/', RegistroEmpresaView.as_view(), name='registrar-empresa'),
    path('<int:pk>/cambiar-estado/', CambiarEstadoEmpresaView.as_view(), name='cambiar-estado-empresa'),
]