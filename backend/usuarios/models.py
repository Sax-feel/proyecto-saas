from django.db import models

#id_usuario(PK), email, password_hash, estado(acstivado, bloqueado), fecha_creación, fecha_modificacion, ultimo_login, rol_id (FK de Rol)
class Usuario(models.Model):

    ESTADOS = {
        ("ACTIVO", "activo"),
        ("INACTIVO", "inactivo"),
    }

    id_usuario = models.AutoField(primary_key=True)
    rol_id = models.ForeignKey('roles.Rol', on_delete=models.CASCADE, db_column='rol_id')
    email = models.EmailField(max_length=100, unique=True)
    password_hash = models.CharField(max_length=256)
    estado = models.CharField(max_length=50, choices=ESTADOS, default=ESTADOS["INACTIVO"])
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    ultimo_login = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "usuario"
        ordering = ["id_usuario"]