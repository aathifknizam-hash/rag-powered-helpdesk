"""
Production-ready Sentence-Transformers integration with Django & ChromaDB

This module demonstrates industry-grade patterns for:
- Safe model initialization
- Efficient caching
- Error handling
- Batch processing
"""

import logging
from typing import List, Optional
import numpy as np
from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)

# ============================================================================
# SINGLETON MODEL MANAGER
# ============================================================================

class EmbeddingModelManager:
    """Thread-safe embedding model manager with caching"""
    
    _instance = None
    _model = None
    _chroma_client = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def get_instance(cls):
        """Get singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def initialize(self, model_name: str = "BAAI/bge-base-en-v1.5"):
        """Initialize embedding model (called once during app startup)"""
        try:
            from sentence_transformers import SentenceTransformer
            
            logger.info(f"Initializing embedding model: {model_name}")
            self._model = SentenceTransformer(model_name)
            logger.info(f"✓ Model initialized successfully")
            
        except Exception as e:
            logger.error(f"✗ Failed to initialize model: {e}", exc_info=True)
            raise ImproperlyConfigured(
                f"Failed to initialize embedding model: {e}. "
                "Ensure torch, transformers, and sentence-transformers are installed."
            )
    
    def initialize_chromadb(self, collection_name: str = "documents"):
        """Initialize ChromaDB client"""
        try:
            import chromadb
            
            logger.info(f"Initializing ChromaDB client")
            self._chroma_client = chromadb.Client()
            
            # Get or create collection
            self.collection = self._chroma_client.get_or_create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            logger.info(f"✓ ChromaDB initialized with collection: {collection_name}")
            
        except Exception as e:
            logger.error(f"✗ Failed to initialize ChromaDB: {e}", exc_info=True)
            raise ImproperlyConfigured(f"Failed to initialize ChromaDB: {e}")
    
    def get_model(self):
        """Get embedding model (lazy initialization)"""
        if self._model is None:
            self.initialize()
        return self._model
    
    def get_chroma_client(self):
        """Get ChromaDB client"""
        if self._chroma_client is None:
            self.initialize_chromadb()
        return self._chroma_client


# ============================================================================
# EMBEDDING SERVICE
# ============================================================================

class EmbeddingService:
    """High-level embedding service with caching and batching"""
    
    def __init__(self):
        self.manager = EmbeddingModelManager.get_instance()
        self.cache_timeout = 3600 * 24  # 24 hours
    
    def encode(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """
        Encode texts to embeddings with caching
        
        Args:
            texts: List of text strings
            batch_size: Batch size for encoding
            
        Returns:
            numpy array of shape (len(texts), embedding_dim)
        """
        try:
            model = self.manager.get_model()
            
            # Check cache for existing embeddings (for single texts)
            if len(texts) == 1:
                cache_key = f"embedding:{hash(texts[0])}"
                cached = cache.get(cache_key)
                if cached is not None:
                    logger.debug(f"Cache hit for embedding")
                    return np.array([cached])
            
            # Encode
            logger.info(f"Encoding {len(texts)} texts")
            embeddings = model.encode(texts, batch_size=batch_size, show_progress_bar=False)
            
            # Cache single embeddings
            if len(texts) == 1:
                cache.set(cache_key, embeddings[0].tolist(), self.cache_timeout)
            
            return embeddings
            
        except Exception as e:
            logger.error(f"✗ Encoding failed: {e}", exc_info=True)
            raise
    
    def search(
        self, 
        query: str, 
        collection_name: str = "documents",
        n_results: int = 5
    ) -> List[dict]:
        """
        Search similar documents in ChromaDB
        
        Args:
            query: Query text
            collection_name: ChromaDB collection name
            n_results: Number of results to return
            
        Returns:
            List of matching documents with metadata
        """
        try:
            client = self.manager.get_chroma_client()
            collection = client.get_collection(collection_name)
            
            # Encode query
            query_embedding = self.encode([query])[0]
            
            # Search
            results = collection.query(
                query_embeddings=[query_embedding.tolist()],
                n_results=n_results
            )
            
            return results
            
        except Exception as e:
            logger.error(f"✗ Search failed: {e}", exc_info=True)
            raise
    
    def upsert_documents(
        self,
        ids: List[str],
        documents: List[str],
        metadatas: Optional[List[dict]] = None,
        collection_name: str = "documents"
    ) -> None:
        """
        Add or update documents in ChromaDB with embeddings
        
        Args:
            ids: Document IDs
            documents: Document texts
            metadatas: Optional metadata dicts
            collection_name: Collection name
        """
        try:
            client = self.manager.get_chroma_client()
            collection = client.get_collection(collection_name)
            
            # Encode documents
            embeddings = self.encode(documents)
            
            # Upsert to ChromaDB
            collection.upsert(
                ids=ids,
                embeddings=embeddings.tolist(),
                documents=documents,
                metadatas=metadatas or [{}] * len(documents)
            )
            
            logger.info(f"✓ Upserted {len(ids)} documents to {collection_name}")
            
        except Exception as e:
            logger.error(f"✗ Upsert failed: {e}", exc_info=True)
            raise


# ============================================================================
# DJANGO APP INITIALIZATION
# ============================================================================

def initialize_embedding_system():
    """
    Initialize embedding system during Django startup
    
    Call this in apps.py:
    
    class YourAppConfig(AppConfig):
        def ready(self):
            from .embeddings import initialize_embedding_system
            initialize_embedding_system()
    """
    try:
        logger.info("Initializing embedding system...")
        manager = EmbeddingModelManager.get_instance()
        manager.initialize()
        manager.initialize_chromadb()
        logger.info("✓ Embedding system initialized successfully")
    except Exception as e:
        logger.error(f"✗ Failed to initialize embedding system: {e}", exc_info=True)
        # Note: Don't raise here if embedding is optional, just log warning
        if not settings.DEBUG:
            raise


# ============================================================================
# USAGE EXAMPLES
# ============================================================================

"""
# In apps.py
from django.apps import AppConfig

class EmbeddingsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'embeddings'
    
    def ready(self):
        from .embeddings import initialize_embedding_system
        initialize_embedding_system()


# In views.py
from django.views import View
from django.http import JsonResponse
from .embeddings import EmbeddingService

class SearchView(View):
    def post(self, request):
        query = request.POST.get('q')
        service = EmbeddingService()
        results = service.search(query, n_results=5)
        return JsonResponse({'results': results})


# In tasks.py (for Celery)
from celery import shared_task
from .embeddings import EmbeddingService

@shared_task
def index_documents(doc_ids, texts, metadatas=None):
    service = EmbeddingService()
    service.upsert_documents(doc_ids, texts, metadatas)
"""
