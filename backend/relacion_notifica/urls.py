# relacion_notifica/urls.py
from django.urls import path
from .views import (
    ListarNotificacionesView,
    EstadisticasNotificacionesView,
    ActualizarNotificacionView,
    MarcarNotificacionesLeidasView,
    EliminarNotificacionView,
    NotificacionesRecientesView
)

urlpatterns = [
    path('mis-notificaciones/', ListarNotificacionesView.as_view(), name='mis-notificaciones'),
    path('recientes/', NotificacionesRecientesView.as_view(), name='notificaciones-recientes'),
    path('estadisticas/', EstadisticasNotificacionesView.as_view(), name='estadisticas-notificaciones'),
    path('<int:pk>/actualizar/', ActualizarNotificacionView.as_view(), name='actualizar-notificacion'),    
    path('marcar-leidas/', MarcarNotificacionesLeidasView.as_view(), name='marcar-varias-leidas'),
    path('<int:pk>/eliminar/', EliminarNotificacionView.as_view(), name='eliminar-notificacion'),
]