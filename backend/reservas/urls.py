# reservas/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('crear/', views.CrearReservaView.as_view(), name='crear-reserva'),
    path('cancelar/', views.CancelarReservaView.as_view(), name='cancelar-reserva'),
    path('mis-reservas/', views.ListarReservasClienteView.as_view(), name='mis-reservas'),
    path('verificar-expiradas/', views.VerificarReservasExpiradasView.as_view(), name='verificar-reservas-expiradas'),
]