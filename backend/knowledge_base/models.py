from django.db import models


class KnowledgeCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class KnowledgeDocument(models.Model):

    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    )

    title = models.CharField(
        max_length=255
    )

    categories = models.ManyToManyField(
        KnowledgeCategory,
        related_name="documents",
        blank=True
    )

    file = models.FileField(
        upload_to="documents/"
    )

    embedding_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    processed_at = models.DateTimeField(
    null=True,
    blank=True
    )
    
    def delete(self, *args, **kwargs):

        if self.file:
            self.file.delete(save=False)

        super().delete(*args, **kwargs)

    def __str__(self):
        return self.title

class DocumentChunk(models.Model):

    document = models.ForeignKey(
        KnowledgeDocument,
        on_delete=models.CASCADE,
        related_name="chunks"
    )

    chunk_index = models.IntegerField()

    content = models.TextField()

    embedding_id = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    # Store embedding as JSON (768-dimensional vector)
    embedding_vector = models.JSONField(
        null=True,
        blank=True,
        help_text="BAAI/bge-base-en-v1.5 embedding vector"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return (
            f"{self.document.title}"
            f" - Chunk {self.chunk_index}"
        )