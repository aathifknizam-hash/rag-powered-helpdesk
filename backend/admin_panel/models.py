"""
Admin Panel Models - Phase 10
Currently minimal as most admin functions work with existing models
"""

from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class AdminPreferences(models.Model):
    """Store admin user preferences"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='admin_preferences')
    theme = models.CharField(max_length=20, default='light', choices=[('light', 'Light'), ('dark', 'Dark')])
    sidebar_collapsed = models.BooleanField(default=False)
    items_per_page = models.IntegerField(default=25)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Admin Preferences'

    def __str__(self):
        return f"Admin preferences for {self.user.email}"
