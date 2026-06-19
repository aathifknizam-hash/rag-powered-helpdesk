import logging
from django.db.models import Avg, F
from django.utils import timezone
from authentication.models import AgentExpertise, User
from tickets.models import Ticket

logger = logging.getLogger(__name__)

def update_agent_metrics(agent):
    """
    Recalculate and update agent performance metrics:
    - Resolved count per knowledge category -> AgentExpertise levels
    - Success Rate
    - Expertise Score
    """
    try:
        # 1. Recalculate resolved count per category
        resolved_tickets = Ticket.objects.filter(
            agent=agent,
            status__in=['resolved', 'closed']
        )
        total_resolved = resolved_tickets.count()

        # Group resolved tickets by category and update AgentExpertise
        categories_resolved = resolved_tickets.filter(category__isnull=False).values('category').annotate(count=Count('id'))
        
        from django.db.models import Count
        from knowledge_base.models import KnowledgeCategory
        
        # Keep track of categories we updated
        updated_category_ids = []
        
        for group in resolved_tickets.filter(category__isnull=False).values('category').annotate(count=Count('id')):
            cat_id = group['category']
            count = group['count']
            updated_category_ids.append(cat_id)
            
            try:
                category = KnowledgeCategory.objects.get(id=cat_id)
                # Determine expertise level
                # High: >= 15, Medium: 5-14, Low: < 5
                level = 'Low'
                if count >= 15:
                    level = 'High'
                elif count >= 5:
                    level = 'Medium'
                
                AgentExpertise.objects.update_or_create(
                    agent=agent,
                    category=category,
                    defaults={
                        'resolved_count': count,
                        'expertise_level': level
                    }
                )
            except KnowledgeCategory.DoesNotExist:
                continue

        # 2. Success Rate
        total_assigned = Ticket.objects.filter(agent=agent).count()
        success_rate = 0.0
        if total_assigned > 0:
            success_rate = round((total_resolved / total_assigned) * 100.0, 1)
        agent.success_rate = success_rate

        # 3. Calculate average resolution time (in hours)
        resolved_with_times = resolved_tickets.filter(
            resolved_at__isnull=False,
            created_at__isnull=False
        )
        avg_resolution_time_hours = 0.0
        if resolved_with_times.exists():
            total_seconds = sum((t.resolved_at - t.created_at).total_seconds() for t in resolved_with_times)
            avg_resolution_time_hours = (total_seconds / resolved_with_times.count()) / 3600.0

        # 4. Overall Expertise Score
        # Formula: Base points from resolved count (2 pts each) + Success Rate weight - penalty for high resolution times
        base_score = float(total_resolved) * 2.0
        success_weight = success_rate * 0.4
        
        # Resolution speed bonus (e.g. faster resolution -> higher score)
        speed_bonus = 0.0
        if avg_resolution_time_hours > 0:
            # If average is less than 24 hours, give a bonus up to 10 points
            speed_bonus = max(0.0, 10.0 - (avg_resolution_time_hours / 12.0))
            
        expertise_score = base_score + success_weight + speed_bonus
        agent.expertise_score = min(100.0, round(expertise_score, 1))

        agent.save(update_fields=['success_rate', 'expertise_score'])
        logger.info(f"✓ Recalculated metrics for agent {agent.email}: Success={success_rate}%, Expertise={agent.expertise_score}")

    except Exception as e:
        logger.error(f"Error updating agent metrics: {e}", exc_info=True)
