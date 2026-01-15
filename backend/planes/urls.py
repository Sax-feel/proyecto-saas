from django.urls import path
from .views import ListaPlanesView, DetallePlanPorNombreView

urlpatterns = [
    path('', ListaPlanesView.as_view(), name='lista-planes'),
    path('<str:nombre>/', DetallePlanPorNombreView.as_view(), name='detalle-plan-nombre'),
]