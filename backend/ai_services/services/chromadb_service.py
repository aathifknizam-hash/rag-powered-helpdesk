# backend/ai_services/services/chromadb_service.py
"""
Enterprise-grade ChromaDB Integration Service
Handles vector storage, retrieval, and synchronization
"""

import logging
import os
import json
from typing import List, Dict, Tuple, Optional, Any
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class ChromaDBServiceException(Exception):
    """Custom exception for ChromaDB service errors"""
    pass


class ChromaDBService:
    """
    Production-grade ChromaDB service
    
    Features:
    - Singleton pattern (client initialized once)
    - Collection management
    - Batch vector insertion
    - Similarity search
    - Metadata filtering
    - Automatic persistence
    - Error handling & recovery
    """
    
    _instance = None
    _client = None
    
    DEFAULT_COLLECTION = "smart_service_desk"
    EMBEDDING_DIM = 768
    SEARCH_TOP_K = 5
    
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
        Initialize ChromaDB client
        
        Args:
            force_reload: Force reload of client
            
        Raises:
            ChromaDBServiceException: If initialization fails
        """
        if self._client is not None and not force_reload:
            logger.info("✓ ChromaDB client already initialized")
            return
        
        try:
            import chromadb
            
            # Get ChromaDB persist directory
            persist_dir = getattr(
                settings,
                'CHROMADB_PERSIST_DIR',
                os.path.join(settings.BASE_DIR, 'chromadb_data')
            )
            
            # Create directory if not exists
            os.makedirs(persist_dir, exist_ok=True)
            
            logger.info(f"Initializing ChromaDB with persist directory: {persist_dir}")

            # Use PersistentClient (ChromaDB v0.4+ API)
            self._client = chromadb.PersistentClient(path=persist_dir)
            
            logger.info("✓ ChromaDB client initialized successfully")
            
            # Create or get default collection
            self._get_or_create_collection(self.DEFAULT_COLLECTION)
            
        except ImportError as e:
            logger.error(f"✗ chromadb not installed: {e}")
            raise ChromaDBServiceException(
                "chromadb package required. Install: pip install chromadb"
            ) from e
        except Exception as e:
            logger.error(f"✗ Failed to initialize ChromaDB: {e}", exc_info=True)
            raise ChromaDBServiceException(
                f"Failed to initialize ChromaDB: {e}"
            ) from e
    
    def get_client(self):
        """Get ChromaDB client (lazy initialization)"""
        if self._client is None:
            self.initialize()
        return self._client
    
    def _get_or_create_collection(self, collection_name: str = None):
        """
        Get or create collection
        
        Args:
            collection_name: Name of collection
            
        Returns:
            Collection object
        """
        if collection_name is None:
            collection_name = self.DEFAULT_COLLECTION
        
        try:
            client = self.get_client()
            
            collection = client.get_or_create_collection(
                name=collection_name,
                metadata={
                    "hnsw:space": "cosine",
                    "created_at": timezone.now().isoformat()
                }
            )
            
            logger.info(f"✓ Collection ready: {collection_name}")
            return collection
            
        except Exception as e:
            logger.error(f"✗ Failed to create collection: {e}")
            raise ChromaDBServiceException(f"Collection error: {e}") from e
    
    def upsert_chunks(
        self,
        document_id: int,
        chunks: List[Dict[str, Any]],
        collection_name: str = None
    ) -> Tuple[int, int]:
        """
        Insert or update document chunks as vectors
        
        Args:
            document_id: ID of source document
            chunks: List of chunk dicts with:
                {
                    'id': chunk_id,
                    'embedding': [768-dim vector],
                    'content': 'chunk text',
                    'chunk_index': index
                }
            collection_name: Collection name
            
        Returns:
            Tuple of (inserted, updated)
        """
        if collection_name is None:
            collection_name = self.DEFAULT_COLLECTION
        
        if not chunks:
            logger.warning("No chunks to upsert")
            return 0, 0
        
        try:
            collection = self._get_or_create_collection(collection_name)
            
            ids = []
            embeddings = []
            documents = []
            metadatas = []
            
            for chunk in chunks:
                ids.append(str(chunk['id']))
                embeddings.append(chunk['embedding'])
                documents.append(chunk['content'])
                
                metadatas.append({
                    'document_id': document_id,
                    'chunk_index': chunk.get('chunk_index', 0),
                    'source': 'knowledge_base',
                    'timestamp': timezone.now().isoformat()
                })
            
            # Upsert to ChromaDB
            collection.upsert(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )
            
            logger.info(f"✓ Upserted {len(chunks)} chunks for document {document_id}")

            return len(chunks), 0
            
        except Exception as e:
            logger.error(f"✗ Upsert failed: {e}", exc_info=True)
            raise ChromaDBServiceException(f"Upsert failed: {e}") from e
    
    def search(
        self,
        query_embedding: List[float],
        n_results: int = None,
        filter_dict: Optional[Dict] = None,
        collection_name: str = None
    ) -> List[Dict[str, Any]]:
        """
        Search similar vectors
        
        Args:
            query_embedding: Query vector (768-dim)
            n_results: Number of results to return
            filter_dict: Metadata filter
            collection_name: Collection name
            
        Returns:
            List of results:
            [{
                'id': chunk_id,
                'content': chunk_text,
                'similarity': score,
                'metadata': {...}
            }]
        """
        if n_results is None:
            n_results = self.SEARCH_TOP_K
        
        if collection_name is None:
            collection_name = self.DEFAULT_COLLECTION
        
        try:
            collection = self._get_or_create_collection(collection_name)
            
            # Validate embedding
            if not isinstance(query_embedding, list):
                raise ChromaDBServiceException("Embedding must be a list")
            
            if len(query_embedding) != self.EMBEDDING_DIM:
                raise ChromaDBServiceException(
                    f"Embedding dimension mismatch: expected {self.EMBEDDING_DIM}, "
                    f"got {len(query_embedding)}"
                )
            
            # Search
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=filter_dict
            )
            
            # Format results
            formatted_results = []
            
            if results['ids'] and len(results['ids']) > 0:
                for idx, (chunk_id, distance, document, metadata) in enumerate(
                    zip(
                        results['ids'][0],
                        results['distances'][0] if results['distances'] else [],
                        results['documents'][0] if results['documents'] else [],
                        results['metadatas'][0] if results['metadatas'] else []
                    )
                ):
                    # Convert distance to similarity (cosine)
                    # Distance is already cosine distance in ChromaDB
                    similarity = 1 - distance
                    
                    formatted_results.append({
                        'id': chunk_id,
                        'content': document,
                        'similarity': round(similarity, 4),
                        'distance': round(distance, 4),
                        'metadata': metadata or {}
                    })
            
            logger.info(f"✓ Search returned {len(formatted_results)} results")
            return formatted_results
            
        except ChromaDBServiceException:
            raise
        except Exception as e:
            logger.error(f"✗ Search failed: {e}", exc_info=True)
            raise ChromaDBServiceException(f"Search failed: {e}") from e
    
    def delete_by_document(
        self,
        document_id: int,
        collection_name: str = None
    ) -> int:
        """
        Delete all chunks for a document
        
        Args:
            document_id: Document ID to delete
            collection_name: Collection name
            
        Returns:
            Number of deleted items
        """
        if collection_name is None:
            collection_name = self.DEFAULT_COLLECTION
        
        try:
            collection = self._get_or_create_collection(collection_name)
            
            # Get all IDs for this document
            results = collection.get(
                where={'document_id': document_id}
            )
            
            if not results['ids']:
                logger.info(f"No vectors found for document {document_id}")
                return 0
            
            # Delete all
            collection.delete(ids=results['ids'])
            
            logger.info(
                f"✓ Deleted {len(results['ids'])} vectors "
                f"for document {document_id}"
            )

            return len(results['ids'])
            
        except Exception as e:
            logger.error(f"✗ Delete failed: {e}", exc_info=True)
            raise ChromaDBServiceException(f"Delete failed: {e}") from e
    
    def get_collection_stats(
        self,
        collection_name: str = None
    ) -> Dict[str, Any]:
        """
        Get collection statistics
        
        Args:
            collection_name: Collection name
            
        Returns:
            Stats dict
        """
        if collection_name is None:
            collection_name = self.DEFAULT_COLLECTION
        
        try:
            collection = self._get_or_create_collection(collection_name)
            
            count = collection.count()
            
            return {
                'collection_name': collection_name,
                'total_vectors': count,
                'embedding_dimension': self.EMBEDDING_DIM,
                'space': 'cosine'
            }
            
        except Exception as e:
            logger.error(f"✗ Failed to get stats: {e}")
            raise ChromaDBServiceException(f"Stats error: {e}") from e
    
    def clear_collection(
        self,
        collection_name: str = None,
        confirm: bool = False
    ) -> bool:
        """
        DANGER: Clear entire collection
        
        Args:
            collection_name: Collection name
            confirm: Must be True to proceed
            
        Returns:
            True if successful
        """
        if not confirm:
            raise ChromaDBServiceException("Confirmation required to clear collection")
        
        if collection_name is None:
            collection_name = self.DEFAULT_COLLECTION
        
        try:
            client = self.get_client()
            client.delete_collection(name=collection_name)
            
            logger.warning(f"⚠ Cleared collection: {collection_name}")
            
            # Recreate collection
            self._get_or_create_collection(collection_name)
            
            return True
            
        except Exception as e:
            logger.error(f"✗ Clear failed: {e}")
            raise ChromaDBServiceException(f"Clear failed: {e}") from e
    
    def health_check(self) -> bool:
        """
        Check ChromaDB service health
        
        Returns:
            True if healthy
        """
        try:
            stats = self.get_collection_stats()
            logger.info(f"✓ ChromaDB healthy: {stats}")
            return True
        except Exception as e:
            logger.error(f"✗ ChromaDB unhealthy: {e}")
            return False
