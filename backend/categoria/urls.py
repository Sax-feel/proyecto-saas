from django.urls import path
from .views import (
    CategoriaCreateView, CategoriaListView, 
    CategoriaDetailView, CategoriaUpdateDeleteView
)

urlpatterns = [
    path('crear/', CategoriaCreateView.as_view(), name='categoria_create'),
    path('listar/', CategoriaListView.as_view(), name='categoria_list'),
    path('<int:id_categoria>/', CategoriaDetailView.as_view(), name='categoria_detail'),
    path('<int:id_categoria>/gestion/', CategoriaUpdateDeleteView.as_view(), name='categoria_manage'),
]