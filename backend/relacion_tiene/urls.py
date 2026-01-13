from django.urls import path
from .views import EmpresaClientesView, AsociarClienteEmpresaView

urlpatterns = [
    path('mis-clientes/', EmpresaClientesView.as_view(), name='empresa-clientes'),
    path('asociar-cliente/', AsociarClienteEmpresaView.as_view(), name='asociar-cliente'),
]