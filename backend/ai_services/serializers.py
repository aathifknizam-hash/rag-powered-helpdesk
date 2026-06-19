# backend/ai_services/serializers.py
"""
Serializers for AI services APIs
"""

from rest_framework import serializers
from knowledge_base.models import DocumentChunk, KnowledgeDocument


class EmbeddingStatusSerializer(serializers.Serializer):
    """
    Serializer for embedding generation status
    """
    document_id = serializers.IntegerField()
    total_chunks = serializers.IntegerField()
    embedded_chunks = serializers.IntegerField()
    pending_chunks = serializers.IntegerField()
    status = serializers.CharField()
    progress_percentage = serializers.FloatField()


class DocumentChunkEmbeddingSerializer(serializers.ModelSerializer):
    """
    Serializer for document chunks with embedding info
    """
    embedding_dimension = serializers.SerializerMethodField()
    has_embedding = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentChunk
        fields = [
            'id',
            'chunk_index',
            'content',
            'embedding_id',
            'has_embedding',
            'embedding_dimension',
            'created_at'
        ]
    
    def get_embedding_dimension(self, obj):
        """Return embedding dimension if available"""
        if obj.embedding_vector:
            return len(obj.embedding_vector)
        return 0
    
    def get_has_embedding(self, obj):
        """Check if chunk has embedding"""
        return obj.embedding_id is not None


class ReembedDocumentSerializer(serializers.Serializer):
    """
    Serializer for re-embedding request
    """
    force = serializers.BooleanField(
        default=False,
        help_text="Force re-embedding even if already embedded"
    )
    
    def validate(self, data):
        if not isinstance(data.get('force'), bool):
            raise serializers.ValidationError(
                "Force must be a boolean value"
            )
        return data


class EmbeddingQuerySerializer(serializers.Serializer):
    """
    Serializer for embedding generation query
    """
    query = serializers.CharField(
        max_length=5000,
        help_text="Text to generate embedding for"
    )
    
    def validate_query(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Query cannot be empty")
        return value.strip()


class EmbeddingResultSerializer(serializers.Serializer):
    """
    Serializer for embedding result
    """
    query = serializers.CharField()
    embedding = serializers.ListField(
        child=serializers.FloatField(),
        help_text="768-dimensional embedding vector"
    )
    dimension = serializers.IntegerField()
    model = serializers.CharField()
    timestamp = serializers.DateTimeField()
