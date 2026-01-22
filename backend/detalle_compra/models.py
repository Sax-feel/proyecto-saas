from django.db import models
from compras.models import Compra
from producto.models import Producto

class DetalleCompra(models.Model):
    id_producto = models.ForeignKey(Producto, on_delete=models.CASCADE, db_column='id_producto')
    id_compra = models.ForeignKey(Compra, on_delete=models.CASCADE, db_column='id_compra')
    cantidad = models.PositiveIntegerField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=15, decimal_places=2)
    
    class Meta:
        db_table = "detalle_compra"
        unique_together = ('id_producto', 'id_compra')