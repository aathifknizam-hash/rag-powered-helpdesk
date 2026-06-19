"""
Admin Panel URLs - Enhanced REST API routing
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SystemStatsViewSet,
    AnalyticsViewSet,
    DepartmentViewSet,
    UserManagementViewSet,
    AgentManagementViewSet,
    AuditLogViewSet,
    SystemSettingsViewSet,
)

router = DefaultRouter()
router.register(r'stats', SystemStatsViewSet, basename='admin-stats')
router.register(r'analytics', AnalyticsViewSet, basename='admin-analytics')
router.register(r'departments', DepartmentViewSet, basename='admin-departments')
router.register(r'users', UserManagementViewSet, basename='admin-users')
router.register(r'agents', AgentManagementViewSet, basename='admin-agents')
router.register(r'audit-logs', AuditLogViewSet, basename='admin-audit-logs')
router.register(r'settings', SystemSettingsViewSet, basename='admin-settings')

urlpatterns = [
    path('', include(router.urls)),
]
