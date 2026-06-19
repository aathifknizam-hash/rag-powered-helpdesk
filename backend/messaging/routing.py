"""
WebSocket URL Routing for Real-time Communication
Routes WebSocket connections to appropriate consumers
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Ticket chat WebSocket
    re_path(
        r'ws/tickets/(?P<ticket_id>\w+)/chat/$',
        consumers.TicketChatConsumer.as_asgi()
    ),

    # Notifications WebSocket
    re_path(
        r'ws/notifications/$',
        consumers.NotificationConsumer.as_asgi()
    ),
]
