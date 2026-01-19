from django.urls import path
from .views import ProveedorPublicCreateView, ProveedorPublicListView

urlpatterns = [
    path('public/registrar/', ProveedorPublicCreateView.as_view(), name='proveedor_public_create'),
    path('public/listar/', ProveedorPublicListView.as_view(), name='proveedor_public_list'),
]