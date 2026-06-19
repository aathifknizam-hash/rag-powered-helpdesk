"""
Custom permissions for Ticket Management
"""

from rest_framework import permissions


class IsAgent(permissions.BasePermission):
    """
    Permission to check if user is an agent or admin
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.role in ['agent', 'admin']


class IsTicketOwnerOrAgent(permissions.BasePermission):
    """
    Permission to check if user is ticket owner or an agent/admin
    """
    
    def has_object_permission(self, request, view, obj):
        # Customer can only modify their own tickets
        if request.user.role == 'customer':
            return obj.customer == request.user
        
        # Agents and admins can modify any ticket
        return request.user.role in ['agent', 'admin']
