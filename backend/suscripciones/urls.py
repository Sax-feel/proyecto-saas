# suscripciones/urls.py
from django.urls import path
from .views import (
    SolicitarSuscripcionView,
    ListaSuscripcionesView,
    DetalleSuscripcionView,
    MisSuscripcionesView
)

urlpatterns = [
    path('solicitar/', SolicitarSuscripcionView.as_view(), name='solicitar-suscripcion'),
    path('todas/', ListaSuscripcionesView.as_view(), name='lista-suscripciones'),
    path('mis-suscripciones/', MisSuscripcionesView.as_view(), name='mis-suscripciones'),
    path('<int:id_suscripcion>/', DetalleSuscripcionView.as_view(), name='detalle-suscripcion'),
]