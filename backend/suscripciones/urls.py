# suscripciones/urls.py
from django.urls import path
from .views import (
    SolicitarSuscripcionView,
    ListaSuscripcionesView,
    DetalleSuscripcionView,
    MisSuscripcionesView,
    ActivarSuscripcionView,
    ActivarSuscripcionRecienteEmpresaView,
    SuscripcionesPorEmpresaView

)

urlpatterns = [
    path('solicitar/', SolicitarSuscripcionView.as_view(), name='solicitar-suscripcion'),
    path('todas/', ListaSuscripcionesView.as_view(), name='lista-suscripciones'),
    path('mis-suscripciones/', MisSuscripcionesView.as_view(), name='mis-suscripciones'),
    path('<int:id_suscripcion>/', DetalleSuscripcionView.as_view(), name='detalle-suscripcion'),
    path('<int:id_suscripcion>/activar/', ActivarSuscripcionView.as_view(), name='activar-suscripcion'),
    path('empresa/<int:id_empresa>/activar-reciente/', 
        ActivarSuscripcionRecienteEmpresaView.as_view(), 
        name='activar-suscripcion-reciente'),
    path('empresa/<int:id_empresa>/', SuscripcionesPorEmpresaView.as_view(), name='suscripciones-empresa'),
]