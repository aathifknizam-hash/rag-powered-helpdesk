"""
WebSocket Consumers for Real-time Messaging
Handles live chat, typing indicators, and notifications
"""

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from tickets.models import Ticket, TicketMessage

User = get_user_model()
logger = logging.getLogger(__name__)


class TicketChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time ticket chat
    Handles:
    - Live messages between agents and customers
    - Typing indicators
    - Message read/delivery status
    - Online presence
    """

    async def connect(self):
        """Accept WebSocket connection for ticket chat"""
        self.ticket_id = self.scope['url_route']['kwargs']['ticket_id']
        self.user = self.scope['user']
        self.room_group_name = f'ticket_{self.ticket_id}_chat'
        self.user_type = 'agent' if self.user.role in ['agent', 'admin'] else 'customer'

        # Verify user has access to this ticket
        has_access = await self.verify_ticket_access()
        if not has_access:
            await self.close()
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Mark user as online
        await self.mark_user_online()

        # Broadcast user joined message
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'user_id': self.user.id,
                'user_name': self.user.get_full_name() or self.user.email,
                'user_type': self.user_type,
                'timestamp': str(__import__('django.utils.timezone', fromlist=['now']).now()),
            }
        )

        await self.accept()

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Mark user as offline
        await self.mark_user_offline()

        # Broadcast user left message
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_left',
                'user_id': self.user.id,
                'user_name': self.user.get_full_name() or self.user.email,
                'timestamp': str(__import__('django.utils.timezone', fromlist=['now']).now()),
            }
        )

        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Receive message from WebSocket"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'chat_message':
                await self.handle_chat_message(data)
            elif message_type == 'typing':
                await self.handle_typing(data)
            elif message_type == 'mark_read':
                await self.handle_mark_read(data)
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
        except json.JSONDecodeError:
            logger.error('Invalid JSON received from WebSocket')
            await self.send_error('Invalid message format')

    # ==================== Message Handlers ====================

    async def handle_chat_message(self, data):
        """Handle incoming chat message"""
        content = data.get('message', '').strip()
        is_internal = data.get('is_internal', False)

        if not content:
            await self.send_error('Message cannot be empty')
            return

        # Verify agent can mark as internal
        if is_internal and self.user_type != 'agent':
            await self.send_error('Only agents can send internal notes')
            return

        # Save message to database
        message = await self.save_message(content, is_internal)
        if not message:
            await self.send_error('Failed to save message')
            return

        # Broadcast message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message_id': message.id,
                'content': message.content,
                'sender_id': self.user.id,
                'sender_name': self.user.get_full_name() or self.user.email,
                'sender_type': self.user_type,
                'is_internal': message.is_internal,
                'timestamp': message.created_at.isoformat(),
                'is_read': False,
            }
        )

        # Send confirmation to sender
        await self.send(text_data=json.dumps({
            'type': 'message_sent',
            'message_id': message.id,
        }))

    async def handle_typing(self, data):
        """Handle typing indicator"""
        is_typing = data.get('is_typing', False)

        # Broadcast typing status (don't save to DB)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'user_id': self.user.id,
                'user_name': self.user.get_full_name() or self.user.email,
                'is_typing': is_typing,
            }
        )

    async def handle_mark_read(self, data):
        """Mark messages as read"""
        message_ids = data.get('message_ids', [])
        if not message_ids:
            return

        await self.mark_messages_read(message_ids)

        # Broadcast read status
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'messages_read',
                'message_ids': message_ids,
                'user_id': self.user.id,
            }
        )

    # ==================== Group Receive Handlers ====================

    async def chat_message(self, event):
        """Receive chat message from group"""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message_id': event['message_id'],
            'content': event['content'],
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'sender_type': event['sender_type'],
            'is_internal': event['is_internal'],
            'timestamp': event['timestamp'],
        }))

    async def typing_indicator(self, event):
        """Receive typing indicator"""
        # Don't send typing indicator to the person typing
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'typing_indicator',
                'user_id': event['user_id'],
                'user_name': event['user_name'],
                'is_typing': event['is_typing'],
            }))

    async def messages_read(self, event):
        """Receive message read notification"""
        await self.send(text_data=json.dumps({
            'type': 'messages_read',
            'message_ids': event['message_ids'],
            'user_id': event['user_id'],
        }))

    async def user_joined(self, event):
        """Receive user joined notification"""
        # Don't broadcast to self
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_joined',
                'user_id': event['user_id'],
                'user_name': event['user_name'],
                'user_type': event['user_type'],
                'timestamp': event['timestamp'],
            }))

    async def user_left(self, event):
        """Receive user left notification"""
        await self.send(text_data=json.dumps({
            'type': 'user_left',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
            'timestamp': event['timestamp'],
        }))

    # ==================== Database Operations ====================

    @database_sync_to_async
    def verify_ticket_access(self):
        """Verify user has access to this ticket"""
        try:
            ticket = Ticket.objects.get(id=self.ticket_id)

            # Check if user is customer who created ticket
            if self.user_type == 'customer':
                return ticket.customer == self.user

            if self.user_type == 'agent':
                return ticket.agent == self.user or self.user.role == 'admin'

            return False
        except Ticket.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, content, is_internal):
        """Save message to database"""
        try:
            ticket = Ticket.objects.get(id=self.ticket_id)
            message = TicketMessage.objects.create(
                ticket=ticket,
                author=self.user,
                content=content,
                is_internal=is_internal
            )
            return message
        except Exception as e:
            logger.error(f'Error saving message: {e}')
            return None

    @database_sync_to_async
    def mark_messages_read(self, message_ids):
        """Mark messages as read (implement if needed in your model)"""
        try:
            TicketMessage.objects.filter(id__in=message_ids).update(is_read=True)
        except Exception as e:
            logger.error(f'Error marking messages read: {e}')

    @database_sync_to_async
    def mark_user_online(self):
        """Mark user as online (optional: track in cache or DB)"""
        # Could implement user presence tracking here
        pass

    @database_sync_to_async
    def mark_user_offline(self):
        """Mark user as offline"""
        # Could implement user presence tracking here
        pass

    # ==================== Error Handlers ====================

    async def send_error(self, message):
        """Send error message to client"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message,
        }))


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications
    Handles:
    - Toast notifications
    - System alerts
    - Real-time updates
    """

    async def connect(self):
        """Accept WebSocket connection for notifications"""
        self.user = self.scope['user']
        if not self.user.is_authenticated:
            await self.close()
            return

        self.user_group_name = f'user_{self.user.id}_notifications'

        # Join user notification group
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        await self.channel_layer.group_discard(
            self.user_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Receive from WebSocket"""
        try:
            data = json.loads(text_data)
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
        except json.JSONDecodeError:
            pass

    async def notify(self, event):
        """Send notification to user"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'title': event.get('title'),
            'message': event.get('message'),
            'notification_type': event.get('notification_type', 'info'),
            'timestamp': event.get('timestamp'),
        }))

    async def ticket_update(self, event):
        """Send ticket update notification"""
        await self.send(text_data=json.dumps({
            'type': 'ticket_update',
            'ticket_id': event['ticket_id'],
            'action': event['action'],
            'timestamp': event['timestamp'],
        }))
