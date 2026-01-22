from django.urls import path
from .views import RegistroClienteConEmpresaView, ListaClientesView, DetalleClienteView, RegistrarClienteExistenteView, MisEmpresasView
from .views import (
    ListaAuditoriaClienteView,
    AuditoriaClienteFiltradaView,
    DetalleAuditoriaClienteView,
    ListaTodosClientesView
)

urlpatterns = [
    path('registrar-con-empresa/', RegistroClienteConEmpresaView.as_view(), name='registro-cliente-con-empresa'),
    path('listar/', ListaClientesView.as_view(), name='lista-clientes'),
    path('<int:pk>/', DetalleClienteView.as_view(), name='detalle-cliente'),
    path('registrar-existente/', RegistrarClienteExistenteView.as_view(), name='registrar-cliente-existente'),
    path('mis-empresas/', MisEmpresasView.as_view(), name='mis-empresas'),
    path('auditorias/', ListaAuditoriaClienteView.as_view(), name='auditorias-cliente'),
    path('auditorias/filtrar/', AuditoriaClienteFiltradaView.as_view(), name='auditorias-filtrar'),
    path('auditorias/<int:id>/', DetalleAuditoriaClienteView.as_view(), name='auditoria-detalle'),
    path('todos-clientes', ListaTodosClientesView.as_view(), name='auditoria-detalle'),
]