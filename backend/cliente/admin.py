# cliente/admin.py
from django.contrib import admin
from .models import Cliente, AuditoriaCliente

@admin.register(AuditoriaCliente)
class AuditoriaClienteAdmin(admin.ModelAdmin):
    list_display = ['accion', 'cliente_nombre', 'usuario_email', 'fecha', 'ip_address']
    list_filter = ['accion', 'fecha', 'usuario']
    search_fields = ['cliente_nombre', 'cliente_nit', 'detalles', 'ip_address']
    readonly_fields = [
        'cliente_id', 'cliente_nombre', 'cliente_nit', 'cliente_email',
        'accion', 'detalles', 'usuario', 'ip_address', 'fecha', 'user_agent'
    ]
    date_hierarchy = 'fecha'
    fieldsets = (
        ('Información del Cliente', {
            'fields': ('cliente_id', 'cliente_nombre', 'cliente_nit', 'cliente_email')
        }),
        ('Información de la Auditoría', {
            'fields': ('accion', 'detalles', 'usuario', 'ip_address', 'user_agent', 'fecha')
        }),
    )
    
    def usuario_email(self, obj):
        return obj.usuario.email if obj.usuario else 'Sistema'
    usuario_email.short_description = 'Usuario'
    
    def has_add_permission(self, request):
        return False  # No se pueden crear auditorías manualmente
    
    def has_change_permission(self, request, obj=None):
        return False  # No se pueden modificar auditorías
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser  # Solo superusuario puede eliminar

@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ['nit', 'nombre_cliente', 'id_usuario_email', 'telefono_cliente', 'fecha_registro']
    list_filter = ['fecha_registro']
    search_fields = ['nit', 'nombre_cliente', 'direccion_cliente', 'telefono_cliente']
    readonly_fields = ['id_usuario', 'fecha_registro']
    fieldsets = (
        ('Información del Usuario', {
            'fields': ('id_usuario',)
        }),
        ('Información del Cliente', {
            'fields': ('nit', 'nombre_cliente', 'direccion_cliente', 'telefono_cliente')
        }),
        ('Información del Sistema', {
            'fields': ('fecha_registro',),
            'classes': ('collapse',)
        }),
    )
    
    def id_usuario_email(self, obj):
        return obj.id_usuario.email if obj.id_usuario else 'Sin usuario'
    id_usuario_email.short_description = 'Email del Usuario'
    
    # Auditoría desde el admin de cliente
    actions = ['ver_auditorias']
    
    def ver_auditorias(self, request, queryset):
        from django.http import HttpResponseRedirect
        from django.urls import reverse
        
        if queryset.count() != 1:
            self.message_user(request, "Seleccione solo un cliente para ver sus auditorías", level='warning')
            return
        
        cliente = queryset.first()
        url = reverse('admin:cliente_auditoriacliente_changelist') + f'?cliente_id={cliente.id_usuario_id}'
        return HttpResponseRedirect(url)
    ver_auditorias.short_description = "Ver auditorías de este cliente"