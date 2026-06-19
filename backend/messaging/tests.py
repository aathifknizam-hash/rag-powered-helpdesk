from django.test import TestCase
from channels.testing import WebsocketCommunicator
from channels.layers import get_channel_layer
from authentication.models import User
from tickets.models import Ticket
from .consumers import TicketChatConsumer, NotificationConsumer


class TicketChatConsumerTest(TestCase):
    """Tests for TicketChatConsumer"""

    async def test_connect_with_valid_ticket(self):
        """Test connecting to a valid ticket chat"""
        # Create test users and ticket
        customer = await self._create_user('customer@test.com', 'customer')
        agent = await self._create_user('agent@test.com', 'agent')
        ticket = await self._create_ticket(customer)

        # Connect as agent
        communicator = WebsocketCommunicator(
            TicketChatConsumer.as_asgi(),
            f"/ws/tickets/{ticket.id}/chat/",
            headers=[(b'user', str(agent.id).encode())]
        )

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        await communicator.disconnect()

    async def _create_user(self, email, role):
        """Helper to create test user"""
        return User.objects.create_user(
            email=email,
            password='testpass123',
            role=role
        )

    async def _create_ticket(self, creator):
        """Helper to create test ticket"""
        return Ticket.objects.create(
            ticket_number=f'TKT-{Ticket.objects.count() + 1}',
            subject='Test ticket',
            description='Test description',
            created_by=creator,
            status='new'
        )
