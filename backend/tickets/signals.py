"""
Signal handlers for Ticket Management System
Phase 6: Auto-classification and notifications
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Ticket, TicketHistory

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Ticket)
def log_ticket_creation(sender, instance, created, **kwargs):
    """
    Log ticket creation in audit trail
    This signal is called after ticket creation
    """
    if created:
        logger.debug(f"Signal: Ticket {instance.ticket_number} created")

@receiver(post_save, sender=Ticket)
def trigger_agent_metrics_update(sender, instance, created, **kwargs):
    """
    Trigger agent metrics update when ticket status becomes resolved or closed
    """
    if not created and instance.agent and instance.status in ['resolved', 'closed']:
        try:
            from .services.agent_metrics import update_agent_metrics
            update_agent_metrics(instance.agent)
        except Exception as e:
            logger.error(f"Failed to update agent metrics in signal: {e}")


@receiver(post_save, sender=TicketHistory)
def log_history_entry(sender, instance, created, **kwargs):
    """
    Log history entries for debugging
    """
    if created:
        logger.debug(
            f"Signal: TicketHistory - {instance.action} "
            f"by {instance.actor.email if instance.actor else 'system'} "
            f"on ticket {instance.ticket.ticket_number}"
        )
