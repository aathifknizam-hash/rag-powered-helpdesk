import logging
from django.utils import timezone

logger = logging.getLogger(__name__)

class EscalationService:
    @staticmethod
    def analyze_escalation(ticket, messages=None):
        """
        Analyze ticket age, message history, and sentiment trends to predict escalation risk.
        Risk level output: Low Risk, Medium Risk, High Risk, Critical Risk.
        
        Rules:
        - Sentiment = Angry AND Ticket Age > 24h -> Critical Risk
        - 3 Consecutive Negative Messages -> High Risk
        - Sentiment Trend is Neutral -> Frustrated -> Angry -> Critical Risk
        """
        now = timezone.now()
        age_hours = (now - ticket.created_at).total_seconds() / 3600.0 if ticket.created_at else 0.0
        
        # Default sentiment
        sentiment = (ticket.sentiment or "Neutral").lower()
        
        # Retrieve messages if not provided
        if messages is None:
            try:
                # Import TicketMessage from tickets.models
                from tickets.models import TicketMessage
                messages = list(TicketMessage.objects.filter(ticket=ticket).order_by('created_at'))
            except Exception as e:
                logger.error(f"Failed to fetch messages for escalation check: {e}")
                messages = []
                
        # Count consecutive negative customer messages
        negative_words = ['angry', 'bad', 'broken', 'disappoint', 'delay', 'frustrat', 'annoy', 'slow', 'fail', 'worst', 'poor']
        consecutive_negatives = 0
        max_consecutive_negatives = 0
        
        # Analyze sentiment trend
        # We can construct a list of sentiments of customer messages
        sentiment_history = []
        
        for m in messages:
            # Check author (if author is customer or not agent)
            is_agent = False
            author = getattr(m, 'author', None)
            if author:
                is_agent = (author.role in ['agent', 'admin'])
            else:
                author_email = m.get('author__email') if isinstance(m, dict) else None
                if author_email:
                    # Simple check
                    is_agent = False
                    
            content = (m.content if hasattr(m, 'content') else m.get('content', '')).lower()
            
            if not is_agent:
                # Analyze simple text keywords to classify sentiment of this message
                msg_sentiment = "neutral"
                if any(w in content for w in ['angry', 'terrible', 'worst', 'hate', 'furious']):
                    msg_sentiment = "angry"
                elif any(w in content for w in ['frustrated', 'annoyed', 'delay', 'slow', 'broken']):
                    msg_sentiment = "frustrated"
                elif any(w in content for w in ['concerned', 'worried', 'problem']):
                    msg_sentiment = "concerned"
                    
                sentiment_history.append(msg_sentiment)
                
                # Check consecutive negatives
                if any(w in content for w in negative_words):
                    consecutive_negatives += 1
                    if consecutive_negatives > max_consecutive_negatives:
                        max_consecutive_negatives = consecutive_negatives
                else:
                    consecutive_negatives = 0
            else:
                # Reset consecutive negatives on agent reply
                consecutive_negatives = 0
                
        # Determine trend
        trend_escalating = False
        if len(sentiment_history) >= 3:
            # Look for sequence of Neutral/Concerned -> Frustrated -> Angry
            for i in range(len(sentiment_history) - 2):
                s1, s2, s3 = sentiment_history[i], sentiment_history[i+1], sentiment_history[i+2]
                if s1 in ['neutral', 'concerned'] and s2 == 'frustrated' and s3 == 'angry':
                    trend_escalating = True
                    break
        elif len(sentiment_history) == 2:
            s1, s2 = sentiment_history[0], sentiment_history[1]
            if s1 in ['neutral', 'concerned'] and s2 in ['frustrated', 'angry']:
                trend_escalating = True
                
        # Apply Risk Level Evaluation
        risk_level = "Low Risk"
        reasons = []
        
        # Rules evaluation
        if sentiment == 'angry' and age_hours > 24:
            risk_level = "Critical Risk"
            reasons.append("Ticket is open for over 24 hours with Angry sentiment")
        elif trend_escalating:
            risk_level = "Critical Risk"
            reasons.append("Sentiment trend is degrading (Neutral/Concerned -> Frustrated -> Angry)")
        elif max_consecutive_negatives >= 3:
            risk_level = "High Risk"
            reasons.append(f"Detected {max_consecutive_negatives} consecutive negative customer messages without resolution")
        elif sentiment in ['angry', 'urgent']:
            risk_level = "High Risk"
            reasons.append("Initial sentiment classified as Angry or Urgent")
        elif sentiment == 'frustrated' or age_hours > 48:
            risk_level = "Medium Risk"
            reasons.append("Customer is frustrated or ticket age is high")
        elif max_consecutive_negatives == 2:
            risk_level = "Medium Risk"
            reasons.append("Two consecutive negative customer responses detected")
            
        if not reasons:
            reasons.append("Ticket is in stable status with low interaction friction")
            
        return {
            "risk_level": risk_level,
            "reasons": reasons,
            "consecutive_negatives": max_consecutive_negatives,
            "trend_escalating": trend_escalating
        }
