# backend/ai_services/services/rag_service.py
"""
Production-grade RAG (Retrieval-Augmented Generation) Service
Orchestrates semantic search + LLM response generation
"""

import logging
import json
from typing import List, Dict, Tuple, Optional
from django.utils import timezone
from django.conf import settings

from ai_services.services.embedding_service import EmbeddingService, EmbeddingServiceException
from ai_services.services.chromadb_sync import ChromaDBSynchronizer, ChromaDBSyncException
from faq.models import FAQ

logger = logging.getLogger(__name__)


class RAGServiceException(Exception):
    """Custom exception for RAG service errors"""
    pass


class RAGService:
    """
    Retrieval-Augmented Generation Service
    
    Workflow:
    1. User query → embedding
    2. Vector search in ChromaDB
    3. Retrieve top-K similar chunks
    4. Assemble context
    5. Call Groq LLM
    6. Format response with citations
    7. Calculate confidence score
    
    Features:
    - Semantic search
    - Multi-source retrieval (docs + FAQs)
    - Confidence scoring
    - Citation tracking
    - Fallback handling
    - Token optimization
    """
    
    TOP_K_DEFAULT = 5
    CONFIDENCE_THRESHOLD = 0.40
    MIN_SIMILARITY = 0.30
    GREETINGS = frozenset({
        'hi', 'hello', 'hey', 'hiya', 'howdy', 'good morning',
        'good afternoon', 'good evening', 'greetings', 'sup', 'yo',
    })
    PROBLEM_INDICATORS = (
        "isn't", "isnt", "won't", "wont", "can't", "cant", "doesn't", "doesnt",
        "not working", "not restarting", "won't restart", "wont restart",
        "won't start", "wont start", "not turning on", "keeps crashing",
        "failed", "failing", "stuck", "broken", "issue", "problem", "error",
        "help me", "does not work", "unable to", "cannot",
    )

    def __init__(self):
        self.embedding_service = EmbeddingService.get_instance()
        self.chromadb_sync = ChromaDBSynchronizer()
        self._faq_embedding_cache = {}
    
    def search_and_generate(
        self,
        query: str,
        top_k: int = None,
        use_faq: bool = True,
        document_id: Optional[int] = None,
        use_groq: bool = True
    ) -> Dict:
        """
        Complete RAG pipeline: search + generate + format response
        
        Args:
            query: User question
            top_k: Number of context documents
            use_faq: Include FAQ in search
            document_id: Filter by specific document
            use_groq: Use Groq LLM (if False, only retrieval)
            
        Returns:
            {
                'query': original query,
                'response': generated answer,
                'sources': [chunk sources],
                'confidence': 0.0-1.0,
                'search_results': [retrieval results],
                'used_llm': bool,
                'processing_time_ms': int
            }
        """
        import time
        start_time = time.time()
        
        if top_k is None:
            top_k = self.TOP_K_DEFAULT
        
        try:
            logger.info(f"RAG pipeline started for query: {query}")

            greeting = self._greeting_response(query)
            if greeting:
                greeting['processing_time_ms'] = int((time.time() - start_time) * 1000)
                return greeting

            # Step 1: Retrieve context
            retrieval_results = self._retrieve_context(
                query=query,
                top_k=top_k,
                use_faq=use_faq,
                document_id=document_id
            )
            
            if not retrieval_results['documents']:
                logger.warning("No relevant documents found")
                return self._fallback_response(query, retrieval_results)
            
            # Step 2: Check confidence
            confidence = retrieval_results['average_similarity']
            
            if confidence < self.CONFIDENCE_THRESHOLD:
                logger.info(f"Low confidence ({confidence}) - suggesting ticket creation")
                return self._low_confidence_response(query, retrieval_results)

            if not self._context_matches_intent(query, retrieval_results['documents']):
                logger.info("Retrieved context does not match user intent (problem vs how-to)")
                return self._intent_mismatch_response(query, retrieval_results)

            # Step 3: Generate response
            used_llm = False
            if use_groq:
                logger.info("Generating response using Groq LLM")
                response, used_llm = self._generate_response_with_llm(
                    query=query,
                    context=retrieval_results['context_text'],
                    sources=retrieval_results['sources']
                )
            else:
                logger.info("Generating response from context only")
                response = self._generate_response_from_context(
                    context=retrieval_results['context_text'],
                    sources=retrieval_results['sources']
                )

            processing_time_ms = int((time.time() - start_time) * 1000)

            return {
                'query': query,
                'response': response,
                'sources': retrieval_results['sources'],
                'confidence': round(confidence, 4),
                'search_results': retrieval_results['documents'],
                'used_llm': used_llm,
                'response_mode': 'retrieval_and_llm' if used_llm else 'retrieval_only',
                'status': 'success',
                'processing_time_ms': processing_time_ms,
                'follow_up_questions': self._suggest_follow_ups(query, retrieval_results['sources']),
                'timestamp': timezone.now().isoformat()
            }
            
        except EmbeddingServiceException as e:
            logger.error(f"✗ Embedding error: {e}")
            return self._error_response(query, f"Embedding error: {e}")
        except ChromaDBSyncException as e:
            logger.error(f"✗ Search error: {e}")
            return self._error_response(query, f"Search error: {e}")
        except Exception as e:
            logger.error(f"✗ RAG pipeline error: {e}", exc_info=True)
            return self._error_response(query, f"Processing error: {e}")
    
    def _retrieve_context(
        self,
        query: str,
        top_k: int,
        use_faq: bool,
        document_id: Optional[int]
    ) -> Dict:
        """
        Retrieve relevant context from ChromaDB and FAQ
        
        Returns:
            {
                'documents': [results],
                'context_text': formatted text,
                'sources': [source info],
                'average_similarity': float
            }
        """
        all_results = []

        try:
            # Generate query embedding
            query_embedding = self.embedding_service.encode_single(query)[0]

            # Step 1: Search ChromaDB for chunks (non-fatal if unavailable)
            logger.info("Searching ChromaDB for similar chunks")
            chunk_results = []
            try:
                chunk_results = self.chromadb_sync.search_chunks(
                    query_embedding=query_embedding,
                    top_k=top_k,
                    document_id=document_id
                )
                chunk_results = [
                    r for r in chunk_results
                    if r['similarity'] >= self.MIN_SIMILARITY
                ]
                logger.info(f"Found {len(chunk_results)} relevant chunks")
            except ChromaDBSyncException as e:
                logger.warning(f"ChromaDB search skipped: {e}")

            all_results.extend(chunk_results)

            # Step 2: Search FAQ
            if use_faq:
                logger.info("Searching FAQ")
                faq_results = self._search_faq(query_embedding)
                all_results.extend(faq_results)
                logger.info(f"Found {len(faq_results)} FAQ matches")
            
            all_results = self._rerank_with_intent(query, all_results)
            all_results = self._dedupe_results(all_results)
            all_results = sorted(
                all_results,
                key=lambda x: x['similarity'],
                reverse=True
            )[:top_k]

            context_text = self._build_context(all_results)

            sources = [
                {
                    'type': r.get('type', 'document'),
                    'source': r.get('document_title', r.get('question', 'FAQ')),
                    'similarity': r['similarity']
                }
                for r in all_results
            ]
            sources = self._dedupe_sources(sources)
            
            # Calculate average similarity
            avg_similarity = (
                sum(r['similarity'] for r in all_results) / len(all_results)
                if all_results else 0
            )
            
            return {
                'documents': all_results,
                'context_text': context_text,
                'sources': sources,
                'average_similarity': avg_similarity
            }
            
        except Exception as e:
            logger.error(f"✗ Retrieval failed: {e}")
            raise ChromaDBSyncException(f"Retrieval failed: {e}") from e
    
    def _search_faq(self, query_embedding: List[float]) -> List[Dict]:
        """Search FAQ using question + answer embeddings."""
        faq_results = []

        try:
            for faq in FAQ.objects.all():
                faq_embedding = self._get_faq_embedding(faq)
                similarity = self._cosine_similarity(query_embedding, faq_embedding)

                if similarity >= self.MIN_SIMILARITY:
                    faq_results.append({
                        'type': 'faq',
                        'faq_id': faq.id,
                        'question': faq.question,
                        'content': f"{faq.question}\n\n{faq.answer}",
                        'answer': faq.answer,
                        'category': faq.category,
                        'similarity': similarity,
                    })

            return sorted(faq_results, key=lambda x: x['similarity'], reverse=True)

        except Exception as e:
            logger.warning(f"FAQ search warning: {e}")
            return []

    def _get_faq_embedding(self, faq) -> List[float]:
        if faq.id in self._faq_embedding_cache:
            return self._faq_embedding_cache[faq.id]
        text = f"{faq.question}\n{faq.answer}"
        embedding = self.embedding_service.encode_single(text)[0]
        self._faq_embedding_cache[faq.id] = embedding
        return embedding

    def _is_greeting(self, query: str) -> bool:
        normalized = query.strip().lower().rstrip('!.?')
        if normalized in self.GREETINGS:
            return True
        words = normalized.split()
        return len(words) <= 3 and words and words[0] in self.GREETINGS

    def _is_problem_report(self, query: str) -> bool:
        q = query.lower()
        return any(indicator in q for indicator in self.PROBLEM_INDICATORS)

    def _is_procedural_faq(self, question: str) -> bool:
        q = question.lower().strip()
        return q.startswith(('how do i', 'how can i', 'how to', 'what are the steps', 'where do i'))

    def _greeting_response(self, query: str) -> Optional[Dict]:
        if not self._is_greeting(query):
            return None
        return {
            'query': query,
            'response': (
                "Hello! I'm your AI support assistant. "
                "Ask me anything about IT, account access, or company services — "
                "I'll search our knowledge base and cite my sources."
            ),
            'sources': [],
            'confidence': 1.0,
            'search_results': [],
            'used_llm': False,
            'status': 'greeting',
            'follow_up_questions': [
                'How do I reset my password?',
                'My computer is running slowly — what should I do?',
                'How do I create a support ticket?',
                'How do I connect to the company VPN?',
            ],
            'timestamp': timezone.now().isoformat(),
        }

    def _rerank_with_intent(self, query: str, results: List[Dict]) -> List[Dict]:
        if not self._is_problem_report(query):
            return results

        reranked = []
        for result in results:
            adjusted = dict(result)
            if adjusted.get('type') == 'faq':
                question = adjusted.get('question', '')
                if self._is_procedural_faq(question):
                    adjusted['similarity'] = round(adjusted['similarity'] * 0.5, 4)
                elif any(
                    term in question.lower()
                    for term in ('fix', 'troubleshoot', "won't", 'not working', 'issue', 'problem', 'error')
                ):
                    adjusted['similarity'] = round(min(adjusted['similarity'] * 1.2, 0.99), 4)
            reranked.append(adjusted)
        return reranked

    def _dedupe_results(self, results: List[Dict]) -> List[Dict]:
        seen = set()
        deduped = []
        for result in results:
            key = (
                result.get('type'),
                result.get('faq_id'),
                result.get('question') or result.get('document_title'),
                result.get('chunk_id'),
            )
            if key in seen:
                continue
            seen.add(key)
            deduped.append(result)
        return deduped

    def _dedupe_sources(self, sources: List[Dict]) -> List[Dict]:
        seen = set()
        deduped = []
        for source in sources:
            title = source.get('source')
            if title in seen:
                continue
            seen.add(title)
            deduped.append(source)
        return deduped

    def _extract_problem_topics(self, query: str) -> List[str]:
        q = query.lower()
        topic_keywords = {
            'restart': ('restart', 'reboot', 'boot', 'power on', 'power off', 'shut down', 'shutdown'),
            'network': ('wifi', 'wi-fi', 'network', 'vpn', 'internet', 'connect', 'connection', 'dns'),
            'password': ('password', 'login', 'log in', 'sign in', 'signin', 'locked out'),
            'performance': ('slow', 'lag', 'freeze', 'frozen', 'hung', 'performance'),
            'display': ('monitor', 'screen', 'display', 'black screen', 'flicker'),
            'update': ('update', 'windows update', 'patch'),
            'email': ('email', 'outlook', 'mail'),
            'printer': ('print', 'printer'),
            'facilities': ('facility', 'facilities', 'building', 'maintenance', 'parking', 'air conditioning', 'ac', 'heater', 'lighting', 'restroom', 'kitchen', 'electrical', 'safety'),
            'leave': ('leave', 'vacation', 'pto', 'paid time off', 'sick leave', 'maternity', 'paternity', 'bereavement', 'family leave', 'personal leave', 'time off', 'leave balance'),
            'policy': ('policy', 'policies', 'eligibility', 'entitlement', 'guidelines', 'HR policy', 'leave policy'),
        }
        return [
            topic for topic, keywords in topic_keywords.items()
            if any(keyword in q for keyword in keywords)
        ]

    def _result_covers_topics(self, result: Dict, topics: List[str]) -> bool:
        question = result.get('question', '').lower()
        answer = result.get('answer', '').lower()
        text = f"{question} {answer}"
        topic_keywords = {
            'network': ('wifi', 'wi-fi', 'network', 'vpn', 'internet', 'connect', 'dns'),
            'password': ('password', 'login', 'sign in', 'credentials'),
            'performance': ('slow', 'performance', 'speed', 'lag', 'freeze'),
            'display': ('monitor', 'screen', 'display', 'black screen'),
            'update': ('update', 'patch', 'windows update'),
            'email': ('email', 'outlook', 'mail'),
            'printer': ('print', 'printer'),
            'facilities': ('facility', 'facilities', 'building', 'maintenance', 'parking', 'air conditioning', 'ac', 'heater', 'lighting', 'restroom', 'kitchen', 'electrical', 'repair', 'safety', 'workspace'),
            'leave': ('leave', 'vacation', 'pto', 'paid time off', 'sick leave', 'maternity', 'paternity', 'bereavement', 'family leave', 'personal leave', 'time off', 'leave balance'),
            'policy': ('policy', 'policies', 'eligibility', 'entitlement', 'guidelines', 'hr policy', 'leave policy'),
        }

        for topic in topics:
            if topic == 'restart':
                if self._is_procedural_faq(question):
                    continue
                restart_terms = ('restart', 'reboot', 'boot', 'power', 'shut down', 'shutdown')
                failure_terms = (
                    "won't", 'wont', "can't", 'cannot', 'not ', 'fail', 'stuck',
                    'issue', 'fix', 'problem', 'what should', 'help',
                )
                if any(term in question for term in restart_terms) and any(
                    term in question for term in failure_terms
                ):
                    return True
                continue

            if topic == 'facilities':
                facility_terms = ('facility', 'facilities', 'building', 'maintenance', 'parking', 'air conditioning', 'ac', 'heater', 'lighting', 'restroom', 'kitchen', 'electrical', 'repair', 'safety', 'workspace')
                if any(term in text for term in facility_terms):
                    return True
                continue

            if topic == 'leave':
                leave_terms = ('leave', 'vacation', 'pto', 'paid time off', 'sick leave', 'maternity', 'paternity', 'bereavement', 'family leave', 'personal leave', 'time off', 'leave balance')
                if any(term in text for term in leave_terms):
                    return True
                continue

            if topic == 'policy':
                policy_terms = ('policy', 'policies', 'eligibility', 'entitlement', 'guidelines', 'hr policy', 'leave policy')
                if any(term in text for term in policy_terms):
                    return True
                continue

            if any(keyword in text for keyword in topic_keywords.get(topic, ())):
                if keyword_in_question := any(
                    keyword in question for keyword in topic_keywords.get(topic, ())
                ):
                    return keyword_in_question
        return False

    def _context_matches_intent(self, query: str, results: List[Dict]) -> bool:
        if not self._is_problem_report(query) or not results:
            return True

        topics = self._extract_problem_topics(query)
        if topics:
            return any(self._result_covers_topics(result, topics) for result in results[:3])

        top = results[0]
        if top.get('type') == 'faq' and self._is_procedural_faq(top.get('question', '')):
            return False
        return True

    def _intent_mismatch_response(self, query: str, retrieval_results: Dict) -> Dict:
        return {
            'query': query,
            'response': (
                "I understand you're reporting a problem, but the knowledge base only has "
                "general how-to guides that don't address this specific issue. "
                "For example, I found steps on how to perform an action — not how to fix it when it fails.\n\n"
                "Please create a support ticket and describe what you've already tried. "
                "An agent can troubleshoot this with you directly."
            ),
            'sources': retrieval_results['sources'][:2],
            'confidence': retrieval_results['average_similarity'],
            'search_results': retrieval_results['documents'][:2],
            'used_llm': False,
            'status': 'intent_mismatch',
            'suggested_action': 'create_ticket',
            'follow_up_questions': [
                'What information should I include in my ticket?',
                'How long until an agent responds?',
            ],
            'timestamp': timezone.now().isoformat(),
        }
    
    def _build_context(self, results: List[Dict]) -> str:
        """Build context text from results"""
        context_parts = []
        
        for i, result in enumerate(results, 1):
            if result.get('type') == 'faq':
                context_parts.append(
                    f"[FAQ {i}]\nQ: {result['question']}\nA: {result['answer']}"
                )
            else:
                context_parts.append(
                    f"[Document {i}] From {result.get('document_title', 'Unknown')}:\n"
                    f"{result['content']}"
                )
        
        return "\n\n".join(context_parts)
    
    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        import numpy as np
        
        a_np = np.array(a)
        b_np = np.array(b)
        
        return float(
            np.dot(a_np, b_np) / (np.linalg.norm(a_np) * np.linalg.norm(b_np))
        )
    
    def _generate_response_with_llm(
        self,
        query: str,
        context: str,
        sources: List[Dict]
    ) -> Tuple[str, bool]:
        """Generate response using Groq LLM. Returns (text, used_llm)."""
        prompt = self._build_prompt(query, context, sources)
        response = self._call_groq_api(prompt)
        if response:
            return response, True
        return self._generate_response_from_context(context, sources), False

    def _call_groq_api(self, prompt: str) -> str:
        """Call Groq API for RAG answer generation."""
        from django.conf import settings

        api_key = getattr(settings, "GROQ_API_KEY", None)
        if not api_key:
            return ""

        try:
            from groq import Groq
            client = Groq(api_key=api_key)
            model = getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile")
            completion = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a helpful support assistant."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=1024,
            )
            return completion.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"✗ Groq API call failed: {e}")
            return ""
    
    def _generate_response_from_context(
        self,
        context: str,
        sources: List[Dict]
    ) -> str:
        """Generate response from context without LLM"""
        # Extract key points from context
        lines = context.split('\n')
        key_points = [
            line for line in lines
            if line.strip() and not line.startswith('[')
        ][:3]
        
        response = "Based on the knowledge base:\n\n"
        response += "\n".join(f"• {point}" for point in key_points)
        
        if sources:
            response += "\n\nSources:\n"
            for source in sources[:3]:
                response += f"- {source['source']}\n"
        
        return response
    
    def _build_prompt(
        self,
        query: str,
        context: str,
        sources: List[Dict]
    ) -> str:
        """Build LLM prompt"""
        sources_text = "\n".join(
            f"- {s['source']}" for s in sources[:3]
        )
        
        intent_guidance = ""
        if self._is_problem_report(query):
            intent_guidance = """
IMPORTANT: The user is reporting a PROBLEM or failure (something is not working).
Do NOT reply with basic how-to steps unless they directly solve the reported failure.
If the context only explains how to perform an action (e.g. how to restart) but the user says
that action fails or does not work, clearly state that the knowledge base does not cover
troubleshooting this issue and recommend creating a support ticket.
"""

        prompt = f"""You are a helpful support assistant for a Smart Service Desk.
Answer using ONLY the provided context. Be direct and accurate.
{intent_guidance}
User message: {query}

Context:
{context}

Sources: {sources_text}

Provide a clear, helpful answer:"""
        
        return prompt
    
    def _suggest_follow_ups(self, query: str, sources: List[Dict]) -> List[str]:
        """Generate contextual follow-up questions for the chat UI."""
        follow_ups = []
        q_lower = query.lower()

        if 'password' in q_lower:
            follow_ups.extend([
                'What if I did not receive the reset email?',
                'How do I change my password after logging in?',
            ])
        elif 'ticket' in q_lower or 'support' in q_lower:
            follow_ups.extend([
                'How long until someone responds to my ticket?',
                'Can I attach files to a support ticket?',
            ])
        elif 'billing' in q_lower or 'payment' in q_lower:
            follow_ups.extend([
                'Where can I download my invoices?',
                'How do I update my payment method?',
            ])
        elif 'leave' in q_lower or 'maternity' in q_lower or 'paternity' in q_lower or 'pto' in q_lower:
            follow_ups.extend([
                'How can I check my leave balance?',
                'What documentation is needed for leave approval?',
            ])
        elif 'facility' in q_lower or 'facilities' in q_lower or 'parking' in q_lower or 'maintenance' in q_lower:
            follow_ups.extend([
                'Is this issue urgent or safety-related?',
                'Do you need help submitting a facilities request?',
            ])
        else:
            follow_ups.extend([
                'Can you tell me more about this?',
                'What related policies should I know about?',
            ])

        for source in sources[:2]:
            title = source.get('source') or source.get('question')
            if title and title not in follow_ups:
                follow_ups.append(f'Tell me more about {title}')

        return follow_ups[:4]

    def _low_confidence_response(
        self,
        query: str,
        retrieval_results: Dict
    ) -> Dict:
        """Response when confidence is too low"""
        return {
            'query': query,
            'response': (
                "I couldn't find a confident answer in the knowledge base. "
                "Please create a ticket so our support team can assist you."
            ),
            'sources': retrieval_results['sources'][:3],
            'confidence': retrieval_results['average_similarity'],
            'search_results': retrieval_results['documents'][:3],
            'used_llm': False,
            'status': 'low_confidence',
            'suggested_action': 'create_ticket',
            'follow_up_questions': self._suggest_follow_ups(query, retrieval_results['sources']),
            'timestamp': timezone.now().isoformat()
        }
    
    def _fallback_response(self, query: str, retrieval_results: Dict) -> Dict:
        """Fallback response when no results found"""
        return {
            'query': query,
            'response': (
                "I couldn't find relevant information in the knowledge base. "
                "Please create a support ticket and our team will help you."
            ),
            'sources': [],
            'confidence': 0.0,
            'search_results': [],
            'used_llm': False,
            'status': 'no_results',
            'suggested_action': 'create_ticket',
            'timestamp': timezone.now().isoformat()
        }
    
    def _error_response(self, query: str, error: str) -> Dict:
        """Error response"""
        return {
            'query': query,
            'response': "Sorry, an error occurred while processing your request.",
            'error': error,
            'status': 'error',
            'suggested_action': 'contact_support',
            'timestamp': timezone.now().isoformat()
        }
