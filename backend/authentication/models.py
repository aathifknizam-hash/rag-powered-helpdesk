from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)

        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):

    ROLE_CHOICES = (
        ("customer", "Customer"),
        ("agent", "Agent"),
        ("admin", "Admin"),
    )

    username = None

    email = models.EmailField(unique=True)

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="customer"
    )

    department = models.ForeignKey(
        'tickets.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agents'
    )
    is_available = models.BooleanField(default=True)
    max_active_tickets = models.IntegerField(default=10)
    expertise_score = models.FloatField(default=0.0)
    success_rate = models.FloatField(default=0.0)
    active_ticket_count = models.IntegerField(default=0)
    sentiment_handling_score = models.FloatField(default=0.0)
    availability_status = models.CharField(max_length=20, default="available")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()


class AgentExpertise(models.Model):
    agent = models.ForeignKey(User, on_delete=models.CASCADE, related_name='expertises')
    category = models.ForeignKey('knowledge_base.KnowledgeCategory', on_delete=models.CASCADE)
    resolved_count = models.IntegerField(default=0)
    expertise_level = models.CharField(max_length=20, default='Low')  # Low, Medium, High
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('agent', 'category')

    def __str__(self):
        return f"{self.agent.email} - {self.category.name}: {self.expertise_level}"