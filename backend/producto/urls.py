from django.urls import path
from .views import (
    ProductoCreateView, ProductoListView, 
    ProductoDetailView, ProductoUpdateDeleteView,
    ProductoStatsView, ProductosPorEmpresaView,
    ProductosPorEmpresaAdminView, ProductosPorEmpresaConDetallesView
)

urlpatterns = [
    path('crear/', ProductoCreateView.as_view(), name='producto_create'),
    path('listar/', ProductoListView.as_view(), name='producto_list'),
    path('<int:pk>/', ProductoDetailView.as_view(), name='producto_detail'),
    path('<int:pk>/gestion/', ProductoUpdateDeleteView.as_view(), name='producto_manage'),
    path('estadisticas/', ProductoStatsView.as_view(), name='producto_stats'),
    path('empresa/<int:id_empresa>/', ProductosPorEmpresaView.as_view(), name='productos_por_empresa'),
    path('empresa/', ProductosPorEmpresaView.as_view(), name='productos_por_empresa_param'),
    path('mi-empresa/', ProductosPorEmpresaAdminView.as_view(), name='productos_mi_empresa'),
    path('empresa/<int:id_empresa>/detalles/', ProductosPorEmpresaConDetallesView.as_view(), name='productos_por_empresa_detalles'),
]