from django.urls import path
from .views import (
    CategoriaCreateView, CategoriaListView, 
    CategoriaDetailView, CategoriaUpdateDeleteView,
    CategoriasPorEmpresaView, CategoriasPorEmpresaAdminView,
    CategoriasPorEmpresaConEstadisticasView
)

urlpatterns = [
    path('crear/', CategoriaCreateView.as_view(), name='categoria_create'),
    path('listar/', CategoriaListView.as_view(), name='categoria_list'),
    path('<int:id_categoria>/', CategoriaDetailView.as_view(), name='categoria_detail'),
    path('<int:id_categoria>/gestion/', CategoriaUpdateDeleteView.as_view(), name='categoria_manage'),
    path('empresa/<int:id_empresa>/', CategoriasPorEmpresaView.as_view(), name='categorias_por_empresa'),
    path('empresa/', CategoriasPorEmpresaView.as_view(), name='categorias_por_empresa_param'),
    path('mi-empresa/', CategoriasPorEmpresaAdminView.as_view(), name='categorias_mi_empresa'),
    path('empresa/<int:id_empresa>/estadisticas/', CategoriasPorEmpresaConEstadisticasView.as_view(), name='categorias_por_empresa_estadisticas'),
]