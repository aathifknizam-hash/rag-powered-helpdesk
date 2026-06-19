# backend/ai_services/tasks.py
"""
Async tasks for AI services (Celery-ready, but also synchronous fallback)

When Celery is not configured, these run synchronously.
When Celery is configured, they run asynchronously.
"""

import logging
from django.conf import settings

logger = logging.getLogger(__name__)

# Check if Celery is configured
HAS_CELERY = False
celery_app = None

try:
    from celery import shared_task
    HAS_CELERY = True
except ImportError:
    # Fallback: define dummy decorator
    def shared_task(*args, **kwargs):
        def decorator(func):
            return func
        return decorator


def process_embeddings(document_id: int) -> dict:
    """
    Synchronous embedding processor
    Can be called from async task or directly
    
    Args:
        document_id: ID of KnowledgeDocument
        
    Returns:
        dict with processing results
    """
    from knowledge_base.models import KnowledgeDocument
    from ai_services.services.embedding_processor import EmbeddingProcessor
    from ai_services.services.chromadb_sync import ChromaDBSynchronizer
    
    try:
        document = KnowledgeDocument.objects.get(id=document_id)
        
        # Step 1: Generate embeddings
        logger.info(f"Step 1: Generating embeddings for: {document.title}")
        processor = EmbeddingProcessor()
        total, successful, failed = processor.process_document_chunks(document)
        
        logger.info(f"✓ Generated embeddings: {successful}/{total} chunks")
        
        # Step 2: Sync to ChromaDB
        logger.info(f"Step 2: Syncing to ChromaDB for: {document.title}")
        synchronizer = ChromaDBSynchronizer()
        sync_total, synced, sync_failed = synchronizer.sync_document(document)
        
        logger.info(f"✓ ChromaDB sync: {synced}/{sync_total} chunks")
        
        return {
            "document_id": document_id,
            "total": total,
            "successful": successful,
            "failed": failed,
            "synced": synced,
            "sync_failed": sync_failed,
            "status": "completed"
        }
        
    except KnowledgeDocument.DoesNotExist:
        logger.error(f"✗ Document not found: {document_id}")
        return {
            "document_id": document_id,
            "status": "error",
            "error": "Document not found"
        }
    except Exception as e:
        logger.error(f"✗ Processing failed: {e}", exc_info=True)
        return {
            "document_id": document_id,
            "status": "error",
            "error": str(e)
        }


# Define Celery-compatible task
if HAS_CELERY:
    @shared_task(bind=True, max_retries=3)
    def generate_embeddings_task(self, document_id: int):
        """
        Async Celery task for embedding + ChromaDB sync
        Includes retry logic for failed processing
        
        Args:
            document_id: ID of KnowledgeDocument
        """
        try:
            return process_embeddings(document_id)
        except Exception as e:
            logger.error(f"✗ Task failed, retrying: {e}")
            # Retry after 5 seconds
            self.retry(countdown=5, exc=e)
else:
    # Fallback: synchronous version
    def generate_embeddings_task(document_id: int):
        """Synchronous fallback task"""
        return process_embeddings(document_id)
