from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from roles.models import Rol

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es obligatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('estado', 'activo')
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    ESTADOS = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('bloqueado', 'Bloqueado'),
    ]
    
    id_usuario = models.AutoField(primary_key=True)
    rol = models.ForeignKey(Rol, on_delete=models.CASCADE, db_column='rol')
    email = models.EmailField(max_length=100, unique=True)
    estado = models.CharField(max_length=50, choices=ESTADOS, default='inactivo')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    ultimo_login = models.DateTimeField(null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    class Meta:
        db_table = "usuario"
        ordering = ["id_usuario"]
    
    def __str__(self):
        return self.email
    
    @property
    def id(self):
        return self.id_usuario

    
    def get_user_id(self):
        """Retorna el ID como entero para JWT"""
        return int(self.id_usuario)