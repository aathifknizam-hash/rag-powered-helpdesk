"""
Ticket Management System Models
Phase 5: Ticket Lifecycle Management
"""

import logging
from datetime import timedelta
from django.db import models
from django.utils import timezone
from authentication.models import User

logger = logging.getLogger(__name__)


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    lead_agent = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='led_departments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Ticket(models.Model):
    """
    Core ticket model for support requests
    Tracks status, priority, assignment, and SLA metrics
    """
    
    STATUS_CHOICES = (
        ('new', 'New'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('waiting_customer', 'Waiting for Customer'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    )
    
    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )
    
    REQUEST_TYPES = (
        ('it', 'IT'),
        ('hr', 'HR'),
        ('facilities', 'Facilities'),
        ('finance', 'Finance'),
        ('admin', 'Administration'),
        ('other', 'Other'),
    )
    
    # Ticket identification
    ticket_number = models.CharField(
        max_length=20,
        unique=True,
        db_index=True
    )
    
    # Relationships
    customer = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='tickets_as_customer'
    )
    agent = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets_assigned',
        help_text="Assigned support agent"
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets'
    )
    category = models.ForeignKey(
        'knowledge_base.KnowledgeCategory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets'
    )
    sentiment = models.CharField(
        max_length=50,
        default="Neutral",
        blank=True,
        help_text="AI detected sentiment"
    )
    sentiment_score = models.FloatField(
        default=0.0,
        help_text="AI detected sentiment confidence/score"
    )
    priority_score = models.FloatField(
        default=0.0,
        help_text="Intelligent calculated priority score"
    )
    priority_reason = models.TextField(
        blank=True,
        help_text="Reason for AI priority recommendation"
    )
    sla_risk_score = models.FloatField(
        default=0.0,
        help_text="Predicted SLA breach risk score"
    )
    sla_risk_level = models.CharField(
        max_length=20,
        default="low",
        help_text="Predicted SLA breach risk level"
    )
    is_escalated = models.BooleanField(default=False)
    escalated_at = models.DateTimeField(null=True, blank=True)
    
    # Content
    subject = models.CharField(max_length=500)
    description = models.TextField()
    request_type = models.CharField(
        max_length=50,
        choices=REQUEST_TYPES,
        default='other',
        blank=True,
        help_text="Type of support request"
    )
    
    # Status & Priority
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='new',
        db_index=True
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium'
    )
    
    # Resolution
    resolution_notes = models.TextField(
        blank=True,
        null=True,
        help_text="Notes on how the issue was resolved"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    
    # SLA Tracking
    first_response_sla = models.DateTimeField(
        null=True,
        blank=True,
        help_text="SLA deadline for first response"
    )
    resolution_sla = models.DateTimeField(
        null=True,
        blank=True,
        help_text="SLA deadline for resolution"
    )
    
    # Metadata
    ai_suggested_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="AI suggested request type"
    )
    ai_suggested_priority = models.CharField(
        max_length=20,
        blank=True,
        help_text="AI suggested priority"
    )
    ai_classification_confidence = models.FloatField(
        default=0.0,
        help_text="Confidence score for AI classification"
    )
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['customer']),
            models.Index(fields=['agent']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.ticket_number} - {self.subject}"
    
    def save(self, *args, **kwargs):
        """Auto-generate ticket number on first save"""
        if not self.ticket_number:
            date_str = timezone.now().strftime('%Y%m%d')
            count = Ticket.objects.filter(
                created_at__date=timezone.now().date()
            ).count() + 1
            self.ticket_number = f"TKT-{date_str}-{count:03d}"
        
        super().save(*args, **kwargs)
    
    def assign_to_agent(self, agent: User):
        """Assign ticket to an agent"""
        if agent.role != 'agent' and agent.role != 'admin':
            raise ValueError("Only agents can be assigned tickets")
        
        self.agent = agent
        self.assigned_at = timezone.now()
        if self.status == 'new':
            self.status = 'assigned'
        self.save()
        
        logger.info(f"Ticket {self.ticket_number} assigned to {agent.email}")
    
    def mark_in_progress(self):
        """Mark ticket as in progress"""
        self.status = 'in_progress'
        self.save()
        logger.info(f"Ticket {self.ticket_number} marked in progress")
    
    def mark_resolved(self, resolution_notes: str = ""):
        """Mark ticket as resolved"""
        self.status = 'resolved'
        self.resolved_at = timezone.now()
        if resolution_notes:
            self.resolution_notes = resolution_notes
        self.save()
        logger.info(f"Ticket {self.ticket_number} marked resolved")
    
    def close(self):
        """Close ticket"""
        self.status = 'closed'
        self.closed_at = timezone.now()
        self.save()
        logger.info(f"Ticket {self.ticket_number} closed")
    
    def is_overdue(self) -> bool:
        """Check if ticket is overdue on SLA"""
        if self.status in ['resolved', 'closed']:
            return False
        
        if self.resolution_sla and timezone.now() > self.resolution_sla:
            return True
        
        return False
    
    def get_time_to_resolve(self) -> timedelta:
        """Calculate time remaining to resolve ticket"""
        if self.status in ['resolved', 'closed']:
            return None
        
        if not self.resolution_sla:
            return None
        
        remaining = self.resolution_sla - timezone.now()
        return remaining if remaining.total_seconds() > 0 else None
    
    def get_resolution_time(self) -> timedelta:
        """Get actual time taken to resolve"""
        if self.resolved_at and self.created_at:
            return self.resolved_at - self.created_at
        return None


class TicketMessage(models.Model):
    """
    Message thread for ticket communication
    Supports both customer and internal agent notes
    """
    
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='ticket_messages'
    )
    content = models.TextField()
    is_internal = models.BooleanField(
        default=False,
        help_text="Internal notes not visible to customer"
    )
    is_read = models.BooleanField(
        default=False,
        help_text="Message read status for recipients"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Message on {self.ticket.ticket_number}"


class TicketAttachment(models.Model):
    """
    File attachments for tickets
    Supports file uploads from customers and agents
    """
    
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    file = models.FileField(upload_to='ticket_attachments/%Y/%m/%d/')
    filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField(help_text="File size in bytes")
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='ticket_attachments'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return self.filename


class TicketHistory(models.Model):
    """
    Audit trail for ticket changes
    Tracks all significant events and changes
    """
    
    ACTION_TYPES = (
        ('created', 'Created'),
        ('assigned', 'Assigned'),
        ('status_changed', 'Status Changed'),
        ('priority_changed', 'Priority Changed'),
        ('message_added', 'Message Added'),
        ('attachment_added', 'Attachment Added'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
        ('reopened', 'Reopened'),
    )
    
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='history'
    )
    action = models.CharField(max_length=50, choices=ACTION_TYPES)
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='ticket_history_actions'
    )
    old_value = models.CharField(max_length=255, blank=True)
    new_value = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['ticket', '-timestamp']),
            models.Index(fields=['action']),
        ]
    
    def __str__(self):
        return f"{self.action} on {self.ticket.ticket_number}"


class TicketTag(models.Model):
    """
    Tags for organizing and categorizing tickets
    Useful for filtering and analytics
    """
    
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='tags'
    )
    name = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('ticket', 'name')
    
    def __str__(self):
        return f"{self.ticket.ticket_number} - {self.name}"


class TicketWatcher(models.Model):
    """
    Users watching a ticket for updates
    Used for notifications and shared visibility
    """
    
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='watchers'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='watched_tickets'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('ticket', 'user')
    
    def __str__(self):
        return f"{self.user.email} watching {self.ticket.ticket_number}"
