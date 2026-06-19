"""
Views for AI services endpoints
- Embedding generation status
- Manual embedding trigger
- Re-embedding
- Query embedding
- ChromaDB operations
"""

import logging
from datetime import datetime
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone
from django.shortcuts import get_object_or_404

from knowledge_base.models import KnowledgeDocument, DocumentChunk
from .serializers import (
    EmbeddingStatusSerializer,
    ReembedDocumentSerializer,
    EmbeddingQuerySerializer,
    EmbeddingResultSerializer,
    DocumentChunkEmbeddingSerializer,
)
from .services.embedding_processor import EmbeddingProcessor
from .services.embedding_service import EmbeddingService, EmbeddingServiceException
from .services.chromadb_service import ChromaDBService, ChromaDBServiceException
from .services.chromadb_sync import ChromaDBSynchronizer, ChromaDBSyncException

logger = logging.getLogger(__name__)


class EmbeddingStatusView(APIView):
    """
    GET /api/ai/embeddings/status/<document_id>/
    
    Get embedding generation status for a document
    Returns: total chunks, embedded chunks, pending, progress %
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, document_id):
        try:
            document = get_object_or_404(KnowledgeDocument, id=document_id)
            
            # Get chunk counts
            total_chunks = document.chunks.count()
            embedded_chunks = document.chunks.filter(
                embedding_id__isnull=False
            ).count()
            pending_chunks = total_chunks - embedded_chunks
            
            # Calculate progress
            progress = (
                (embedded_chunks / total_chunks * 100)
                if total_chunks > 0 else 0
            )
            
            data = {
                'document_id': document.id,
                'document_title': document.title,
                'total_chunks': total_chunks,
                'embedded_chunks': embedded_chunks,
                'pending_chunks': pending_chunks,
                'status': document.embedding_status,
                'progress_percentage': round(progress, 2)
            }
            
            serializer = EmbeddingStatusSerializer(data)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"✗ Error getting embedding status: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class TriggerEmbeddingView(APIView):
    """
    POST /api/ai/embeddings/trigger/<document_id>/
    
    Manually trigger embedding generation for a document
    Useful if auto-triggering fails or for retries
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, document_id):
        try:
            document = get_object_or_404(KnowledgeDocument, id=document_id)
            
            # Check permissions (admin or own document)
            if request.user.role != 'admin':
                return Response(
                    {"error": "Only admins can trigger embeddings"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            logger.info(f"Manually triggering embeddings for: {document.title}")
            
            # Process embeddings
            processor = EmbeddingProcessor()
            total, successful, failed = processor.process_document_chunks(document)
            
            return Response({
                'document_id': document.id,
                'total_chunks': total,
                'successful': successful,
                'failed': failed,
                'status': document.embedding_status
            })
            
        except Exception as e:
            logger.error(f"✗ Error triggering embeddings: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ReembedDocumentView(APIView):
    """
    POST /api/ai/embeddings/reembed/<document_id>/
    
    Force re-embedding of all chunks
    Clears old embeddings and regenerates
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, document_id):
        try:
            document = get_object_or_404(KnowledgeDocument, id=document_id)
            
            # Check permissions
            if request.user.role != 'admin':
                return Response(
                    {"error": "Only admins can reembed"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = ReembedDocumentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            logger.info(f"Re-embedding document: {document.title}")
            
            processor = EmbeddingProcessor()
            total, successful, failed = processor.reprocess_document(document)
            
            return Response({
                'document_id': document.id,
                'total_chunks': total,
                'successful': successful,
                'failed': failed,
                'message': 'Document re-embedding completed'
            })
            
        except Exception as e:
            logger.error(f"✗ Error re-embedding: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class GenerateQueryEmbeddingView(APIView):
    """
    POST /api/ai/embeddings/query/
    
    Generate embedding for a query text
    Used for RAG search engine
    
    Request:
    {
        "query": "How do I reset my password?"
    }
    
    Response:
    {
        "query": "How do I reset my password?",
        "embedding": [0.123, 0.456, ...],
        "dimension": 768,
        "model": "BAAI/bge-base-en-v1.5"
    }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            serializer = EmbeddingQuerySerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            query = serializer.validated_data['query']
            
            # Generate embedding
            service = EmbeddingService.get_instance()
            embedding, was_cached = service.encode_single(query)
            
            result_data = {
                'query': query,
                'embedding': embedding,
                'dimension': service.get_dimensions(),
                'model': service.MODEL_NAME,
                'timestamp': timezone.now(),
                'cached': was_cached
            }
            
            result_serializer = EmbeddingResultSerializer(result_data)
            return Response(result_serializer.data)
            
        except EmbeddingServiceException as e:
            logger.error(f"✗ Embedding generation failed: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class DocumentChunksEmbeddingListView(generics.ListAPIView):
    """
    GET /api/ai/embeddings/chunks/<document_id>/
    
    List all chunks for a document with embedding status
    Shows which chunks have embeddings and their status
    """
    serializer_class = DocumentChunkEmbeddingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        document_id = self.kwargs.get('document_id')
        return DocumentChunk.objects.filter(
            document_id=document_id
        ).order_by('chunk_index')
    
    def get(self, request, *args, **kwargs):
        try:
            # Verify document exists
            document = get_object_or_404(
                KnowledgeDocument,
                id=kwargs.get('document_id')
            )
            
            return super().get(request, *args, **kwargs)
            
        except Exception as e:
            logger.error(f"✗ Error listing chunks: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class EmbeddingHealthCheckView(APIView):
    """
    GET /api/ai/embeddings/health/
    
    Check embedding service health
    Verifies model is loaded and ready
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            service = EmbeddingService.get_instance()
            service.initialize()
            
            return Response({
                'status': 'healthy',
                'model': service.MODEL_NAME,
                'dimension': service.EMBEDDING_DIM,
                'device': 'cpu',
                'cache_timeout': service.CACHE_TIMEOUT
            })
            
        except Exception as e:
            logger.error(f"✗ Embedding service unhealthy: {e}")
            return Response({
                'status': 'unhealthy',
                'error': str(e)
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


# ============================================================================
# PHASE 3D: CHROMADB ENDPOINTS
# ============================================================================

class ChromaDBSyncView(APIView):
    """
    POST /api/ai/chromadb/sync/<document_id>/
    
    Sync document chunks to ChromaDB
    Only needed if auto-sync is disabled or failed
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, document_id):
        try:
            if request.user.role != 'admin':
                return Response(
                    {"error": "Only admins can sync vectors"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            document = get_object_or_404(KnowledgeDocument, id=document_id)
            
            logger.info(f"Syncing to ChromaDB: {document.title}")
            
            synchronizer = ChromaDBSynchronizer()
            total, synced, failed = synchronizer.sync_document(document)
            
            return Response({
                'document_id': document_id,
                'total': total,
                'synced': synced,
                'failed': failed,
                'message': 'ChromaDB sync completed'
            })
            
        except ChromaDBSyncException as e:
            logger.error(f"✗ Sync failed: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"✗ Error: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ChromaDBRemoveView(APIView):
    """
    DELETE /api/ai/chromadb/remove/<document_id>/
    
    Remove document vectors from ChromaDB
    Called when document is deleted
    """
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, document_id):
        try:
            if request.user.role != 'admin':
                return Response(
                    {"error": "Only admins can remove vectors"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            logger.info(f"Removing from ChromaDB: {document_id}")
            
            synchronizer = ChromaDBSynchronizer()
            deleted = synchronizer.remove_document(document_id)
            
            return Response({
                'document_id': document_id,
                'deleted': deleted,
                'message': 'Vectors removed from ChromaDB'
            })
            
        except ChromaDBSyncException as e:
            logger.error(f"✗ Delete failed: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ChromaDBStatusView(APIView):
    """
    GET /api/ai/chromadb/status/<document_id>/
    
    Get ChromaDB sync status for a document
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, document_id):
        try:
            synchronizer = ChromaDBSynchronizer()
            status_data = synchronizer.get_sync_status(document_id)
            
            return Response(status_data)
            
        except ChromaDBSyncException as e:
            logger.error(f"✗ Status check failed: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ChromaDBStatsView(APIView):
    """
    GET /api/ai/chromadb/stats/
    
    Get ChromaDB collection statistics
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            if request.user.role != 'admin':
                return Response(
                    {"error": "Only admins can view stats"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            service = ChromaDBService.get_instance()
            stats = service.get_collection_stats()
            
            return Response(stats)
            
        except ChromaDBServiceException as e:
            logger.error(f"✗ Stats failed: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ChromaDBHealthCheckView(APIView):
    """
    GET /api/ai/chromadb/health/
    
    Check ChromaDB service health
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            service = ChromaDBService.get_instance()
            service.initialize()
            is_healthy = service.health_check()
            
            if is_healthy:
                stats = service.get_collection_stats()
                return Response({
                    'status': 'healthy',
                    'stats': stats
                })
            else:
                return Response({
                    'status': 'unhealthy'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                
        except Exception as e:
            logger.error(f"✗ Health check failed: {e}")
            return Response({
                'status': 'unhealthy',
                'error': str(e)
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


# ============================================================================
# PHASE 4: RAG SEARCH ENGINE
# ============================================================================

class RAGSearchView(APIView):
    """
    POST /api/ai/search/
    
    Complete RAG pipeline: semantic search + LLM response
    
    Request:
    {
        "query": "How do I reset my password?",
        "top_k": 5,
        "use_faq": true,
        "use_groq": true,
        "document_id": null  # optional filter
    }
    
    Response:
    {
        "query": "How do I reset my password?",
        "response": "To reset your password...",
        "sources": [
            {
                "type": "document",
                "source": "FAQ - Password Management",
                "similarity": 0.92
            }
        ],
        "confidence": 0.92,
        "search_results": [...],
        "used_llm": true,
        "status": "success",
        "processing_time_ms": 1250,
        "timestamp": "2026-06-07T10:30:00Z"
    }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            query = request.data.get('query', '').strip()
            
            if not query:
                return Response(
                    {"error": "Query is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if len(query) > 5000:
                return Response(
                    {"error": "Query is too long (max 5000 chars)"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get parameters
            top_k = int(request.data.get('top_k', 5))
            use_faq = request.data.get('use_faq', True)
            use_groq = request.data.get('use_groq', True)
            document_id = request.data.get('document_id', None)
            
            # Validate top_k
            top_k = max(1, min(top_k, 20))
            
            logger.info(f"RAG search initiated: {query[:50]}...")
            
            # Run RAG pipeline
            from ai_services.services.rag_service import RAGService
            rag_service = RAGService()
            
            result = rag_service.search_and_generate(
                query=query,
                top_k=top_k,
                use_faq=use_faq,
                document_id=document_id,
                use_groq=use_groq
            )
            
            # Filter confidence information for non-staff users
            if getattr(request.user, 'role', 'customer') not in ['agent', 'admin']:
                result.pop('confidence', None)
                if 'sources' in result:
                    for source in result['sources']:
                        source.pop('similarity', None)
                        
            return Response(result)
            
        except Exception as e:
            logger.error(f"✗ RAG search failed: {e}", exc_info=True)
            return Response(
                {
                    "error": "Search processing failed",
                    "detail": str(e),
                    "suggested_action": "create_ticket"
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SearchHistoryView(generics.ListAPIView):
    """
    GET /api/ai/search/history/
    
    Get user's search history (for analytics/UX)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # TODO: Implement search history tracking
        # For now, return empty list
        return Response({
            'searches': [],
            'total': 0,
            'note': 'Search history tracking coming soon'
        })
