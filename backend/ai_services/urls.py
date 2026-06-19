# backend/ai_services/urls.py
"""
URLs for AI Services APIs
- Embeddings endpoints
- Query endpoints
- ChromaDB endpoints
- RAG search endpoints
- Health checks
"""

from django.urls import path
from .views import (
    # Embeddings
    EmbeddingStatusView,
    TriggerEmbeddingView,
    ReembedDocumentView,
    GenerateQueryEmbeddingView,
    DocumentChunksEmbeddingListView,
    EmbeddingHealthCheckView,
    # ChromaDB
    ChromaDBSyncView,
    ChromaDBRemoveView,
    ChromaDBStatusView,
    ChromaDBStatsView,
    ChromaDBHealthCheckView,
    # RAG
    RAGSearchView,
    SearchHistoryView,
)
from .copilot_views import (
    CopilotSuggestionView,
    CopilotKnowledgeView,
    CopilotSimilarTicketsView,
    CopilotAskView,
    ClassifyTicketView,
)
from .diagnostics_views import AIDiagnosticsView

app_name = 'ai_services'

urlpatterns = [
    # ========== PHASE 3C: EMBEDDINGS ==========
    
    # Embedding Status
    path(
        'embeddings/status/<int:document_id>/',
        EmbeddingStatusView.as_view(),
        name='embedding-status'
    ),
    
    # Trigger Embedding Generation
    path(
        'embeddings/trigger/<int:document_id>/',
        TriggerEmbeddingView.as_view(),
        name='trigger-embedding'
    ),
    
    # Re-embed Document
    path(
        'embeddings/reembed/<int:document_id>/',
        ReembedDocumentView.as_view(),
        name='reembed-document'
    ),
    
    # Generate Query Embedding
    path(
        'embeddings/query/',
        GenerateQueryEmbeddingView.as_view(),
        name='query-embedding'
    ),
    
    # List Document Chunks with Embedding Status
    path(
        'embeddings/chunks/<int:document_id>/',
        DocumentChunksEmbeddingListView.as_view(),
        name='document-chunks-embedding'
    ),
    
    # Embedding Health Check
    path(
        'embeddings/health/',
        EmbeddingHealthCheckView.as_view(),
        name='embedding-health'
    ),
    
    # ========== PHASE 3D: CHROMADB ==========
    
    # ChromaDB Sync
    path(
        'chromadb/sync/<int:document_id>/',
        ChromaDBSyncView.as_view(),
        name='chromadb-sync'
    ),
    
    # ChromaDB Remove
    path(
        'chromadb/remove/<int:document_id>/',
        ChromaDBRemoveView.as_view(),
        name='chromadb-remove'
    ),
    
    # ChromaDB Sync Status
    path(
        'chromadb/status/<int:document_id>/',
        ChromaDBStatusView.as_view(),
        name='chromadb-status'
    ),
    
    # ChromaDB Collection Stats
    path(
        'chromadb/stats/',
        ChromaDBStatsView.as_view(),
        name='chromadb-stats'
    ),
    
    # ChromaDB Health Check
    path(
        'chromadb/health/',
        ChromaDBHealthCheckView.as_view(),
        name='chromadb-health'
    ),
    
    # ========== PHASE 4: RAG SEARCH ENGINE ==========
    
    # RAG Search
    path(
        'search/',
        RAGSearchView.as_view(),
        name='rag-search'
    ),
    
    # Search History
    path(
        'search/history/',
        SearchHistoryView.as_view(),
        name='search-history'
    ),

    # Copilot & Classification
    path('copilot/suggestion/', CopilotSuggestionView.as_view(), name='copilot-suggestion'),
    path('copilot/knowledge/', CopilotKnowledgeView.as_view(), name='copilot-knowledge'),
    path('copilot/similar-tickets/', CopilotSimilarTicketsView.as_view(), name='copilot-similar'),
    path('copilot/ask/', CopilotAskView.as_view(), name='copilot-ask'),
    path('classify/', ClassifyTicketView.as_view(), name='classify-ticket'),
    path('diagnostics/', AIDiagnosticsView.as_view(), name='ai-diagnostics'),
]
