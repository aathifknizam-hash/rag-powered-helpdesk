"""
Ticket Classifier Service - Phase 6
Uses Groq LLM to automatically classify tickets
"""

import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class TicketClassifier:
    """
    Classifies support tickets into categories and priority levels
    using Groq LLM API.
    
    Returns:
    {
        'type': 'it' | 'hr' | 'facilities' | 'finance' | 'admin' | 'other',
        'priority': 'low' | 'medium' | 'high' | 'critical',
        'confidence': float (0.0 to 1.0),
        'reasoning': str
    }
    """
    
    MODEL = "mixtral-8x7b-32768"
    CLASSIFICATION_PROMPT = """You are a support ticket classifier. Analyze the ticket description and classify it.

Ticket Description:
{description}

Categories:
- IT: Technical issues, system access, hardware, software, network
- HR: Personnel, benefits, payroll, leaves, time off, policies
- Facilities: Office maintenance, utilities, parking, safety, building repairs, office access, kitchen and restroom issues, AC and lighting
- Finance: Billing, invoices, expense reports, payments
- Admin: Administrative procedures, forms, documents
- Other: Miscellaneous issues not fitting above categories

Priorities:
- Low: Non-urgent, can wait days (e.g., general inquiries)
- Medium: Normal urgency, should resolve within 2-3 days
- High: Urgent, should resolve within 24 hours (e.g., cannot access work system)
- Critical: Emergency, immediate action needed (e.g., complete system down)

Return ONLY valid JSON (no markdown):
{{
    "type": "it",
    "priority": "high",
    "confidence": 0.85,
    "reasoning": "Hardware malfunction requires immediate IT attention"
}}"""
    
    def __init__(self):
        """Initialize Groq client"""
        self.groq_api_key = getattr(settings, 'GROQ_API_KEY', None)
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Groq client if API key is available"""
        if not self.groq_api_key:
            logger.warning("GROQ_API_KEY not configured - classification will use fallback")
            return
        
        try:
            from groq import Groq
            self.client = Groq(api_key=self.groq_api_key)
        except ImportError:
            logger.error("Groq package not installed - run: pip install groq")
            self.client = None
        except Exception as e:
            logger.error(f"Failed to initialize Groq client: {e}")
            self.client = None
    
    def classify(self, description):
        """
        Classify a ticket description using Groq LLM
        
        Args:
            description (str): Ticket description to classify
            
        Returns:
            dict: Classification with type, priority, confidence, reasoning
        """
        if not description or len(description.strip()) < 10:
            logger.warning(f"Skipping classification - description too short: {len(description) if description else 0}")
            return self._fallback_classification()
        
        # If no client, return fallback
        if not self.client:
            logger.debug("Using fallback classification - Groq client not available")
            return self._fallback_classification()
        
        try:
            prompt = self.CLASSIFICATION_PROMPT.format(
                description=description[:1000]  # Limit to 1000 chars
            )
            
            response = self.client.messages.create(
                model=self.MODEL,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.3  # Lower temp for consistent classification
            )
            
            # Extract and parse response
            response_text = response.content[0].text.strip()
            
            # Try to parse JSON
            classification = json.loads(response_text)
            
            # Validate and normalize response
            return self._validate_classification(classification)
        
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Groq response as JSON: {e}\nResponse: {response_text}")
            return self._fallback_classification()
        
        except Exception as e:
            logger.error(f"Classification error: {type(e).__name__}: {e}")
            return self._fallback_classification()
    
    def _validate_classification(self, classification):
        """
        Validate and normalize classification response
        
        Args:
            classification (dict): Raw classification from LLM
            
        Returns:
            dict: Validated classification
        """
        valid_types = ['it', 'hr', 'facilities', 'finance', 'admin', 'other']
        valid_priorities = ['low', 'medium', 'high', 'critical']
        
        result = {
            'type': classification.get('type', 'other').lower(),
            'priority': classification.get('priority', 'medium').lower(),
            'confidence': float(classification.get('confidence', 0.0)),
            'reasoning': classification.get('reasoning', '')
        }
        
        # Validate and correct if needed
        if result['type'] not in valid_types:
            logger.warning(f"Invalid type '{result['type']}' - using 'other'")
            result['type'] = 'other'
        
        if result['priority'] not in valid_priorities:
            logger.warning(f"Invalid priority '{result['priority']}' - using 'medium'")
            result['priority'] = 'medium'
        
        # Ensure confidence is between 0 and 1
        result['confidence'] = max(0.0, min(1.0, result['confidence']))
        
        logger.info(f"✓ Classification: type={result['type']}, priority={result['priority']}, confidence={result['confidence']:.2f}")
        
        return result
    
    def _fallback_classification(self):
        """
        Return fallback classification when Groq is unavailable
        
        Returns:
            dict: Default classification
        """
        return {
            'type': 'other',
            'priority': 'medium',
            'confidence': 0.0,
            'reasoning': 'Classification unavailable - manual review recommended'
        }


# Singleton instance
_classifier = None


def get_classifier():
    """
    Get or create singleton TicketClassifier instance
    
    Returns:
        TicketClassifier: Singleton instance
    """
    global _classifier
    if _classifier is None:
        _classifier = TicketClassifier()
    return _classifier
