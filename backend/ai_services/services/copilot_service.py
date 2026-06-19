"""LLM-powered agent copilot — retrieval + Groq generation."""

import json
import logging
import time
from typing import Any, Dict, List, Optional

from django.conf import settings

from ai_services.services.rag_service import RAGService

logger = logging.getLogger(__name__)


class CopilotService:
    """Ticket context → KB retrieval → Groq structured assistance."""

    def analyze_ticket(
        self,
        ticket,
        messages: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        start = time.time()
        messages = messages or []

        rag = RAGService()
        query = f"{ticket.subject}. {ticket.description}"
        rag_result = rag.search_and_generate(
            query=query,
            top_k=5,
            use_faq=True,
            use_groq=False,
        )

        context = rag_result.get('search_results', [])
        context_text = rag_result.get('response') or self._format_context(context)
        conversation = self._format_messages(messages)

        llm_result = self._generate_copilot_analysis(
            subject=ticket.subject,
            description=ticket.description,
            priority=ticket.priority,
            status=ticket.status,
            conversation=conversation,
            knowledge_context=context_text,
        )

        elapsed_ms = int((time.time() - start) * 1000)
        used_llm = bool(llm_result)

        if used_llm:
            payload = llm_result
            response_mode = 'retrieval_and_llm'
        else:
            payload = {
                'summary': ticket.subject,
                'suggested_reply': rag_result.get('response', ''),
                'root_cause': 'Unable to determine — LLM unavailable.',
                'resolution_recommendations': [],
            }
            response_mode = 'retrieval_only'

        return {
            **payload,
            'sources': rag_result.get('sources', []),
            'confidence': rag_result.get('confidence', 0),
            'used_llm': used_llm,
            'response_mode': response_mode,
            'processing_time_ms': elapsed_ms,
            'model': getattr(settings, 'GROQ_MODEL', 'llama-3.3-70b-versatile') if used_llm else None,
        }

    def _format_messages(self, messages: List[Dict]) -> str:
        if not messages:
            return 'No conversation yet.'
        lines = []
        for msg in messages[-8:]:
            author = msg.get('author', {})
            email = author.get('email', 'unknown') if isinstance(author, dict) else 'unknown'
            lines.append(f"{email}: {msg.get('content', '')}")
        return '\n'.join(lines)

    def _format_context(self, results: List[Dict]) -> str:
        parts = []
        for item in results[:5]:
            if item.get('type') == 'faq':
                parts.append(f"FAQ: {item.get('question')}\n{item.get('answer')}")
            else:
                parts.append(item.get('content', ''))
        return '\n\n'.join(parts) or 'No knowledge base matches.'

    def _generate_copilot_analysis(
        self,
        subject: str,
        description: str,
        priority: str,
        status: str,
        conversation: str,
        knowledge_context: str,
    ) -> Optional[Dict[str, Any]]:
        api_key = getattr(settings, 'GROQ_API_KEY', None)
        if not api_key:
            return None

        prompt = f"""You are an expert IT support copilot helping an agent resolve a ticket.

Ticket Subject: {subject}
Priority: {priority}
Status: {status}
Description: {description}

Conversation so far:
{conversation}

Knowledge base context:
{knowledge_context}

Respond in JSON with exactly these keys:
- summary (2-3 sentences summarizing the issue for the agent)
- suggested_reply (professional reply the agent can send to the user)
- root_cause (likely root cause analysis)
- resolution_recommendations (array of 2-4 actionable steps)

Write helpful, specific content. Do not copy KB text verbatim."""

        try:
            from groq import Groq
            client = Groq(api_key=api_key)
            model = getattr(settings, 'GROQ_MODEL', 'llama-3.3-70b-versatile')
            completion = client.chat.completions.create(
                model=model,
                messages=[
                    {'role': 'system', 'content': 'You are a support copilot. Return valid JSON only.'},
                    {'role': 'user', 'content': prompt},
                ],
                temperature=0.3,
                max_tokens=1200,
            )
            raw = completion.choices[0].message.content or ''
            return self._parse_json_response(raw)
        except Exception as exc:
            logger.error(f'Copilot LLM failed: {exc}')
            return None

    def _parse_json_response(self, raw: str) -> Dict[str, Any]:
        text = raw.strip()
        if text.startswith('```'):
            text = text.split('```')[1]
            if text.startswith('json'):
                text = text[4:]
        data = json.loads(text)
        return {
            'summary': data.get('summary', ''),
            'suggested_reply': data.get('suggested_reply', ''),
            'root_cause': data.get('root_cause', ''),
            'resolution_recommendations': data.get('resolution_recommendations', []),
        }
