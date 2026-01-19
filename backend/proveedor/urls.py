from django.urls import path
from .views import (
    ProveedorPublicCreateView, 
    ProveedorPublicListView,
    ProveedorDetailView,
    ProveedorUpdateDeleteView,
    ProveedorStatsView
)

urlpatterns = [
    # Público
    path('public/registrar/', ProveedorPublicCreateView.as_view(), name='proveedor_public_create'),
    path('public/listar/', ProveedorPublicListView.as_view(), name='proveedor_public_list'),
    path('public/<int:id_proveedor>/', ProveedorDetailView.as_view(), name='proveedor_public_detail'),
    path('public/estadisticas/', ProveedorStatsView.as_view(), name='proveedor_stats'),
    
    # Con autenticación (si necesitas operaciones protegidas)
    path('<int:id_proveedor>/gestion/', ProveedorUpdateDeleteView.as_view(), name='proveedor_manage'),
]