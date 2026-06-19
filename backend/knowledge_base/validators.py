# knowledge_base/validators.py

from rest_framework import serializers


def validate_document(file):

    allowed_extensions = [
        ".pdf",
        ".docx",
        ".txt"
    ]

    filename = file.name.lower()

    if not any(
        filename.endswith(ext)
        for ext in allowed_extensions
    ):
        raise serializers.ValidationError(
            "Only PDF, DOCX and TXT files are allowed."
        )

    return file