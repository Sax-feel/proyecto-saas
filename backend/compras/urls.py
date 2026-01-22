from django.urls import path
from . import views

urlpatterns = [
    path('realizar/', views.RealizarCompraStockView.as_view(), name='realizar-compra-stock'),
    path('listar/', views.ListaComprasVendedorView.as_view(), name='lista-compras-vendedor'),
    path('<int:id_compra>/', views.DetalleCompraVendedorView.as_view(), name='detalle-compra'),
    path('<int:id_compra>/eliminar/', views.EliminarCompraView.as_view(), name='eliminar-compra'),
]