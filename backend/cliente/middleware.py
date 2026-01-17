# cliente/middleware.py
import threading
from django.utils.deprecation import MiddlewareMixin

class AuditoriaMiddleware(MiddlewareMixin):
    """
    Middleware para capturar información del request para auditoría
    """
    def process_request(self, request):
        thread_local = threading.local()
        thread_local.request = request
        thread_local.ip_address = self.get_client_ip(request)
        return None
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip