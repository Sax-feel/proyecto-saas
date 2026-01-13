# usuarios/urls.py
from django.urls import path
from .views import (
    ListaUsuariosView,
    DetalleUsuarioCompletoView,
    BuscarUsuariosView
)

urlpatterns = [
    path('todos/', ListaUsuariosView.as_view(), name='lista-todos-usuarios'),
    path('buscar/', BuscarUsuariosView.as_view(), name='buscar-usuarios'),
    path('<int:id_usuario>/', DetalleUsuarioCompletoView.as_view(), name='detalle-usuario-completo'),
]