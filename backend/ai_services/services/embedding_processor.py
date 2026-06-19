# backend/ai_services/services/embedding_processor.py
"""
Embedding Processor Service
Handles embedding generation for document chunks with error handling
"""

import logging
from typing import Tuple, Optional
from django.db import transaction
from django.utils import timezone

from knowledge_base.models import DocumentChunk
from .embedding_service import EmbeddingService, EmbeddingServiceException

logger = logging.getLogger(__name__)


class EmbeddingProcessor:
    """
    Process document chunks and generate embeddings
    
    Workflow:
    1. Get unembedded chunks
    2. Batch encode texts
    3. Store embedding vectors
    4. Update status
    5. Handle errors gracefully
    """
    
    def __init__(self):
        self.service = EmbeddingService.get_instance()
    
    def process_document_chunks(
        self,
        document,
        batch_size: int = 32,
        force_reprocess: bool = False
    ) -> Tuple[int, int, int]:
        """
        Process all chunks for a document
        
        Args:
            document: KnowledgeDocument instance
            batch_size: Batch size for encoding
            force_reprocess: Force reprocessing even if already embedded
            
        Returns:
            Tuple of (total_chunks, successful, failed)
        """
        try:
            # Update document status
            document.embedding_status = "processing"
            document.save(update_fields=['embedding_status'])
            
            # Get chunks
            chunks = document.chunks.all()
            
            if not chunks.exists():
                logger.warning(f"No chunks found for document: {document.id}")
                document.embedding_status = "completed"
                document.save(update_fields=['embedding_status'])
                return 0, 0, 0
            
            # Filter based on force_reprocess
            if force_reprocess:
                chunks_to_process = chunks.all()
            else:
                chunks_to_process = chunks.filter(embedding_vector__isnull=True)
            
            total = chunks_to_process.count()
            logger.info(f"Processing {total} chunks for document: {document.title}")
            
            successful = 0
            failed = 0
            
            # Process in batches
            for i in range(0, total, batch_size):
                batch = list(chunks_to_process[i:i+batch_size])
                
                try:
                    successful_in_batch, failed_in_batch = self._process_batch(
                        batch
                    )
                    successful += successful_in_batch
                    failed += failed_in_batch
                    
                except EmbeddingServiceException as e:
                    logger.error(f"✗ Batch processing failed: {e}")
                    failed += len(batch)
            
            # Update document status
            if failed == 0:
                document.embedding_status = "completed"
            else:
                document.embedding_status = "completed_with_errors"
            
            document.save(update_fields=['embedding_status'])
            
            logger.info(
                f"✓ Processed {total} chunks: "
                f"{successful} successful, {failed} failed"
            )
            
            return total, successful, failed
            
        except Exception as e:
            logger.error(f"✗ Document processing failed: {e}", exc_info=True)
            document.embedding_status = "failed"
            document.save(update_fields=['embedding_status'])
            raise
    
    def _process_batch(self, chunks) -> Tuple[int, int]:
        """
        Process a batch of chunks
        
        Args:
            chunks: List of DocumentChunk objects
            
        Returns:
            Tuple of (successful, failed)
        """
        try:
            # Extract texts
            texts = [chunk.content for chunk in chunks]
            
            # Generate embeddings
            embeddings, _ = self.service.encode_batch(texts)
            
            # Store embeddings
            successful = 0
            failed = 0
            
            with transaction.atomic():
                for chunk, embedding in zip(chunks, embeddings):
                    try:
                        # Validate
                        self.service.validate_embedding(embedding)
                        
                        # Generate embedding ID (mock implementation)
                        # In real ChromaDB, this would be a UUID
                        embedding_id = f"embed_{chunk.id}_{int(timezone.now().timestamp())}"
                        
                        # Store
                        chunk.embedding_id = embedding_id
                        chunk.embedding_vector = embedding
                        chunk.save(
                            update_fields=['embedding_id', 'embedding_vector']
                        )
                        
                        successful += 1
                        
                    except Exception as e:
                        logger.error(
                            f"✗ Failed to store embedding for chunk {chunk.id}: {e}"
                        )
                        failed += 1
            
            return successful, failed
            
        except EmbeddingServiceException as e:
            logger.error(f"✗ Encoding batch failed: {e}")
            return 0, len(chunks)
    
    def embed_text(self, text: str) -> Optional[list]:
        """
        Embed single text (for searching)
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector or None on error
        """
        try:
            embedding, _ = self.service.encode_single(text)
            self.service.validate_embedding(embedding)
            return embedding
            
        except EmbeddingServiceException as e:
            logger.error(f"✗ Failed to embed text: {e}")
            return None
    
    def reprocess_document(self, document) -> Tuple[int, int, int]:
        """
        Force reprocess all chunks for a document
        
        Args:
            document: KnowledgeDocument instance
            
        Returns:
            Tuple of (total_chunks, successful, failed)
        """
        logger.info(f"Force reprocessing document: {document.title}")
        
        # Clear old embeddings
        document.chunks.all().update(embedding_id=None)
        
        # Reprocess
        return self.process_document_chunks(
            document,
            force_reprocess=True
        )
