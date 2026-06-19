"""
Serializers for Ticket Management System
"""

import logging
from rest_framework import serializers
from .models import Ticket, TicketMessage, TicketAttachment, TicketHistory, TicketTag, TicketWatcher
from .services import get_classifier
from authentication.models import User

logger = logging.getLogger(__name__)


class UserSimpleSerializer(serializers.ModelSerializer):
    """Simplified user info for nested fields"""
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role']
        read_only_fields = fields


class TicketMessageSerializer(serializers.ModelSerializer):
    """Ticket message serializer"""
    
    author = UserSimpleSerializer(read_only=True)
    
    class Meta:
        model = TicketMessage
        fields = ['id', 'ticket', 'author', 'content', 'is_internal', 'created_at', 'updated_at']
        read_only_fields = ['id', 'ticket', 'author', 'created_at', 'updated_at']


class TicketAttachmentSerializer(serializers.ModelSerializer):
    """Ticket attachment serializer"""
    
    uploaded_by = UserSimpleSerializer(read_only=True)
    
    class Meta:
        model = TicketAttachment
        fields = ['id', 'ticket', 'file', 'filename', 'file_size', 'uploaded_by', 'uploaded_at']
        read_only_fields = ['id', 'ticket', 'uploaded_by', 'uploaded_at', 'file_size']


class TicketHistorySerializer(serializers.ModelSerializer):
    """Ticket history/audit trail serializer"""
    
    actor = UserSimpleSerializer(read_only=True)
    
    class Meta:
        model = TicketHistory
        fields = ['id', 'action', 'actor', 'old_value', 'new_value', 'description', 'timestamp']
        read_only_fields = fields


class TicketTagSerializer(serializers.ModelSerializer):
    """Ticket tag serializer"""
    
    class Meta:
        model = TicketTag
        fields = ['id', 'ticket', 'name', 'created_at']
        read_only_fields = ['id', 'ticket', 'created_at']


class TicketWatcherSerializer(serializers.ModelSerializer):
    """Ticket watcher serializer"""
    
    user = UserSimpleSerializer(read_only=True)
    
    class Meta:
        model = TicketWatcher
        fields = ['id', 'ticket', 'user', 'created_at']
        read_only_fields = fields


class TicketListSerializer(serializers.ModelSerializer):
    """Simplified ticket serializer for list views"""
    
    customer = UserSimpleSerializer(read_only=True)
    agent = UserSimpleSerializer(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    message_count = serializers.SerializerMethodField()
    attachment_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_number', 'customer', 'agent',
            'subject', 'status', 'priority', 'request_type',
            'department_name', 'category_name', 'sentiment', 'sentiment_score',
            'priority_score', 'priority_reason', 'sla_risk_score', 'sla_risk_level',
            'is_escalated', 'created_at', 'updated_at', 'assigned_at', 'resolved_at',
            'message_count', 'attachment_count'
        ]
        read_only_fields = fields
    
    def get_message_count(self, obj):
        return obj.messages.count()
    
    def get_attachment_count(self, obj):
        return obj.attachments.count()


class TicketDetailSerializer(serializers.ModelSerializer):
    """Complete ticket details with all relationships"""
    
    customer = UserSimpleSerializer(read_only=True)
    agent = UserSimpleSerializer(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    messages = TicketMessageSerializer(many=True, read_only=True)
    attachments = TicketAttachmentSerializer(many=True, read_only=True)
    history = TicketHistorySerializer(many=True, read_only=True)
    tags = TicketTagSerializer(many=True, read_only=True)
    watchers = TicketWatcherSerializer(many=True, read_only=True)
    
    # Computed fields
    is_overdue = serializers.SerializerMethodField()
    time_to_resolve = serializers.SerializerMethodField()
    resolution_time = serializers.SerializerMethodField()
    routing_recommendation = serializers.SerializerMethodField()
    escalation_prediction = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_number', 'customer', 'agent',
            'subject', 'description', 'request_type',
            'department_name', 'category_name', 'sentiment', 'sentiment_score',
            'priority_score', 'priority_reason', 'sla_risk_score', 'sla_risk_level',
            'is_escalated', 'status', 'priority', 'resolution_notes',
            'created_at', 'updated_at', 'assigned_at',
            'resolved_at', 'closed_at',
            'first_response_sla', 'resolution_sla',
            'ai_suggested_type', 'ai_suggested_priority',
            'ai_classification_confidence',
            'messages', 'attachments', 'history', 'tags', 'watchers',
            'is_overdue', 'time_to_resolve', 'resolution_time',
            'routing_recommendation', 'escalation_prediction'
        ]
        read_only_fields = [
            'id', 'ticket_number', 'customer', 'agent',
            'created_at', 'updated_at', 'assigned_at',
            'resolved_at', 'closed_at', 'first_response_sla',
            'resolution_sla', 'messages', 'attachments', 'history',
            'tags', 'watchers'
        ]
    
    def get_is_overdue(self, obj):
        return obj.is_overdue()
    
    def get_time_to_resolve(self, obj):
        remaining = obj.get_time_to_resolve()
        return remaining.total_seconds() if remaining else None
    
    def get_resolution_time(self, obj):
        resolution = obj.get_resolution_time()
        return resolution.total_seconds() if resolution else None

    def get_routing_recommendation(self, obj):
        from ai_services.services.assignment_engine import AssignmentEngine
        engine = AssignmentEngine()
        return engine.get_routing_recommendation(obj)

    def get_escalation_prediction(self, obj):
        from ai_services.services.escalation_service import EscalationService
        return EscalationService.analyze_escalation(obj)


class TicketCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new tickets with AI classification
    
    Automatically classifies tickets using AI if not manually specified.
    """
    
    # Optional fields to override AI classification
    override_type = serializers.CharField(
        required=False,
        write_only=True,
        help_text="Override AI-suggested request type"
    )
    override_priority = serializers.CharField(
        required=False,
        write_only=True,
        help_text="Override AI-suggested priority"
    )
    
    # Response fields for classification info
    ai_suggested_type = serializers.CharField(read_only=True)
    ai_suggested_priority = serializers.CharField(read_only=True)
    ai_classification_confidence = serializers.FloatField(read_only=True)
    classification_reasoning = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = [
            'subject', 'description', 'request_type', 'priority',
            'override_type', 'override_priority',
            'ai_suggested_type', 'ai_suggested_priority',
            'ai_classification_confidence', 'classification_reasoning'
        ]
    
    def validate_description(self, value):
        if len(value) < 10:
            raise serializers.ValidationError("Description must be at least 10 characters")
        return value
    
    def validate_override_type(self, value):
        if value and value.lower() not in ['it', 'hr', 'facilities', 'finance', 'admin', 'other']:
            raise serializers.ValidationError("Invalid ticket type")
        return value.lower() if value else None
    
    def validate_override_priority(self, value):
        if value and value.lower() not in ['low', 'medium', 'high', 'critical']:
            raise serializers.ValidationError("Invalid priority level")
        return value.lower() if value else None
    
    def get_classification_reasoning(self, obj):
        """Extract reasoning from classification context"""
        return getattr(self, '_classification_reasoning', '')
    
    def create(self, validated_data):
        """Create ticket and trigger the automated AI pipeline"""
        # Remove overrides from validated_data so they don't break Ticket.objects.create
        override_type = validated_data.pop('override_type', None)
        override_priority = validated_data.pop('override_priority', None)
        
        # Auto-assign customer from request user
        validated_data['customer'] = self.context['request'].user
        
        # Ensure status is new
        validated_data['status'] = 'new'
        
        # Create ticket
        ticket = Ticket.objects.create(**validated_data)
        
        try:
            # Trigger full automated AI pipeline
            from ai_services.services.ai_pipeline import AIPipelineService
            pipeline = AIPipelineService()
            ticket = pipeline.process_new_ticket(ticket.id)
            
            # Re-fetch ticket to get updated values
            ticket.refresh_from_db()
            
            # Apply manual overrides if present
            save_needed = False
            if override_type:
                ticket.request_type = override_type
                # Try to map to category
                try:
                    from knowledge_base.models import KnowledgeCategory
                    cat = KnowledgeCategory.objects.get(name__iexact=override_type)
                    ticket.category = cat
                except Exception:
                    pass
                save_needed = True
                
            if override_priority:
                ticket.priority = override_priority
                save_needed = True
                
            if save_needed:
                ticket.save()
                
            # Populate classification reasoning for response metadata
            self._classification_reasoning = f"Routed automatically to department {ticket.department.name if ticket.department else 'General Support'}."
            
        except Exception as e:
            logger.error(f"Failed to process ticket through AI pipeline: {e}", exc_info=True)
            self._classification_reasoning = f"AI routing failed: {str(e)}. Assigned to manual queue."
            
        return ticket


class TicketUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating tickets"""
    
    class Meta:
        model = Ticket
        fields = [
            'subject', 'description', 'status', 'priority',
            'resolution_notes', 'ai_suggested_type',
            'ai_suggested_priority', 'ai_classification_confidence',
            'is_escalated'
        ]


class TicketAssignSerializer(serializers.Serializer):
    """Serializer for assigning tickets"""
    
    agent_id = serializers.IntegerField()
    
    def validate_agent_id(self, value):
        try:
            agent = User.objects.get(id=value)
            if agent.role not in ['agent', 'admin']:
                raise serializers.ValidationError("User must be an agent")
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Agent not found")


class TicketStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating ticket status"""
    
    status = serializers.ChoiceField(
        choices=['new', 'assigned', 'in_progress', 'waiting_customer', 'resolved', 'closed']
    )
    resolution_notes = serializers.CharField(required=False, allow_blank=True)


class TicketResolveSerializer(serializers.Serializer):
    """Serializer for resolving tickets"""
    
    resolution_notes = serializers.CharField()
    
    def validate_resolution_notes(self, value):
        if len(value) < 5:
            raise serializers.ValidationError("Resolution notes must be at least 5 characters")
        return value


class TicketSearchSerializer(serializers.Serializer):
    """Serializer for ticket search filters"""
    
    status = serializers.ChoiceField(
        choices=['new', 'assigned', 'in_progress', 'waiting_customer', 'resolved', 'closed'],
        required=False
    )
    priority = serializers.ChoiceField(
        choices=['low', 'medium', 'high', 'critical'],
        required=False
    )
    request_type = serializers.ChoiceField(
        choices=['it', 'hr', 'facilities', 'finance', 'admin', 'other'],
        required=False
    )
    agent_id = serializers.IntegerField(required=False)
    search = serializers.CharField(required=False, max_length=255)
    page = serializers.IntegerField(required=False, default=1)
    page_size = serializers.IntegerField(required=False, default=20)
