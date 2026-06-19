"""
Admin Panel Admin Configuration
"""

from django.contrib import admin
from .models import AdminPreferences


@admin.register(AdminPreferences)
class AdminPreferencesAdmin(admin.ModelAdmin):
    list_display = ('user', 'theme', 'items_per_page', 'updated_at')
    readonly_fields = ('created_at', 'updated_at')
