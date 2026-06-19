# ai_services/services/docx_extractor.py

from docx import Document


def extract_docx_text(file_path):

    document = Document(file_path)

    text = "\n".join(
        paragraph.text
        for paragraph in document.paragraphs
    )

    return text