from django.urls import path
from .views import (
    ArchivoCreateView, ArchivoListView, 
    ArchivoDetailView, ArchivoUpdateDeleteView,
    ArchivoPorProductoView
)

urlpatterns = [
    path('crear/', ArchivoCreateView.as_view(), name='archivo_create'),
    path('listar/', ArchivoListView.as_view(), name='archivo_list'),
    path('<int:pk>/', ArchivoDetailView.as_view(), name='archivo_detail'),
    path('<int:pk>/gestion/', ArchivoUpdateDeleteView.as_view(), name='archivo_manage'),
    path('producto/<int:producto_id>/', ArchivoPorProductoView.as_view(), name='archivo_por_producto'),
]