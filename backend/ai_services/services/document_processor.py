import os

from django.utils import timezone

from knowledge_base.models import (
    DocumentChunk
)

from .pdf_extractor import (
    extract_pdf_text
)

from .docx_extractor import (
    extract_docx_text
)

from .txt_extractor import (
    extract_txt_text
)

from .text_cleaner import (
    clean_text
)

from .chunking_service import (
    create_chunks
)


def process_document(document):

    document.embedding_status = (
        "processing"
    )

    document.save()

    file_path = document.file.path

    extension = (
        os.path.splitext(file_path)[1]
        .lower()
    )

    if extension == ".pdf":

        text = extract_pdf_text(
            file_path
        )

    elif extension == ".docx":

        text = extract_docx_text(
            file_path
        )

    elif extension == ".txt":

        text = extract_txt_text(
            file_path
        )

    else:

        document.embedding_status = (
            "failed"
        )

        document.save()

        raise ValueError(
            "Unsupported file type"
        )

    text = clean_text(text)

    chunks = create_chunks(text)

    for index, chunk in enumerate(
        chunks
    ):

        DocumentChunk.objects.create(
            document=document,
            chunk_index=index,
            content=chunk
        )

    document.embedding_status = (
        "completed"
    )

    document.processed_at = (
        timezone.now()
    )

    document.save()

    return len(chunks)