import logging
from django.utils import timezone
from tickets.models import Ticket

logger = logging.getLogger(__name__)

class SLAPredictionService:
    @staticmethod
    def predict_sla_risk(ticket):
        """
        Predict SLA breach risk based on:
        - Current Queue Length
        - Agent Workload
        - Ticket Complexity
        - Historical Resolution Time
        - Sentiment Level
        
        Returns a dict:
        {
            "sla_risk_score": float, # 0.0 to 1.0
            "sla_risk_level": str    # 'low', 'medium', 'high', 'critical'
        }
        """
        # Default weights/scores
        queue_score = 0.2
        workload_score = 0.2
        complexity_score = 0.2
        sentiment_score = 0.2
        
        # 1. Department Queue Length
        if ticket.department:
            try:
                dept_open_count = Ticket.objects.filter(
                    department=ticket.department,
                    status__in=['new', 'assigned', 'in_progress', 'waiting_customer']
                ).count()
                if dept_open_count > 20:
                    queue_score = 1.0
                elif dept_open_count > 10:
                    queue_score = 0.7
                elif dept_open_count > 5:
                    queue_score = 0.4
            except Exception as e:
                logger.error(f"Failed to fetch queue length for SLA prediction: {e}")
                
        # 2. Agent Workload
        if ticket.agent:
            try:
                agent_active_count = Ticket.objects.filter(
                    agent=ticket.agent,
                    status__in=['assigned', 'in_progress', 'waiting_customer']
                ).count()
                if agent_active_count > 8:
                    workload_score = 1.0
                elif agent_active_count > 5:
                    workload_score = 0.7
                elif agent_active_count > 3:
                    workload_score = 0.4
            except Exception as e:
                logger.error(f"Failed to fetch agent workload for SLA prediction: {e}")
                
        # 3. Ticket Complexity
        # Estimated by text length or category complexity
        desc_len = len(ticket.description or '')
        if desc_len > 1000:
            complexity_score = 1.0
        elif desc_len > 500:
            complexity_score = 0.7
        elif desc_len > 200:
            complexity_score = 0.4
            
        # Category complexity boost (e.g. database, network, security take longer)
        if ticket.category and ticket.category.name.lower() in ['security', 'networking', 'database', 'vpn', 'infrastructure']:
            complexity_score = min(complexity_score + 0.2, 1.0)
            
        # 4. Sentiment Level
        sentiment = (ticket.sentiment or 'Neutral').lower()
        if sentiment == 'angry':
            sentiment_score = 1.0
        elif sentiment == 'urgent':
            sentiment_score = 0.8
        elif sentiment == 'frustrated':
            sentiment_score = 0.6
        elif sentiment == 'concerned':
            sentiment_score = 0.4
        else:
            sentiment_score = 0.1
            
        # Compute final weighted risk score (0.0 to 1.0)
        # Weights: Queue length (25%), Workload (25%), Complexity (25%), Sentiment (25%)
        final_score = (queue_score * 0.25) + (workload_score * 0.25) + (complexity_score * 0.25) + (sentiment_score * 0.25)
        
        # Override for escalated or critical priority tickets
        if ticket.is_escalated:
            final_score = min(final_score + 0.3, 1.0)
        if ticket.priority == 'critical':
            final_score = min(final_score + 0.2, 1.0)
            
        # Determine risk level
        if final_score >= 0.8:
            risk_level = 'critical'
        elif final_score >= 0.55:
            risk_level = 'high'
        elif final_score >= 0.3:
            risk_level = 'medium'
        else:
            risk_level = 'low'
            
        return {
            "sla_risk_score": round(final_score, 2),
            "sla_risk_level": risk_level
        }
