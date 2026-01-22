# ventas/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('realizar-compra/', views.RealizarCompraView.as_view(), name='realizar-compra'),
    path('mis-compras/', views.HistorialComprasClienteView.as_view(), name='mis-compras'),
    path('listar-ventas/', views.ListaVentasVendedorView.as_view(), name='mis-compras'),
    path('<int:id_venta>/eliminar/', views.EliminarVentaView.as_view(), name='eliminar-venta'),
]