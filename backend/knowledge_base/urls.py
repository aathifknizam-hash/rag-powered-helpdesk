# knowledge_base/urls.py

from django.urls import path

from .views import (
    UploadDocumentView,
    DocumentListView,
    DeleteDocumentView,
)

urlpatterns = [

    path(
        "upload/",
        UploadDocumentView.as_view()
    ),

    path(
        "documents/",
        DocumentListView.as_view()
    ),

    path(
        "documents/<int:pk>/",
        DeleteDocumentView.as_view()
    ),
]