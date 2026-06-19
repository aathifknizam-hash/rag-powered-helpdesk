# backend/ai_services/services/chromadb_sync.py
"""
ChromaDB Synchronization Service
Coordinates between DocumentChunks and ChromaDB vectors
"""

import logging
from typing import Tuple, List, Optional
from django.db import transaction

from knowledge_base.models import DocumentChunk, KnowledgeDocument
from .chromadb_service import ChromaDBService, ChromaDBServiceException
from .embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class ChromaDBSyncException(Exception):
    """Custom exception for sync errors"""
    pass


class ChromaDBSynchronizer:
    """
    Synchronizes document chunks with ChromaDB
    
    Workflow:
    1. Get embedded chunks (with embedding_vector)
    2. Format for ChromaDB
    3. Upsert to ChromaDB
    4. Store vector IDs back to chunks
    5. Handle sync errors
    """
    
    def __init__(self):
        self.chroma_service = ChromaDBService.get_instance()
        self.embedding_service = EmbeddingService.get_instance()
    
    def sync_document(
        self,
        document: KnowledgeDocument,
        force: bool = False
    ) -> Tuple[int, int, int]:
        """
        Sync all embedded chunks for a document to ChromaDB
        
        Args:
            document: KnowledgeDocument instance
            force: Force resync even if already in ChromaDB
            
        Returns:
            Tuple of (total, synced, failed)
        """
        try:
            # Get embedded chunks
            if force:
                chunks = document.chunks.filter(
                    embedding_vector__isnull=False
                )
            else:
                # Only sync chunks not yet in ChromaDB
                chunks = document.chunks.filter(
                    embedding_vector__isnull=False,
                    embedding_id__isnull=True
                )
            
            total = chunks.count()
            
            if total == 0:
                logger.info(f"No chunks to sync for document: {document.title}")
                return 0, 0, 0
            
            logger.info(f"Syncing {total} chunks for: {document.title}")
            
            # Format chunks for ChromaDB
            chroma_chunks = []
            chunk_list = list(chunks)
            
            for chunk in chunk_list:
                if not chunk.embedding_vector:
                    continue
                
                # Validate embedding
                try:
                    self.embedding_service.validate_embedding(
                        chunk.embedding_vector
                    )
                except Exception as e:
                    logger.error(f"✗ Invalid embedding for chunk {chunk.id}: {e}")
                    continue
                
                chroma_chunks.append({
                    'id': f"chunk_{chunk.id}",
                    'embedding': chunk.embedding_vector,
                    'content': chunk.content,
                    'chunk_index': chunk.chunk_index
                })
            
            if not chroma_chunks:
                logger.warning("No valid chunks to sync")
                return total, 0, total
            
            # Upsert to ChromaDB
            synced, failed = self.chroma_service.upsert_chunks(
                document_id=document.id,
                chunks=chroma_chunks
            )
            
            # Update chunks with ChromaDB IDs
            with transaction.atomic():
                for chunk in chroma_chunks:
                    DocumentChunk.objects.filter(
                        id=int(chunk['id'].split('_')[1])
                    ).update(
                        embedding_id=chunk['id']
                    )
            
            logger.info(
                f"✓ Sync complete: {synced} synced, "
                f"{failed} failed out of {total}"
            )
            
            return total, synced, failed
            
        except ChromaDBServiceException as e:
            logger.error(f"✗ ChromaDB sync failed: {e}")
            return total, 0, total
        except Exception as e:
            logger.error(f"✗ Sync error: {e}", exc_info=True)
            raise ChromaDBSyncException(f"Sync failed: {e}") from e
    
    def remove_document(self, document_id: int) -> int:
        """
        Remove all vectors for a document from ChromaDB
        Called when document is deleted
        
        Args:
            document_id: Document ID
            
        Returns:
            Number of deleted vectors
        """
        try:
            deleted = self.chroma_service.delete_by_document(document_id)
            logger.info(f"✓ Removed {deleted} vectors for document {document_id}")
            return deleted
            
        except ChromaDBServiceException as e:
            logger.error(f"✗ Failed to remove document: {e}")
            raise ChromaDBSyncException(f"Delete failed: {e}") from e
    
    def search_chunks(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        document_id: Optional[int] = None
    ) -> List[dict]:
        """
        Search ChromaDB for similar chunks
        
        Args:
            query_embedding: Query vector (768-dim)
            top_k: Number of results
            document_id: Optional filter by document
            
        Returns:
            List of results with content and metadata
        """
        try:
            # Validate embedding
            self.embedding_service.validate_embedding(query_embedding)
            
            # Build filter
            filter_dict = None
            if document_id:
                filter_dict = {'document_id': document_id}
            
            # Search
            results = self.chroma_service.search(
                query_embedding=query_embedding,
                n_results=top_k,
                filter_dict=filter_dict
            )
            
            # Enrich results with chunk data
            enriched = []
            for result in results:
                chunk_id = int(result['id'].split('_')[1])
                
                try:
                    chunk = DocumentChunk.objects.get(id=chunk_id)
                    enriched.append({
                        'chunk_id': chunk_id,
                        'chunk_index': chunk.chunk_index,
                        'document_id': chunk.document_id,
                        'document_title': chunk.document.title,
                        'content': result['content'],
                        'similarity': result['similarity'],
                        'distance': result['distance']
                    })
                except DocumentChunk.DoesNotExist:
                    logger.warning(f"Chunk not found: {chunk_id}")
                    continue
            
            logger.info(f"✓ Search returned {len(enriched)} results")
            return enriched
            
        except ChromaDBServiceException as e:
            logger.warning(f"ChromaDB search unavailable: {e}")
            return []
        except Exception as e:
            logger.error(f"✗ Search error: {e}", exc_info=True)
            raise ChromaDBSyncException(f"Search failed: {e}") from e
    
    def get_sync_status(self, document_id: int) -> dict:
        """
        Get sync status for a document
        
        Args:
            document_id: Document ID
            
        Returns:
            Status dict
        """
        try:
            document = KnowledgeDocument.objects.get(id=document_id)
            
            total = document.chunks.count()
            embedded = document.chunks.filter(
                embedding_vector__isnull=False
            ).count()
            synced = document.chunks.filter(
                embedding_id__isnull=False
            ).count()
            pending = total - synced
            
            return {
                'document_id': document_id,
                'document_title': document.title,
                'total_chunks': total,
                'embedded_chunks': embedded,
                'synced_chunks': synced,
                'pending_sync': pending,
                'embedding_status': document.embedding_status,
                'sync_progress': (
                    round(synced / total * 100, 2) if total > 0 else 0
                )
            }
            
        except KnowledgeDocument.DoesNotExist:
            raise ChromaDBSyncException(f"Document not found: {document_id}")
