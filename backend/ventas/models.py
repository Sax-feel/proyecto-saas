from django.db import models
from cliente.models import Cliente
from usuario_empresa.models import Usuario_Empresa

class Venta(models.Model):
    id_venta = models.AutoField(primary_key=True)
    usuario_empresa = models.ForeignKey(Usuario_Empresa, on_delete=models.CASCADE)
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    fecha_venta = models.DateTimeField(auto_now_add=True)
    precio_total = models.DecimalField(max_digits=15, decimal_places=2)
    
    class Meta:
        db_table = "venta"
        ordering = ["id_venta"]