"""
Views for Ticket Management System
"""

import logging
from django.db.models import Q, Count
from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from .models import Ticket, TicketMessage, TicketAttachment, TicketHistory, TicketTag, TicketWatcher
from .serializers import (
    TicketListSerializer, TicketDetailSerializer, TicketCreateSerializer,
    TicketUpdateSerializer, TicketAssignSerializer, TicketStatusUpdateSerializer,
    TicketResolveSerializer, TicketSearchSerializer, TicketMessageSerializer,
    TicketAttachmentSerializer
)

logger = logging.getLogger(__name__)


class TicketPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class TicketViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing support tickets
    
    Endpoints:
    - GET /api/tickets/ - List tickets
    - POST /api/tickets/ - Create ticket
    - GET /api/tickets/<id>/ - Get ticket details
    - PATCH /api/tickets/<id>/ - Update ticket
    - DELETE /api/tickets/<id>/ - Delete ticket
    - POST /api/tickets/<id>/assign/ - Assign to agent
    - POST /api/tickets/<id>/resolve/ - Mark as resolved
    - POST /api/tickets/<id>/close/ - Close ticket
    - POST /api/tickets/<id>/reopen/ - Reopen ticket
    - GET /api/tickets/<id>/messages/ - Get messages
    - POST /api/tickets/<id>/messages/ - Add message
    - GET /api/tickets/<id>/attachments/ - Get attachments
    - POST /api/tickets/<id>/attachments/ - Upload attachment
    - POST /api/tickets/<id>/watch/ - Watch ticket
    - DELETE /api/tickets/<id>/watch/ - Stop watching
    """
    
    permission_classes = [IsAuthenticated]
    pagination_class = TicketPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['ticket_number', 'subject', 'description']
    ordering_fields = ['created_at', 'priority', 'status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter tickets based on user role"""
        user = self.request.user
        
        if user.role == 'admin':
            return Ticket.objects.all().prefetch_related(
                'messages', 'attachments', 'history', 'tags', 'watchers'
            )
        elif user.role == 'agent':
            # Agents see assigned tickets + all new tickets
            return Ticket.objects.filter(
                Q(agent=user) | Q(status='new')
            ).prefetch_related(
                'messages', 'attachments', 'history', 'tags', 'watchers'
            )
        else:  # customer
            return Ticket.objects.filter(
                customer=user
            ).prefetch_related(
                'messages', 'attachments', 'history', 'tags', 'watchers'
            )
    
    def get_serializer_class(self):
        """Use appropriate serializer based on action"""
        if self.action == 'list':
            return TicketListSerializer
        elif self.action == 'create':
            return TicketCreateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return TicketUpdateSerializer
        elif self.action == 'assign':
            return TicketAssignSerializer
        elif self.action == 'resolve':
            return TicketResolveSerializer
        else:
            return TicketDetailSerializer
    
    def perform_create(self, serializer):
        """Create ticket and log history"""
        ticket = serializer.save(customer=self.request.user)
        
        # Log creation
        TicketHistory.objects.create(
            ticket=ticket,
            action='created',
            actor=self.request.user,
            description=f"Ticket created by {self.request.user.email}"
        )
        
        logger.info(f"✓ Ticket {ticket.ticket_number} created by {self.request.user.email}")
    
    def perform_update(self, serializer):
        """Update ticket and log changes"""
        old_instance = self.get_object()
        new_instance = serializer.save()
        
        # Log priority change
        if old_instance.priority != new_instance.priority:
            TicketHistory.objects.create(
                ticket=new_instance,
                action='priority_changed',
                actor=self.request.user,
                old_value=old_instance.priority,
                new_value=new_instance.priority
            )
        
        # Log status change
        if old_instance.status != new_instance.status:
            TicketHistory.objects.create(
                ticket=new_instance,
                action='status_changed',
                actor=self.request.user,
                old_value=old_instance.status,
                new_value=new_instance.status
            )
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Assign ticket to an agent"""
        ticket = self.get_object()
        serializer = TicketAssignSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from authentication.models import User
            agent = User.objects.get(id=serializer.validated_data['agent_id'])
            
            if agent.role not in ['agent', 'admin']:
                return Response(
                    {'error': 'User must be an agent'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            ticket.agent = agent
            ticket.assigned_at = timezone.now()
            ticket.status = 'assigned'
            ticket.save()
            
            # Log assignment
            TicketHistory.objects.create(
                ticket=ticket,
                action='assigned',
                actor=request.user,
                new_value=agent.email
            )
            
            logger.info(f"✓ Ticket {ticket.ticket_number} assigned to {agent.email}")
            
            return Response({
                'status': 'assigned',
                'ticket_number': ticket.ticket_number,
                'agent': agent.email
            })
        
        except Exception as e:
            logger.error(f"✗ Assignment failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark ticket as resolved"""
        ticket = self.get_object()
        serializer = TicketResolveSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            ticket.resolution_notes = serializer.validated_data['resolution_notes']
            ticket.resolved_at = timezone.now()
            ticket.status = 'resolved'
            ticket.save()
            
            # Log resolution
            TicketHistory.objects.create(
                ticket=ticket,
                action='resolved',
                actor=request.user,
                description='Ticket marked as resolved'
            )
            
            logger.info(f"✓ Ticket {ticket.ticket_number} resolved")
            
            return Response({
                'status': 'resolved',
                'ticket_number': ticket.ticket_number,
                'resolved_at': ticket.resolved_at
            })
        
        except Exception as e:
            logger.error(f"✗ Resolution failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close ticket"""
        ticket = self.get_object()
        
        try:
            ticket.status = 'closed'
            ticket.closed_at = timezone.now()
            ticket.save()
            
            # Log closure
            TicketHistory.objects.create(
                ticket=ticket,
                action='closed',
                actor=request.user,
                description='Ticket closed'
            )
            
            logger.info(f"✓ Ticket {ticket.ticket_number} closed")
            
            return Response({
                'status': 'closed',
                'ticket_number': ticket.ticket_number,
                'closed_at': ticket.closed_at
            })
        
        except Exception as e:
            logger.error(f"✗ Close failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        """Reopen a closed/resolved ticket"""
        ticket = self.get_object()
        
        try:
            old_status = ticket.status
            ticket.status = 'in_progress'
            ticket.closed_at = None
            ticket.resolved_at = None
            ticket.save()
            
            # Log reopening
            TicketHistory.objects.create(
                ticket=ticket,
                action='reopened',
                actor=request.user,
                old_value=old_status,
                new_value='in_progress'
            )
            
            logger.info(f"✓ Ticket {ticket.ticket_number} reopened")
            
            return Response({
                'status': 'reopened',
                'ticket_number': ticket.ticket_number
            })
        
        except Exception as e:
            logger.error(f"✗ Reopen failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def watch(self, request, pk=None):
        """Watch a ticket for updates"""
        ticket = self.get_object()
        
        try:
            watcher, created = TicketWatcher.objects.get_or_create(
                ticket=ticket,
                user=request.user
            )
            
            return Response({
                'status': 'watching' if created else 'already_watching',
                'ticket_number': ticket.ticket_number
            })
        
        except Exception as e:
            logger.error(f"✗ Watch failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['delete'])
    def unwatch(self, request, pk=None):
        """Stop watching a ticket"""
        ticket = self.get_object()
        
        try:
            TicketWatcher.objects.filter(
                ticket=ticket,
                user=request.user
            ).delete()
            
            return Response({
                'status': 'unwatched',
                'ticket_number': ticket.ticket_number
            })
        
        except Exception as e:
            logger.error(f"✗ Unwatch failed: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        """Get or add messages to ticket"""
        ticket = self.get_object()
        
        if request.method == 'GET':
            messages = ticket.messages.all()
            serializer = TicketMessageSerializer(messages, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            content = request.data.get('content', '').strip()
            is_internal = request.data.get('is_internal', False)
            
            if not content:
                return Response(
                    {'error': 'Content is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                message = TicketMessage.objects.create(
                    ticket=ticket,
                    author=request.user,
                    content=content,
                    is_internal=is_internal
                )
                
                # Log message addition
                TicketHistory.objects.create(
                    ticket=ticket,
                    action='message_added',
                    actor=request.user,
                    description=f"Message added: {content[:50]}..."
                )
                
                serializer = TicketMessageSerializer(message)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            
            except Exception as e:
                logger.error(f"✗ Message creation failed: {e}")
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
    
    @action(detail=True, methods=['get', 'post'])
    def attachments(self, request, pk=None):
        """Get or upload attachments"""
        ticket = self.get_object()
        
        if request.method == 'GET':
            attachments = ticket.attachments.all()
            serializer = TicketAttachmentSerializer(attachments, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            file_obj = request.FILES.get('file')
            
            if not file_obj:
                return Response(
                    {'error': 'File is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate file size (10MB max)
            max_size = 10 * 1024 * 1024
            if file_obj.size > max_size:
                return Response(
                    {'error': 'File is too large (max 10MB)'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                attachment = TicketAttachment.objects.create(
                    ticket=ticket,
                    file=file_obj,
                    filename=file_obj.name,
                    file_size=file_obj.size,
                    uploaded_by=request.user
                )
                
                # Log attachment
                TicketHistory.objects.create(
                    ticket=ticket,
                    action='attachment_added',
                    actor=request.user,
                    description=f"File uploaded: {file_obj.name}"
                )
                
                serializer = TicketAttachmentSerializer(attachment)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            
            except Exception as e:
                logger.error(f"✗ Attachment upload failed: {e}")
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
    
    @action(detail=False, methods=['get'])
    def my_tickets(self, request):
        """Get current user's tickets"""
        queryset = self.get_queryset()
        serializer = TicketListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def unassigned(self, request):
        """Get unassigned tickets (for agents)"""
        if request.user.role not in ['agent', 'admin']:
            return Response(
                {'error': 'Only agents can view unassigned tickets'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = Ticket.objects.filter(
            agent__isnull=True,
            status='new'
        )
        serializer = TicketListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get ticket statistics"""
        queryset = self.get_queryset()
        
        stats = {
            'total': queryset.count(),
            'by_status': dict(queryset.values('status').annotate(count=Count('status')).values_list('status', 'count')),
            'by_priority': dict(queryset.values('priority').annotate(count=Count('priority')).values_list('priority', 'count')),
            'overdue': queryset.filter(resolution_sla__lt=timezone.now(), status__in=['new', 'assigned', 'in_progress']).count(),
            'avg_resolution_time': None,
        }
        
        return Response(stats)
