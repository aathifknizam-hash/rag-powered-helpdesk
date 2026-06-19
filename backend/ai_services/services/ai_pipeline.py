import json
import logging
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from tickets.models import Ticket, Department, TicketHistory
from knowledge_base.models import KnowledgeCategory
from authentication.models import User
from ai_services.services.assignment_engine import AssignmentEngine

logger = logging.getLogger(__name__)

class AIPipelineService:
    """
    Automated AI pipeline for ticket processing:
    1. Groq analysis: sentiment, priority, category, and department.
    2. Automatic SLA setting based on priority.
    3. Assignment Engine routing.
    4. Critical escalation triggers.
    """

    MODEL = getattr(settings, 'GROQ_MODEL', 'llama-3.3-70b-versatile')

    PROMPT_TEMPLATE = """You are an enterprise service desk AI router.
Analyze the following support ticket subject and description:

Subject: {subject}
Description: {description}

Based on this content, classify the ticket by selecting exactly one item from each of the lists below:

1. Category: Must be exactly one of:
{categories}

2. Department: Must be exactly one of:
{departments}

3. Sentiment: Must be exactly one of:
- Positive (compliments, friendly notes)
- Neutral (general inquiries, simple requests e.g. "My VPN isn't working")
- Frustrated (expression of annoyance or delay e.g. "My laptop has been unusable for 3 days")
- Angry (strong aggressive language or intense dissatisfaction)
- Urgent (critical timeline mentioned e.g. "My entire department is blocked")

4. Priority: Must be exactly one of:
- Low (informational, minor requests)
- Medium (normal business impact)
- High (significant business impact, single user blocked)
- Critical (complete system outage, whole department blocked, major security issue)

Return ONLY valid JSON (no markdown wrapper, no extra text):
{{
    "category": "detected_category",
    "department": "detected_department",
    "sentiment": "detected_sentiment",
    "priority": "detected_priority",
    "reasoning": "brief explanation"
}}"""

    def get_groq_client(self):
        api_key = getattr(settings, 'GROQ_API_KEY', None)
        if not api_key:
            return None
        try:
            from groq import Groq
            return Groq(api_key=api_key)
        except ImportError:
            return None

    def analyze_ticket(self, subject, description):
        """Perform Groq sentiment, priority, category and department detection"""
        # Fetch valid values
        categories = list(KnowledgeCategory.objects.values_list('name', flat=True))
        if not categories:
            categories = ["VPN", "Networking", "Windows", "Email", "Payroll", "Leave Management", "Benefits", "Hardware", "Software", "Security", "Facilities"]
        
        departments = list(Department.objects.values_list('name', flat=True))
        if not departments:
            departments = ["HR", "Finance", "Technical Support", "Network Support", "Software Support", "Operations", "General Support"]

        client = self.get_groq_client()
        if not client:
            logger.warning("Groq API key or client not configured. Using fallback classification.")
            return self._get_fallback_analysis(subject, description, categories, departments)

        try:
            prompt = self.PROMPT_TEMPLATE.format(
                subject=subject,
                description=description,
                categories=", ".join(categories),
                departments=", ".join(departments)
            )

            completion = client.chat.completions.create(
                model=self.MODEL,
                messages=[
                    {"role": "system", "content": "You are a ticket classification engine. Return JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=300
            )

            raw = completion.choices[0].message.content.strip()
            # Clean possible markdown wrap
            if raw.startswith('```'):
                raw = raw.split('```')[1]
                if raw.startswith('json'):
                    raw = raw[4:]
            
            result = json.loads(raw.strip())

            # Validate outputs
            cat_name = result.get('category')
            if cat_name not in categories:
                result['category'] = "General Support" if "General Support" in categories else categories[0]
            
            dept_name = result.get('department')
            if dept_name not in departments:
                result['department'] = "General Support" if "General Support" in departments else departments[0]

            sentiment = result.get('sentiment', 'Neutral')
            valid_sentiments = ['Positive', 'Neutral', 'Frustrated', 'Angry', 'Urgent']
            if sentiment not in valid_sentiments:
                result['sentiment'] = 'Neutral'

            priority = result.get('priority', 'medium').lower()
            valid_priorities = ['low', 'medium', 'high', 'critical']
            if priority not in valid_priorities:
                result['priority'] = 'medium'
            else:
                result['priority'] = priority

            return result

        except Exception as e:
            logger.error(f"Error in Groq ticket analysis: {e}")
            return self._get_fallback_analysis(subject, description, categories, departments)

    def _get_fallback_analysis(self, subject, description, categories, departments):
        """Analyze ticket using basic keywords if Groq fails"""
        text = f"{subject} {description}".lower()
        
        # Simple fallback checks
        sentiment = 'Neutral'
        if any(w in text for w in ['angry', 'terrible', 'useless', 'unacceptable']):
            sentiment = 'Angry'
        elif any(w in text for w in ['days', 'blocked', 'unusable', 'frustrated']):
            sentiment = 'Frustrated'
        elif any(w in text for w in ['urgent', 'asap', 'emergency', 'blocked']):
            sentiment = 'Urgent'

        priority = 'medium'
        if any(w in text for w in ['down', 'outage', 'crash', 'all employees', 'blocked']):
            priority = 'critical'
        elif any(w in text for w in ['urgent', 'asap', 'broken', 'not working']):
            priority = 'high'
        elif any(w in text for w in ['question', 'how to', 'inquiry']):
            priority = 'low'

        category = categories[0]
        for c in categories:
            if c.lower() in text:
                category = c
                break

        department = departments[0]
        for d in departments:
            if d.lower() in text or (d == 'Network Support' and 'vpn' in text) or (d == 'Finance' and 'payroll' in text):
                department = d
                break

        # Detect HR and facilities keywords explicitly in case categories are not present
        if any(term in text for term in ['leave', 'vacation', 'pto', 'maternity', 'paternity', 'sick leave', 'benefits', 'payroll']):
            department = next((d for d in departments if d.lower() == 'hr'), department)
            category = next((c for c in categories if c.lower() == 'leave management'), category)
        elif any(term in text for term in ['facility', 'facilities', 'parking', 'maintenance', 'air conditioning', 'ac', 'heater', 'lighting', 'restroom', 'kitchen', 'building']):
            department = next((d for d in departments if d.lower() == 'facilities'), department)
            category = next((c for c in categories if c.lower() == 'facilities'), category)

        return {
            "category": category,
            "department": department,
            "sentiment": sentiment,
            "priority": priority,
            "reasoning": "Keyword-based fallback analysis."
        }

    def process_new_ticket(self, ticket_id):
        """Process new ticket: analyze, set SLA, route, assign, handle escalation"""
        try:
            ticket = Ticket.objects.get(id=ticket_id)
        except Ticket.DoesNotExist:
            logger.error(f"Ticket ID {ticket_id} does not exist.")
            return None

        logger.info(f"Processing ticket {ticket.ticket_number} through automated AI pipeline...")

        # 1. Groq analysis
        analysis = self.analyze_ticket(ticket.subject, ticket.description)
        
        # 2. Match Category and Department objects
        try:
            category_obj = KnowledgeCategory.objects.get(name=analysis['category'])
            ticket.category = category_obj
        except KnowledgeCategory.DoesNotExist:
            pass

        try:
            department_obj = Department.objects.get(name=analysis['department'])
            ticket.department = department_obj
        except Department.DoesNotExist:
            # Fallback to General Support
            general_support = Department.objects.filter(name="General Support").first()
            ticket.department = general_support
        # Calculate intelligence metrics
        from ai_services.services.sentiment_service import SentimentService
        sentiment_label, sentiment_score = SentimentService.analyze_sentiment(ticket.subject, ticket.description)
        ticket.sentiment = sentiment_label
        ticket.sentiment_score = sentiment_score

        from ai_services.services.sla_prediction_service import SLAPredictionService
        sla_risk = SLAPredictionService.predict_sla_risk(ticket)
        ticket.sla_risk_score = sla_risk['sla_risk_score']
        ticket.sla_risk_level = sla_risk['sla_risk_level']

        from ai_services.services.priority_engine import PriorityEngine
        priority_res = PriorityEngine.calculate_priority(
            ticket.subject,
            ticket.description,
            ticket.sentiment_score,
            customer=ticket.customer,
            sla_risk_score=ticket.sla_risk_score
        )
        ticket.priority = priority_res['priority_level']
        ticket.priority_score = priority_res['priority_score']
        ticket.priority_reason = priority_res['reason']

        ticket.ai_suggested_type = analysis['category']
        ticket.ai_suggested_priority = priority_res['priority_level']
        ticket.ai_classification_confidence = 0.95

        # 3. Calculate SLA Deadlines
        now = timezone.now()
        sla_durations = {
            'low': timedelta(days=5),
            'medium': timedelta(days=3),
            'high': timedelta(hours=24),
            'critical': timedelta(hours=4)
        }
        duration = sla_durations.get(ticket.priority, timedelta(days=3))
        
        ticket.first_response_sla = now + timedelta(hours=2) if ticket.priority in ['high', 'critical'] else now + timedelta(hours=8)
        ticket.resolution_sla = now + duration

        # 4. Critical Escalation
        if ticket.priority == 'critical' and ticket.sentiment == 'Urgent':
            ticket.is_escalated = True
            ticket.escalated_at = now
            # Raise SLA to 2 hours
            ticket.resolution_sla = now + timedelta(hours=2)
            
            # Log escalation
            TicketHistory.objects.create(
                ticket=ticket,
                action='status_changed',
                actor=None,
                description="Ticket automatically escalated due to critical priority and urgent sentiment."
            )
            
            # Notification trigger (Admin & Lead)
            self._notify_escalation(ticket)

        ticket.save()

        # 5. Route & Assign Agent
        engine = AssignmentEngine()
        assigned_agent = engine.assign_ticket(ticket)
        if assigned_agent:
            ticket.agent = assigned_agent
            ticket.status = 'assigned'
            ticket.assigned_at = now
            ticket.save()

            TicketHistory.objects.create(
                ticket=ticket,
                action='assigned',
                actor=None,
                description=f"Ticket routed and assigned to agent {assigned_agent.email} via Weighted Assignment Engine."
            )
            
            # Send live WebSocket notifications to the agent
            self._notify_assignment(ticket, assigned_agent)

        else:
            ticket.status = 'new'
            ticket.save()
            
            TicketHistory.objects.create(
                ticket=ticket,
                action='status_changed',
                actor=None,
                description="No available agents found. Ticket placed in department queue."
            )

        return ticket

    def _notify_escalation(self, ticket):
        """Send notifications to Admins and Department Lead"""
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            if not channel_layer:
                return

            notification_data = {
                'type': 'notify',
                'title': "CRITICAL TICKET ESCALATION",
                'message': f"Ticket {ticket.ticket_number} has been escalated! Priority: Critical, Sentiment: Urgent.",
                'notification_type': 'danger',
                'timestamp': timezone.now().isoformat(),
            }

            # Send to Admins
            admins = User.objects.filter(role='admin')
            for admin in admins:
                async_to_sync(channel_layer.group_send)(
                    f'user_{admin.id}_notifications',
                    notification_data
                )

            # Send to Department Lead
            if ticket.department and ticket.department.lead_agent:
                lead = ticket.department.lead_agent
                async_to_sync(channel_layer.group_send)(
                    f'user_{lead.id}_notifications',
                    notification_data
                )
        except Exception as e:
            logger.error(f"Failed to send escalation notification: {e}")

    def _notify_assignment(self, ticket, agent):
        """Send notification to the assigned agent"""
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            if not channel_layer:
                return

            notification_data = {
                'type': 'notify',
                'title': "New Ticket Assigned",
                'message': f"Ticket {ticket.ticket_number} - '{ticket.subject}' has been assigned to you.",
                'notification_type': 'success',
                'timestamp': timezone.now().isoformat(),
            }

            async_to_sync(channel_layer.group_send)(
                f'user_{agent.id}_notifications',
                notification_data
            )
            
            # Also notify of ticket update
            async_to_sync(channel_layer.group_send)(
                f'user_{agent.id}_notifications',
                {
                    'type': 'ticket_update',
                    'ticket_id': ticket.id,
                    'action': 'assigned',
                    'timestamp': timezone.now().isoformat()
                }
            )
        except Exception as e:
            logger.error(f"Failed to send assignment notification: {e}")
