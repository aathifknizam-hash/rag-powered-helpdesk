import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class PriorityEngine:
    @staticmethod
    def calculate_priority(subject, description, sentiment_score, customer=None, sla_risk_score=0.0):
        """
        Calculate ticket priority score and recommended priority level based on:
        - Business Impact (40%)
        - Urgency (25%)
        - Sentiment (15%)
        - SLA Risk (10%)
        - Customer History (10%)
        
        Returns a dictionary:
        {
            "priority_score": float, # 0.0 to 100.0
            "priority_level": str,   # 'low', 'medium', 'high', 'critical'
            "reason": str            # detailed explanation of recommendation
        }
        """
        text = f"{subject} {description}".lower()
        
        # 1. Business Impact (40% -> Max 40 points)
        # Check system down, outage, department block, data loss, etc.
        impact_factor = 0.3 # Default Medium-Low
        if any(w in text for w in ['outage', 'down', 'crash', 'all employees', 'entire department', 'broken for everyone', 'security breach', 'data loss']):
            impact_factor = 1.0
        elif any(w in text for w in ['blocked', 'cannot work', 'unable to work', 'critical issue', 'stop', 'failed']):
            impact_factor = 0.7
        elif any(w in text for w in ['broken', 'error', 'bug', 'glitch', 'not working', 'fail']):
            impact_factor = 0.5
        elif any(w in text for w in ['question', 'how to', 'inquiry', 'request', 'install', 'access']):
            impact_factor = 0.2
            
        business_impact_score = impact_factor * 40.0
        
        # 2. Urgency (25% -> Max 25 points)
        urgency_factor = 0.3
        if any(w in text for w in ['asap', 'urgent', 'immediately', 'emergency', 'deadline', 'fire', 'critical']):
            urgency_factor = 1.0
        elif any(w in text for w in ['soon', 'today', 'quick', 'fast']):
            urgency_factor = 0.7
        elif any(w in text for w in ['tomorrow', 'this week']):
            urgency_factor = 0.5
            
        urgency_score = urgency_factor * 25.0
        
        # 3. Sentiment (15% -> Max 15 points)
        # Sentiment score from SentimentService is between 0.0 and 1.0
        sentiment_contribution = sentiment_score * 15.0
        
        # 4. SLA Risk (10% -> Max 10 points)
        # SLA risk score is between 0.0 and 1.0
        sla_risk_contribution = sla_risk_score * 10.0
        
        # 5. Customer History (10% -> Max 10 points)
        customer_history_factor = 0.2
        if customer:
            try:
                # Count customer's active open tickets
                open_tickets_count = customer.tickets_as_customer.filter(status__in=['new', 'assigned', 'in_progress', 'waiting_customer']).count()
                if open_tickets_count > 5:
                    customer_history_factor = 1.0
                elif open_tickets_count > 2:
                    customer_history_factor = 0.7
                elif open_tickets_count > 0:
                    customer_history_factor = 0.4
            except Exception as e:
                logger.error(f"Failed to query customer ticket history: {e}")
                
        customer_history_score = customer_history_factor * 10.0
        
        # Final Priority Score sum
        total_score = business_impact_score + urgency_score + sentiment_contribution + sla_risk_contribution + customer_history_score
        
        # Determine Priority Tier
        if total_score >= 80.0:
            level = 'critical'
        elif total_score >= 55.0:
            level = 'high'
        elif total_score >= 25.0:
            level = 'medium'
        else:
            level = 'low'
            
        # Compile explanations
        reasons = []
        if impact_factor >= 0.7:
            reasons.append("High Business Impact detected (e.g., outages, department blocks)")
        if urgency_factor >= 0.7:
            reasons.append("High urgency markers identified (ASAP, deadline)")
        if sentiment_score >= 0.6:
            reasons.append("Customer exhibits high frustration/anger in request text")
        if customer_history_factor >= 0.7:
            reasons.append("Customer has multiple pending open requests in queue")
        if sla_risk_score >= 0.7:
            reasons.append("High SLA breach risk predicted due to queue backlog")
            
        if not reasons:
            reasons.append("Standard request with normal impact and urgency parameters")
            
        reason_str = " | ".join(reasons)
        
        return {
            "priority_score": round(total_score, 1),
            "priority_level": level,
            "reason": reason_str
        }
