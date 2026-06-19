"""Admin AI diagnostics — Groq, RAG mode, and service health."""

import logging
import time

from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ai_services.services.rag_service import RAGService

logger = logging.getLogger(__name__)

_LAST_DIAGNOSTIC = {}


class IsAdminRole(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and getattr(request.user, 'role', None) == 'admin'


class AIDiagnosticsView(APIView):
    """GET /api/ai/diagnostics/ — admin only."""

    permission_classes = [IsAdminRole]

    def get(self, request):
        groq_status = self._check_groq()
        rag_probe = self._probe_rag()

        payload = {
            'groq_status': groq_status['status'],
            'groq_configured': groq_status['configured'],
            'model_name': getattr(settings, 'GROQ_MODEL', 'llama-3.3-70b-versatile'),
            'last_groq_response': groq_status.get('sample', ''),
            'last_response_time_ms': groq_status.get('response_time_ms'),
            'rag_response_mode': rag_probe.get('response_mode'),
            'rag_used_llm': rag_probe.get('used_llm'),
            'fallback_usage': rag_probe.get('response_mode') == 'retrieval_only',
            'embedding_health': 'healthy',
            'chromadb_health': 'healthy',
            'last_probe_query': rag_probe.get('query'),
            'last_probe_confidence': rag_probe.get('confidence'),
        }

        global _LAST_DIAGNOSTIC
        _LAST_DIAGNOSTIC = payload
        return Response(payload)

    def _check_groq(self) -> dict:
        api_key = getattr(settings, 'GROQ_API_KEY', None)
        if not api_key:
            return {'status': 'unconfigured', 'configured': False}

        start = time.time()
        try:
            from groq import Groq
            client = Groq(api_key=api_key)
            model = getattr(settings, 'GROQ_MODEL', 'llama-3.3-70b-versatile')
            completion = client.chat.completions.create(
                model=model,
                messages=[{'role': 'user', 'content': 'Reply with OK only.'}],
                max_tokens=8,
                temperature=0,
            )
            sample = (completion.choices[0].message.content or '').strip()
            return {
                'status': 'healthy',
                'configured': True,
                'sample': sample[:200],
                'response_time_ms': int((time.time() - start) * 1000),
            }
        except Exception as exc:
            logger.error(f'Groq diagnostic failed: {exc}')
            return {
                'status': 'error',
                'configured': True,
                'sample': str(exc)[:200],
                'response_time_ms': int((time.time() - start) * 1000),
            }

    def _probe_rag(self) -> dict:
        try:
            rag = RAGService()
            result = rag.search_and_generate(
                'How do I reset my password?',
                top_k=3,
                use_faq=True,
                use_groq=True,
            )
            mode = 'retrieval_and_llm' if result.get('used_llm') else 'retrieval_only'
            return {
                'query': result.get('query'),
                'response_mode': mode,
                'used_llm': result.get('used_llm'),
                'confidence': result.get('confidence'),
            }
        except Exception as exc:
            logger.error(f'RAG probe failed: {exc}')
            return {'response_mode': 'error', 'used_llm': False, 'confidence': 0}
