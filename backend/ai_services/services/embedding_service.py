# backend/ai_services/services/embedding_service.py
"""
Enterprise-grade Embedding Generation Service
Handles BAAI/bge-base-en-v1.5 model loading and chunk embedding
"""

import logging
from typing import List, Tuple, Optional
import numpy as np
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)


class EmbeddingServiceException(Exception):
    """Custom exception for embedding service errors"""
    pass


class EmbeddingService:
    """
    Production-grade embedding service using BAAI/bge-base-en-v1.5
    
    Features:
    - Singleton pattern (model loaded once)
    - Caching (24-hour TTL for embeddings)
    - Batch processing
    - Error handling & retry logic
    - Tensor optimization
    """
    
    _instance = None
    _model = None
    
    MODEL_NAME = "BAAI/bge-base-en-v1.5"
    EMBEDDING_DIM = 768
    CACHE_TIMEOUT = 3600 * 24  # 24 hours
    BATCH_SIZE = 32
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def get_instance(cls):
        """Get or create singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def initialize(self, force_reload: bool = False) -> None:
        """
        Initialize embedding model
        
        Args:
            force_reload: Force reload of model even if cached
            
        Raises:
            EmbeddingServiceException: If model initialization fails
        """
        if self._model is not None and not force_reload:
            logger.info("✓ Embedding model already initialized")
            return
        
        try:
            from sentence_transformers import SentenceTransformer
            
            logger.info(f"Initializing embedding model: {self.MODEL_NAME}")
            self._model = SentenceTransformer(
                self.MODEL_NAME,
                device="cpu"  # Use CPU for compatibility
            )
            logger.info("✓ Embedding model initialized successfully")
            
        except ImportError as e:
            logger.error(f"✗ sentence-transformers not installed: {e}")
            raise EmbeddingServiceException(
                "sentence-transformers package required. "
                "Install: pip install sentence-transformers"
            ) from e
        except Exception as e:
            logger.error(f"✗ Failed to initialize embedding model: {e}", exc_info=True)
            raise EmbeddingServiceException(
                f"Failed to initialize embedding model: {e}"
            ) from e
    
    def get_model(self):
        """Get embedding model (lazy initialization)"""
        if self._model is None:
            self.initialize()
        return self._model
    
    def encode_single(self, text: str) -> Tuple[List[float], bool]:
        """
        Encode single text with caching
        
        Args:
            text: Text to encode
            
        Returns:
            Tuple of (embedding_vector, was_cached)
            
        Raises:
            EmbeddingServiceException: If encoding fails
        """
        if not text or not isinstance(text, str):
            raise EmbeddingServiceException("Text must be non-empty string")
        
        # Check cache
        cache_key = f"embedding:{hash(text)}"
        cached = cache.get(cache_key)
        
        if cached is not None:
            logger.debug(f"✓ Cache hit for embedding")
            return cached, True
        
        try:
            model = self.get_model()
            embedding = model.encode(text, show_progress_bar=False)
            
            # Convert to list for JSON serialization
            embedding_list = embedding.tolist()
            
            # Cache result
            cache.set(cache_key, embedding_list, self.CACHE_TIMEOUT)
            
            return embedding_list, False
            
        except Exception as e:
            logger.error(f"✗ Encoding single text failed: {e}", exc_info=True)
            raise EmbeddingServiceException(f"Encoding failed: {e}") from e
    
    def encode_batch(self, texts: List[str]) -> Tuple[List[List[float]], int]:
        """
        Encode multiple texts efficiently
        
        Args:
            texts: List of texts to encode
            
        Returns:
            Tuple of (embeddings_list, cache_hits)
            
        Raises:
            EmbeddingServiceException: If encoding fails
        """
        if not texts or not isinstance(texts, list):
            raise EmbeddingServiceException("Texts must be non-empty list")
        
        # Filter empty strings
        texts = [t for t in texts if t and isinstance(t, str)]
        
        if not texts:
            raise EmbeddingServiceException("No valid texts to encode")
        
        try:
            model = self.get_model()
            
            # Encode batch
            logger.info(f"Encoding batch of {len(texts)} texts")
            embeddings = model.encode(
                texts,
                batch_size=self.BATCH_SIZE,
                show_progress_bar=False,
                convert_to_numpy=True
            )
            
            # Convert to list for JSON serialization
            embeddings_list = embeddings.tolist()
            
            # Cache batch results
            for text, embedding in zip(texts, embeddings_list):
                cache_key = f"embedding:{hash(text)}"
                cache.set(cache_key, embedding, self.CACHE_TIMEOUT)
            
            logger.info(f"✓ Encoded {len(texts)} texts successfully")
            return embeddings_list, 0
            
        except Exception as e:
            logger.error(f"✗ Batch encoding failed: {e}", exc_info=True)
            raise EmbeddingServiceException(f"Batch encoding failed: {e}") from e
    
    def get_dimensions(self) -> int:
        """Get embedding vector dimensions"""
        return self.EMBEDDING_DIM
    
    def validate_embedding(self, embedding: List[float]) -> bool:
        """
        Validate embedding vector
        
        Args:
            embedding: Embedding vector to validate
            
        Returns:
            True if valid
            
        Raises:
            EmbeddingServiceException: If invalid
        """
        if not isinstance(embedding, list):
            raise EmbeddingServiceException("Embedding must be a list")
        
        if len(embedding) != self.EMBEDDING_DIM:
            raise EmbeddingServiceException(
                f"Embedding dimension mismatch: "
                f"expected {self.EMBEDDING_DIM}, got {len(embedding)}"
            )
        
        if not all(isinstance(x, (int, float)) for x in embedding):
            raise EmbeddingServiceException("Embedding values must be numeric")
        
        return True
