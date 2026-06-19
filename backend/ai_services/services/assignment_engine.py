import logging
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from tickets.models import Ticket
from authentication.models import AgentExpertise

User = get_user_model()
logger = logging.getLogger(__name__)

class AssignmentEngine:
    """
    Weighted Routing & Assignment Engine
    Assigns tickets to the most qualified agent based on a multi-factor score:
    - Department Match (30%)
    - Expertise Match (25%)
    - Knowledge Coverage (15%)
    - Success Rate (10%)
    - Current Workload (10%)
    - Sentiment Handling Score (10%)
    """

    def calculate_agent_score(self, agent, ticket):
        """Calculate score from 0 to 100 for an agent on a ticket"""
        score = 0.0

        # 1. Department Match (30% / 30 points)
        if ticket.department and agent.department == ticket.department:
            score += 30.0
            logger.debug(f"Agent {agent.email} department match: +30")

        # Get expertise for this category if available
        expertise = None
        if ticket.category:
            expertise = AgentExpertise.objects.filter(
                agent=agent,
                category=ticket.category
            ).first()

        # 2. Expertise Match (25% / 25 points)
        if expertise:
            if expertise.expertise_level == 'High':
                score += 25.0
            elif expertise.expertise_level == 'Medium':
                score += 15.0
            elif expertise.expertise_level == 'Low':
                score += 5.0
            logger.debug(f"Agent {agent.email} expertise level '{expertise.expertise_level}': +points")
        elif agent.expertise_score > 0:
            # Fallback to general expertise score
            rate = agent.expertise_score
            rate_factor = rate / 100.0 if rate > 1.0 else rate
            rate_factor = max(0.0, min(1.0, rate_factor))
            score += rate_factor * 25.0

        # 3. Knowledge Coverage (15% / 15 points)
        # Defined by whether the agent has resolved tickets in this category (resolved_count > 0)
        if expertise and expertise.resolved_count > 0:
            score += 15.0
            logger.debug(f"Agent {agent.email} knowledge coverage (resolved count {expertise.resolved_count}): +15")

        # 4. Success Rate (10% / 10 points)
        rate = agent.success_rate
        rate_factor = rate / 100.0 if rate > 1.0 else rate
        rate_factor = max(0.0, min(1.0, rate_factor))
        score += rate_factor * 10.0
        logger.debug(f"Agent {agent.email} success rate ({agent.success_rate}%): +{rate_factor * 10:.2f}")

        # 5. Current Workload (10% / 10 points)
        # Formula: (1.0 - (active_tickets / max_active_tickets)) * 10
        active_count = Ticket.objects.filter(
            agent=agent,
            status__in=['new', 'assigned', 'in_progress']
        ).count()
        
        max_tickets = agent.max_active_tickets or 10
        workload_ratio = active_count / max_tickets
        workload_factor = 1.0 - min(1.0, workload_ratio)
        score += workload_factor * 10.0
        logger.debug(f"Agent {agent.email} active workload ({active_count}/{max_tickets}): +{workload_factor * 10:.2f}")

        # 6. Sentiment Handling Score (10% / 10 points)
        sentiment_score = getattr(agent, 'sentiment_handling_score', 0.0)
        sentiment_factor = sentiment_score / 100.0 if sentiment_score > 1.0 else sentiment_score
        sentiment_factor = max(0.0, min(1.0, sentiment_factor))
        score += sentiment_factor * 10.0

        logger.info(f"Agent {agent.email} final calculated routing score: {score:.2f}")
        return score

    def get_routing_recommendation(self, ticket):
        """
        Produce a routing recommendation output structure:
        {
          "recommended_agent": "Alice",
          "confidence": 91,
          "reason": ["Department Match", "High Expertise", "Low Workload"]
        }
        """
        candidates = User.objects.filter(
            role__in=['agent', 'admin'],
            is_active=True,
            is_available=True
        )

        best_agent = None
        best_score = -1.0

        for agent in candidates:
            # Check capacity constraint
            active_count = Ticket.objects.filter(
                agent=agent,
                status__in=['new', 'assigned', 'in_progress']
            ).count()

            max_allowed = agent.max_active_tickets or 10
            if active_count >= max_allowed:
                continue

            score = self.calculate_agent_score(agent, ticket)
            if score > best_score:
                best_score = score
                best_agent = agent

        if best_agent:
            reasons = []
            if ticket.department and best_agent.department == ticket.department:
                reasons.append("Department Match")

            expertise = None
            if ticket.category:
                expertise = AgentExpertise.objects.filter(
                    agent=best_agent,
                    category=ticket.category
                ).first()

            if (expertise and expertise.expertise_level == 'High') or best_agent.expertise_score >= 80.0:
                reasons.append("High Expertise")
            else:
                reasons.append("Matching Expertise")

            active_count = Ticket.objects.filter(
                agent=best_agent,
                status__in=['new', 'assigned', 'in_progress']
            ).count()
            if active_count <= 2:
                reasons.append("Low Workload")
            else:
                reasons.append("Balanced Workload")

            if getattr(best_agent, 'sentiment_handling_score', 0.0) >= 0.7:
                reasons.append("High Sentiment handling")

            confidence = int(best_score)
            confidence = max(10, min(100, confidence))

            return {
                "recommended_agent": f"{best_agent.first_name} {best_agent.last_name}".strip() or best_agent.email,
                "confidence": confidence,
                "reason": reasons
            }

        return {
            "recommended_agent": "None",
            "confidence": 0,
            "reason": ["No available agents meet criteria"]
        }

    def assign_ticket(self, ticket):
        """
        Evaluate all eligible agents and assign the ticket.
        Returns User (agent) if assigned, None if no agent is available.
        """
        # Find candidates: agents or admins who are available
        candidates = User.objects.filter(
            role__in=['agent', 'admin'],
            is_active=True,
            is_available=True
        )

        best_agent = None
        best_score = -1.0

        for agent in candidates:
            # Check capacity constraint: active tickets must be less than max_active_tickets
            active_count = Ticket.objects.filter(
                agent=agent,
                status__in=['new', 'assigned', 'in_progress']
            ).count()

            max_allowed = agent.max_active_tickets or 10
            if active_count >= max_allowed:
                logger.info(f"Agent {agent.email} skipped (at capacity: {active_count}/{max_allowed})")
                continue

            score = self.calculate_agent_score(agent, ticket)
            if score > best_score:
                best_score = score
                best_agent = agent
            elif score == best_score and best_agent is not None:
                # Tie breaker: agent with fewer active tickets
                best_agent_active = Ticket.objects.filter(agent=best_agent, status__in=['new', 'assigned', 'in_progress']).count()
                if active_count < best_agent_active:
                    best_agent = agent
                elif active_count == best_agent_active:
                    # Tie breaker 2: agent with higher success rate
                    if agent.success_rate > best_agent.success_rate:
                        best_agent = agent

        if best_agent:
            logger.info(f"Assigning ticket {ticket.ticket_number} to {best_agent.email} (score: {best_score:.2f})")
            return best_agent
        else:
            logger.warning(f"No available agents found for ticket {ticket.ticket_number}")
            return None
