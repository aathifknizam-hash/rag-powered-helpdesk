"""
Admin Panel Django App - Phase 10 Administration Backend
Provides REST API endpoints for system administration
"""

from django.apps import AppConfig


class AdminPanelConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'admin_panel'
    verbose_name = 'Admin Panel'
