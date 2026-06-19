# knowledge_base/serializers.py

from rest_framework import serializers

from .models import KnowledgeDocument

from .validators import validate_document


class KnowledgeDocumentSerializer(
    serializers.ModelSerializer
):

    file = serializers.FileField(
        validators=[validate_document]
    )
    category = serializers.SerializerMethodField()
    chunk_count = serializers.IntegerField(source='chunks.count', read_only=True)
    last_indexed = serializers.SerializerMethodField()
    knowledge_coverage = serializers.SerializerMethodField()

    class Meta:
        model = KnowledgeDocument
        fields = [
            'id', 'title', 'file', 'embedding_status', 'created_at', 'updated_at',
            'processed_at', 'category', 'chunk_count', 'last_indexed', 'knowledge_coverage'
        ]

    def get_category(self, obj):
        cats = obj.categories.all()
        return ", ".join([c.name for c in cats]) if cats.exists() else "General Support"

    def get_last_indexed(self, obj):
        val = obj.processed_at or obj.updated_at
        return val.strftime('%Y-%m-%d %H:%M') if val else "—"

    def get_knowledge_coverage(self, obj):
        if obj.embedding_status == 'completed':
            return "100%"
        elif obj.embedding_status == 'processing':
            return "50%"
        return "0%"