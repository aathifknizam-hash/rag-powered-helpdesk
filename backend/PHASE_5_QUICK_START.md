# PHASE 5: TICKET MANAGEMENT SYSTEM - QUICK START GUIDE

This guide will help you implement Phase 5 from the ground up.

## STEP 1: CREATE TICKETS APP

```bash
cd backend
python manage.py startapp tickets
```

## STEP 2: CREATE MODELS

Create `backend/tickets/models.py`:

```python
from django.db import models
from django.utils import timezone
from authentication.models import User

class Ticket(models.Model):
    STATUS_CHOICES = (
        ('new', 'New'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('waiting_customer', 'Waiting for Customer'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    )
    
    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )
    
    REQUEST_TYPES = (
        ('it', 'IT'),
        ('hr', 'HR'),
        ('facilities', 'Facilities'),
        ('finance', 'Finance'),
        ('admin', 'Administration'),
        ('other', 'Other'),
    )
    
    # Core fields
    ticket_number = models.CharField(
        max_length=20,
        unique=True
    )
    customer = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='tickets_as_customer'
    )
    agent = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets_assigned'
    )
    
    # Content
    subject = models.CharField(max_length=500)
    description = models.TextField()
    request_type = models.CharField(
        max_length=50,
        choices=REQUEST_TYPES
    )
    
    # Status & Priority
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='new'
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium'
    )
    
    # Resolution
    resolution_notes = models.TextField(
        blank=True,
        null=True
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    
    # SLA
    first_response_sla = models.DateTimeField(null=True, blank=True)
    resolution_sla = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['customer']),
            models.Index(fields=['agent']),
        ]
    
    def __str__(self):
        return f"{self.ticket_number} - {self.subject}"
    
    def save(self, *args, **kwargs):
        if not self.ticket_number:
            # Auto-generate ticket number
            from datetime import datetime
            date_str = datetime.now().strftime('%Y%m%d')
            count = Ticket.objects.filter(
                created_at__date=datetime.now().date()
            ).count() + 1
            self.ticket_number = f"TKT-{date_str}-{count:03d}"
        
        super().save(*args, **kwargs)


class TicketMessage(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True
    )
    content = models.TextField()
    is_internal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Message on {self.ticket.ticket_number}"


class TicketAttachment(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    file = models.FileField(upload_to='ticket_attachments/')
    filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.filename


class TicketHistory(models.Model):
    ACTION_TYPES = (
        ('created', 'Created'),
        ('assigned', 'Assigned'),
        ('status_changed', 'Status Changed'),
        ('priority_changed', 'Priority Changed'),
        ('message_added', 'Message Added'),
        ('resolved', 'Resolved'),
    )
    
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='history'
    )
    action = models.CharField(max_length=50, choices=ACTION_TYPES)
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True
    )
    old_value = models.CharField(max_length=255, blank=True)
    new_value = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.action} on {self.ticket.ticket_number}"
```

## STEP 3: UPDATE SETTINGS

Add to `backend/core/settings.py`:

```python
INSTALLED_APPS = [
    # ...existing apps...
    'tickets',
]
```

## STEP 4: CREATE MIGRATIONS

```bash
cd backend
python manage.py makemigrations tickets
python manage.py migrate tickets
```

## STEP 5: CREATE SERIALIZERS

Create `backend/tickets/serializers.py`:

```python
from rest_framework import serializers
from .models import Ticket, TicketMessage, TicketAttachment, TicketHistory

class TicketMessageSerializer(serializers.ModelSerializer):
    author_email = serializers.CharField(source='author.email', read_only=True)
    
    class Meta:
        model = TicketMessage
        fields = ['id', 'content', 'author_email', 'is_internal', 'created_at']
        read_only_fields = ['id', 'created_at']


class TicketAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_email = serializers.CharField(source='uploaded_by.email', read_only=True)
    
    class Meta:
        model = TicketAttachment
        fields = ['id', 'file', 'filename', 'uploaded_by_email', 'uploaded_at']


class TicketHistorySerializer(serializers.ModelSerializer):
    actor_email = serializers.CharField(source='actor.email', read_only=True)
    
    class Meta:
        model = TicketHistory
        fields = ['action', 'actor_email', 'old_value', 'new_value', 'timestamp']
        read_only_fields = fields


class TicketSerializer(serializers.ModelSerializer):
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    agent_email = serializers.CharField(source='agent.email', read_only=True, allow_null=True)
    messages = TicketMessageSerializer(many=True, read_only=True)
    attachments = TicketAttachmentSerializer(many=True, read_only=True)
    history = TicketHistorySerializer(many=True, read_only=True)
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_number', 'customer_email', 'agent_email',
            'subject', 'description', 'request_type', 'status', 'priority',
            'resolution_notes', 'created_at', 'updated_at', 'assigned_at',
            'resolved_at', 'closed_at', 'first_response_sla', 'resolution_sla',
            'messages', 'attachments', 'history'
        ]
        read_only_fields = ['id', 'ticket_number', 'created_at', 'updated_at']
```

## STEP 6: CREATE VIEWSETS

Create `backend/tickets/views.py`:

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from .models import Ticket, TicketMessage, TicketAttachment, TicketHistory
from .serializers import (
    TicketSerializer, TicketMessageSerializer,
    TicketAttachmentSerializer, TicketHistorySerializer
)

class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Ticket.objects.all()
        elif user.role == 'agent':
            return Ticket.objects.filter(
                models.Q(agent=user) | models.Q(status='new')
            )
        else:  # customer
            return Ticket.objects.filter(customer=user)
    
    def perform_create(self, serializer):
        ticket = serializer.save(customer=self.request.user)
        
        # Create history entry
        TicketHistory.objects.create(
            ticket=ticket,
            action='created',
            actor=self.request.user
        )
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        ticket = self.get_object()
        agent_id = request.data.get('agent_id')
        
        if not agent_id:
            return Response({'error': 'agent_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            agent = User.objects.get(id=agent_id, role='agent')
        except User.DoesNotExist:
            return Response({'error': 'Agent not found'}, status=status.HTTP_404_NOT_FOUND)
        
        ticket.agent = agent
        ticket.assigned_at = timezone.now()
        ticket.status = 'assigned'
        ticket.save()
        
        # Log history
        TicketHistory.objects.create(
            ticket=ticket,
            action='assigned',
            actor=request.user,
            new_value=agent.email
        )
        
        return Response({'status': 'assigned'})
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        ticket = self.get_object()
        resolution_notes = request.data.get('resolution_notes', '')
        
        ticket.resolution_notes = resolution_notes
        ticket.resolved_at = timezone.now()
        ticket.status = 'resolved'
        ticket.save()
        
        TicketHistory.objects.create(
            ticket=ticket,
            action='resolved',
            actor=request.user
        )
        
        return Response({'status': 'resolved'})
```

## STEP 7: CREATE URLS

Create `backend/tickets/urls.py`:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TicketViewSet

router = DefaultRouter()
router.register(r'', TicketViewSet, basename='ticket')

urlpatterns = [
    path('', include(router.urls)),
]
```

## STEP 8: REGISTER IN MAIN URLS

Update `backend/core/urls.py`:

```python
urlpatterns = [
    # ...existing urls...
    path('api/tickets/', include('tickets.urls')),
]
```

## STEP 9: TEST ENDPOINTS

```bash
# Create ticket
curl -X POST http://localhost:8000/api/tickets/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Password reset issue",
    "description": "Cannot reset my password",
    "request_type": "it",
    "priority": "high"
  }'

# List tickets
curl -X GET http://localhost:8000/api/tickets/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Assign ticket
curl -X POST http://localhost:8000/api/tickets/1/assign/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agent_id": 2}'

# Resolve ticket
curl -X POST http://localhost:8000/api/tickets/1/resolve/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resolution_notes": "Ticket resolved"}'
```

## STEP 10: NEXT FEATURES

After basic CRUD works:

1. Add message endpoints (POST/GET messages)
2. Add attachment handling
3. Add filters and search
4. Add pagination
5. Add SLA calculations
6. Create admin panel for ticket management

## KEY FILES CREATED

- `backend/tickets/models.py` - All 4 models
- `backend/tickets/serializers.py` - All serializers
- `backend/tickets/views.py` - ViewSet implementation
- `backend/tickets/urls.py` - URL routing
- `backend/tickets/migrations/0001_initial.py` - Auto-generated

## RUNNING THE PROJECT

```bash
cd backend
python manage.py runserver

# In another terminal
cd frontend
npm install
npm run dev
```

## TROUBLESHOOTING

**"No module named 'tickets'"**
- Make sure you added 'tickets' to INSTALLED_APPS in settings.py
- Run migrations again: `python manage.py migrate`

**"Ticket matching query does not exist"**
- Create a test ticket first using the POST endpoint
- Check that you're using the correct ticket ID

**"User has no attribute 'ticket_as_customer'"**
- You may have created the Ticket model before creating User
- Delete migrations and regenerate them

## SUPPORT

Refer to:
- PHASES_5_14_IMPLEMENTATION_GUIDE.md for full details
- Django REST Framework docs for ViewSet options
- Django docs for Model field types

Happy coding! 🚀
