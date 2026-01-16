from django.urls import path
from .views import RegisterView, LoginView, LogoutView
from .views import PasswordResetRequestView, PasswordResetConfirmView, PasswordResetValidateTokenView


urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('password-reset/validate-token/', PasswordResetValidateTokenView.as_view(), name='password-reset-validate-token'),
]