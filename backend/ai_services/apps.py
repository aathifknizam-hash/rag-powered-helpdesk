from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class AiServicesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ai_services'
    verbose_name = 'AI Services'
    
    def ready(self):
        """Initialize AI services on app startup"""
        # Import signals
        from . import signals  # noqa: F401
        
        # Initialize embedding service
        logger.info("Initializing AI Services...")
        
        try:
            from ai_services.services.embedding_service import EmbeddingService
            service = EmbeddingService.get_instance()
            service.initialize()
            logger.info("✓ AI Services initialized successfully")
        except Exception as e:
            logger.warning(f"⚠ AI Services initialization: {e}")
            # Don't raise - allow app to continue if AI services unavailable
