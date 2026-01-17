from django.urls import path
from .views import RegistroClienteView, ListaClientesView, DetalleClienteView, RegistrarClienteExistenteView, MisEmpresasView

urlpatterns = [
    path('registrar/', RegistroClienteView.as_view(), name='registrar-cliente'),
    path('listar/', ListaClientesView.as_view(), name='lista-clientes'),
    path('<int:pk>/', DetalleClienteView.as_view(), name='detalle-cliente'),
    path('registrar-existente/', RegistrarClienteExistenteView.as_view(), name='registrar-cliente-existente'),
    path('mis-empresas/', MisEmpresasView.as_view(), name='mis-empresas'),
]