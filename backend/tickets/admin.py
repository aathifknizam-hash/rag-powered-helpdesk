"""
Django admin configuration for Tickets app
Phase 5: Ticket Management System
"""

from django.contrib import admin
from .models import Ticket, TicketMessage, TicketAttachment, TicketHistory, TicketTag, TicketWatcher


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = [
        'ticket_number', 'customer', 'agent', 'status',
        'priority', 'request_type', 'created_at'
    ]
    list_filter = ['status', 'priority', 'request_type', 'created_at']
    search_fields = ['ticket_number', 'subject', 'description']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Identification', {
            'fields': ('ticket_number',)
        }),
        ('Customer & Assignment', {
            'fields': ('customer', 'agent', 'assigned_at')
        }),
        ('Content', {
            'fields': ('subject', 'description', 'request_type')
        }),
        ('Status & Priority', {
            'fields': ('status', 'priority', 'resolution_notes', 'resolved_at', 'closed_at')
        }),
        ('SLA', {
            'fields': ('first_response_sla', 'resolution_sla'),
            'classes': ('collapse',)
        }),
        ('AI Classification', {
            'fields': (
                'ai_suggested_type',
                'ai_suggested_priority',
                'ai_classification_confidence'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('ticket_number', 'created_at', 'updated_at', 'assigned_at')


@admin.register(TicketMessage)
class TicketMessageAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'author', 'is_internal', 'created_at']
    list_filter = ['is_internal', 'created_at']
    search_fields = ['ticket__ticket_number', 'content', 'author__email']
    ordering = ['-created_at']
    
    readonly_fields = ('created_at', 'updated_at')


@admin.register(TicketAttachment)
class TicketAttachmentAdmin(admin.ModelAdmin):
    list_display = ['filename', 'ticket', 'uploaded_by', 'file_size', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['filename', 'ticket__ticket_number']
    ordering = ['-uploaded_at']
    
    readonly_fields = ('uploaded_at', 'file_size')


@admin.register(TicketHistory)
class TicketHistoryAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'action', 'actor', 'timestamp']
    list_filter = ['action', 'timestamp']
    search_fields = ['ticket__ticket_number', 'actor__email']
    ordering = ['-timestamp']
    
    readonly_fields = ('timestamp',)


@admin.register(TicketTag)
class TicketTagAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'name', 'created_at']
    list_filter = ['name', 'created_at']
    search_fields = ['ticket__ticket_number', 'name']


@admin.register(TicketWatcher)
class TicketWatcherAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['ticket__ticket_number', 'user__email']
