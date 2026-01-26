# reservas/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('crear/', views.CrearReservaView.as_view(), name='crear-reserva'),
    path('cancelar/', views.CancelarReservaView.as_view(), name='cancelar-reserva'),
    path('mis-reservas/', views.ListarReservasUsuarioView.as_view(), name='mis-reservas'),
    path('verificar-expiradas/', views.VerificarReservasExpiradasView.as_view(), name='verificar-reservas-expiradas'),
    path(
        'eliminar-reserva-sin-validacion/<int:id_usuario>/<int:id_producto>/',
        views.EliminarReservaSinValidacionView.as_view(),
        name='eliminar-reserva-sin-validacion'
    ),
]