from django.urls import path
from .views import (
    ProductoCreateView, ProductoListView, 
    ProductoDetailView, ProductoUpdateDeleteView,
    ProductoStatsView
)

urlpatterns = [
    path('crear/', ProductoCreateView.as_view(), name='producto_create'),
    path('listar/', ProductoListView.as_view(), name='producto_list'),
    path('<int:pk>/', ProductoDetailView.as_view(), name='producto_detail'),
    path('<int:pk>/gestion/', ProductoUpdateDeleteView.as_view(), name='producto_manage'),
    path('estadisticas/', ProductoStatsView.as_view(), name='producto_stats'),
]