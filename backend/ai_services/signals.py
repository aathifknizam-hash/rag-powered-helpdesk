# backend/ai_services/signals.py
"""
Signal handlers for AI services
Auto-triggers embedding generation on document upload
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.exceptions import ObjectDoesNotExist

from knowledge_base.models import KnowledgeDocument
from ai_services.tasks import generate_embeddings_task

logger = logging.getLogger(__name__)


@receiver(post_save, sender=KnowledgeDocument)
def trigger_embedding_generation(sender, instance, created, **kwargs):
    """
    Signal handler to trigger embedding generation after document text extraction
    
    Triggered when:
    - Document is created
    - Document embedding_status changes to 'completed' (text extraction done)
    """
    try:
        if not instance.chunks.exists():
            return

        pending = instance.chunks.filter(embedding_vector__isnull=True).count()
        if pending == 0:
            return

        if instance.embedding_status in ("processing", "failed"):
            return

        logger.info(f"Triggering embedding generation for: {instance.title}")

        if hasattr(generate_embeddings_task, "delay"):
            generate_embeddings_task.delay(instance.id)
        else:
            generate_embeddings_task(instance.id)

    except Exception as e:
        logger.error(f"✗ Error in embedding signal handler: {e}", exc_info=True)
