# knowledge_base/views.py

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import KnowledgeDocument

from .serializers import (
    KnowledgeDocumentSerializer
)


class UploadDocumentView(
    generics.CreateAPIView
):

    queryset = (
        KnowledgeDocument.objects.all()
    )

    serializer_class = (
        KnowledgeDocumentSerializer
    )

    permission_classes = [
        IsAuthenticated
    ]

    def perform_create(self, serializer):
        document = serializer.save()
        try:
            from ai_services.services.document_processor import process_document
            process_document(document)
        except Exception as exc:
            document.embedding_status = "failed"
            document.save(update_fields=["embedding_status"])
            raise exc

class DocumentListView(
    generics.ListAPIView
):

    queryset = (
        KnowledgeDocument.objects.all()
        .order_by("-created_at")
    )

    serializer_class = (
        KnowledgeDocumentSerializer
    )

    permission_classes = [
        IsAuthenticated
    ]

class DeleteDocumentView(
    generics.DestroyAPIView
):

    queryset = (
        KnowledgeDocument.objects.all()
    )

    serializer_class = (
        KnowledgeDocumentSerializer
    )

    permission_classes = [
        IsAuthenticated
    ]
