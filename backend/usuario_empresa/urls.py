# usuario_empresa/urls.py
from django.urls import path
from .views import (
    RegistroUsuarioEmpresaView,
    ListaUsuariosEmpresaView,
    DetalleUsuarioEmpresaView,
    UsuariosPorEmpresaView
)

urlpatterns = [
    path('registrar/', RegistroUsuarioEmpresaView.as_view(), name='registrar-usuario-empresa'),
    path('listar/', ListaUsuariosEmpresaView.as_view(), name='lista-usuarios-empresa'),
    path('<int:pk>/', DetalleUsuarioEmpresaView.as_view(), name='detalle-usuario-empresa'),
    path('empresa/<int:empresa_id>/', UsuariosPorEmpresaView.as_view(), name='usuarios-por-empresa'),
]