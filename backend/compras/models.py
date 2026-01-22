# compras/models.py
from django.db import models
from usuario_empresa.models import Usuario_Empresa

class Compra(models.Model):
    id_compra = models.AutoField(primary_key=True)
    usuario_empresa = models.ForeignKey(Usuario_Empresa, on_delete=models.CASCADE)
    fecha = models.DateTimeField(auto_now_add=True)
    precio_total = models.DecimalField(max_digits=15, decimal_places=2)
    
    class Meta:
        db_table = "compra"
        ordering = ["id_compra"]