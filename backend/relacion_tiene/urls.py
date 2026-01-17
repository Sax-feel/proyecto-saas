from django.urls import path
from .views import EmpresaClientesView, AsociarClienteEmpresaView, ActualizarEstadoClienteView

urlpatterns = [
    path('mis-clientes/', EmpresaClientesView.as_view(), name='empresa-clientes'),
    path('asociar-cliente/', AsociarClienteEmpresaView.as_view(), name='asociar-cliente'),
    path('actualizar-estado/<int:empresa_id>/<int:usuario_id>/', 
        ActualizarEstadoClienteView.as_view(), 
        name='actualizar-estado'),
]