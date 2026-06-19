"""AI Copilot and classification endpoints for agent assistance."""

import logging

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from tickets.models import Ticket, TicketMessage
from tickets.services.classifier import TicketClassifier
from ai_services.services.rag_service import RAGService
from ai_services.services.copilot_service import CopilotService

logger = logging.getLogger(__name__)


class CopilotSuggestionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ticket_id = request.data.get('ticket_id')
        if not ticket_id:
            return Response({'error': 'ticket_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        ticket = get_object_or_404(Ticket, id=ticket_id)
        messages = list(
            TicketMessage.objects.filter(ticket=ticket)
            .select_related('author')
            .order_by('created_at')
            .values('content', 'author__email', 'created_at')
        )
        formatted_messages = [
            {'content': m['content'], 'author': {'email': m['author__email']}}
            for m in messages
        ]

        copilot = CopilotService()
        result = copilot.analyze_ticket(ticket, formatted_messages)

        return Response({
            'summary': result.get('summary', ticket.subject),
            'suggested_reply': result.get('suggested_reply', ''),
            'root_cause': result.get('root_cause', ''),
            'resolution_recommendations': result.get('resolution_recommendations', []),
            'sources': result.get('sources', []),
            'confidence': result.get('confidence', 0),
            'used_llm': result.get('used_llm', False),
            'response_mode': result.get('response_mode', 'retrieval_only'),
            'processing_time_ms': result.get('processing_time_ms'),
            'model': result.get('model'),
        })


class CopilotKnowledgeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('query', '').strip()
        if not query:
            return Response({'error': 'query is required'}, status=status.HTTP_400_BAD_REQUEST)

        rag = RAGService()
        result = rag.search_and_generate(query=query, top_k=5, use_faq=True, use_groq=True)
        return Response({
            'articles': result.get('search_results', []),
            'sources': result.get('sources', []),
            'response_mode': result.get('response_mode'),
            'used_llm': result.get('used_llm'),
        })


class CopilotSimilarTicketsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ticket_id = request.query_params.get('ticket_id')
        if not ticket_id:
            return Response({'error': 'ticket_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        ticket = get_object_or_404(Ticket, id=ticket_id)
        similar = Ticket.objects.filter(
            request_type=ticket.request_type
        ).exclude(id=ticket.id).order_by('-created_at')[:5]

        data = [{
            'id': t.id,
            'ticket_number': t.ticket_number,
            'subject': t.subject,
            'status': t.status,
            'priority': t.priority,
        } for t in similar]

        return Response({'similar_tickets': data})


class CopilotAskView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question = request.data.get('question', '').strip()
        ticket_id = request.data.get('ticket_id')

        if not question:
            return Response({'error': 'question is required'}, status=status.HTTP_400_BAD_REQUEST)

        context = ''
        if ticket_id:
            ticket = get_object_or_404(Ticket, id=ticket_id)
            context = f'Ticket: {ticket.subject}. {ticket.description}'

        query = f'{context}\n\nQuestion: {question}' if context else question
        rag = RAGService()
        result = rag.search_and_generate(query=query, top_k=5, use_faq=True, use_groq=True)
        return Response(result)


class ClassifyTicketView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        description = request.data.get('description', '')
        subject = request.data.get('subject', '')
        text = f'{subject}\n{description}'.strip()

        if not text:
            return Response({'error': 'description or subject required'}, status=status.HTTP_400_BAD_REQUEST)

        classifier = TicketClassifier()
        return Response(classifier.classify(text))
