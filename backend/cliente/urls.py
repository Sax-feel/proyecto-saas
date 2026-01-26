from django.urls import path
from .views import RegistroClienteConEmpresaView, ListaClientesView, DetalleClienteView
from .views import (
    ListaAuditoriaClienteView,
    AuditoriaClienteFiltradaView,
    DetalleAuditoriaClienteView,
    ListaTodosClientesView,
    ClientePorNITView,
    RegistrarClienteExistenteNITView
)

urlpatterns = [
    path('registrar-con-empresa/', RegistroClienteConEmpresaView.as_view(), name='registro-cliente-con-empresa'),
    path('listar/', ListaClientesView.as_view(), name='lista-clientes'),
    path('<int:pk>/', DetalleClienteView.as_view(), name='detalle-cliente'),
    path('clientes/registrar-por-nit/', RegistrarClienteExistenteNITView.as_view(), name='registrar-cliente-nit'),
    #path('mis-empresas/', MisEmpresasView.as_view(), name='mis-empresas'),
    path('auditorias/', ListaAuditoriaClienteView.as_view(), name='auditorias-cliente'),
    path('auditorias/filtrar/', AuditoriaClienteFiltradaView.as_view(), name='auditorias-filtrar'),
    path('auditorias/<int:id>/', DetalleAuditoriaClienteView.as_view(), name='auditoria-detalle'),
    path('todos-clientes', ListaTodosClientesView.as_view(), name='auditoria-detalle'),
    path('clientes/por-nit/<str:nit>/', ClientePorNITView.as_view(), name='cliente-por-nit'),
]