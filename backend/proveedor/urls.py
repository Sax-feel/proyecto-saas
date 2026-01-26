from django.urls import path
from .views import (
    ProveedorDetailView,
    ProveedorCreateView,
    ProveedorListView,
    ProveedorUpdateView,
    ProveedorDeleteView
)

urlpatterns = [
    # Público
    path('crear/', ProveedorCreateView.as_view(), name='proveedor-crear'),
    path('listar/', ProveedorListView.as_view(), name='proveedor-listar'),
    path('<int:id_proveedor>/', ProveedorDetailView.as_view(), name='proveedor-detalle'),
    path('<int:id_proveedor>/actualizar/', ProveedorUpdateView.as_view(), name='proveedor-actualizar'),
    path('<int:id_proveedor>/eliminar/', ProveedorDeleteView.as_view(), name='proveedor-eliminar'),
]