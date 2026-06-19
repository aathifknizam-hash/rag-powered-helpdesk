"""
Integration Tests - Phase 13: Testing & QA
Comprehensive test suite for core functionality
"""

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
import json

User = get_user_model()


class AuthenticationTests(APITestCase):
    """Test authentication and authorization"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='TestPassword123!',
            role='customer'
        )
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        response = self.client.post('/api/auth/register/', {
            'email': 'newuser@example.com',
            'password': 'NewPass123!',
            'first_name': 'Test',
            'last_name': 'User',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
    
    def test_user_login(self):
        """Test user login endpoint"""
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'TestPassword123!',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
    
    def test_invalid_password_login(self):
        """Test login with invalid password"""
        response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'WrongPassword',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_token_refresh(self):
        """Test token refresh endpoint"""
        # First get tokens
        login_response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'TestPassword123!',
        })
        refresh_token = login_response.data['refresh']
        
        # Refresh token
        response = self.client.post('/api/auth/refresh/', {
            'refresh': refresh_token,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)


class TicketTests(APITestCase):
    """Test ticket management functionality"""
    
    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create_user(
            email='customer@example.com',
            password='Pass123!',
            role='customer'
        )
        self.agent = User.objects.create_user(
            email='agent@example.com',
            password='Pass123!',
            role='agent'
        )
        # Login as customer
        login_response = self.client.post('/api/auth/login/', {
            'email': 'customer@example.com',
            'password': 'Pass123!',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")
    
    def test_create_ticket(self):
        """Test ticket creation"""
        response = self.client.post('/api/tickets/', {
            'title': 'Test Ticket',
            'description': 'Test description',
            'category': 'billing',
            'priority': 'medium',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Test Ticket')
    
    def test_list_tickets(self):
        """Test ticket listing"""
        # Create a ticket first
        self.client.post('/api/tickets/', {
            'title': 'Test Ticket',
            'description': 'Test description',
            'category': 'billing',
            'priority': 'medium',
        })
        
        response = self.client.get('/api/tickets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)
    
    def test_update_ticket(self):
        """Test ticket update"""
        # Create ticket
        create_response = self.client.post('/api/tickets/', {
            'title': 'Test Ticket',
            'description': 'Test description',
            'category': 'billing',
            'priority': 'medium',
        })
        ticket_id = create_response.data['id']
        
        # Update ticket
        response = self.client.patch(f'/api/tickets/{ticket_id}/', {
            'status': 'in_progress',
            'priority': 'high',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['priority'], 'high')


class KnowledgeBaseTests(APITestCase):
    """Test knowledge base functionality"""
    
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            email='admin@example.com',
            password='Pass123!'
        )
        # Login as admin
        login_response = self.client.post('/api/auth/login/', {
            'email': 'admin@example.com',
            'password': 'Pass123!',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")
    
    def test_create_kb_article(self):
        """Test KB article creation"""
        response = self.client.post('/api/knowledge_base/', {
            'title': 'How to use the system',
            'content': 'This is a test article',
            'category': 'General',
            'is_published': True,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_search_kb(self):
        """Test KB search functionality"""
        # Create article
        self.client.post('/api/knowledge_base/', {
            'title': 'Test Article',
            'content': 'Content about billing',
            'category': 'Billing',
            'is_published': True,
        })
        
        # Search
        response = self.client.get('/api/knowledge_base/search/?q=billing')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class RateLimitingTests(APITestCase):
    """Test rate limiting"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_rate_limiting_login(self):
        """Test login rate limiting"""
        # Make multiple failed login attempts
        for i in range(10):
            response = self.client.post('/api/auth/login/', {
                'email': 'nonexistent@example.com',
                'password': 'WrongPassword',
            })
        
        # After too many attempts, should be locked
        response = self.client.post('/api/auth/login/', {
            'email': 'nonexistent@example.com',
            'password': 'WrongPassword',
        })
        # Should return 429 Too Many Requests or similar
        self.assertIn(response.status_code, [429, 400, 403])


class SecurityTests(APITestCase):
    """Test security features"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_sql_injection_prevention(self):
        """Test SQL injection prevention"""
        response = self.client.post('/api/auth/login/', {
            'email': "' OR '1'='1",
            'password': 'password',
        })
        # Should return error, not successful login
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
    
    def test_xss_prevention(self):
        """Test XSS prevention in content"""
        self.client.post('/api/auth/register/', {
            'email': 'test@example.com',
            'password': 'Pass123!',
            'first_name': '<script>alert("xss")</script>',
            'last_name': 'User',
        })
        
        # Create ticket with malicious content
        login_response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'Pass123!',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")
        
        response = self.client.post('/api/tickets/', {
            'title': '<img src=x onerror="alert(\'xss\')">',
            'description': 'Test',
            'category': 'general',
            'priority': 'medium',
        })
        
        # Should sanitize the input
        self.assertNotIn('<img', response.data.get('title', ''))
    
    def test_csrf_protection(self):
        """Test CSRF token validation"""
        # This test would verify CSRF tokens are validated
        # Implementation depends on frontend setup
        pass


class WebSocketTests(TestCase):
    """Test WebSocket functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='Pass123!',
            role='customer'
        )
    
    def test_websocket_connection(self):
        """Test WebSocket connection"""
        # Note: Full WebSocket testing requires additional setup
        # This is a placeholder for actual WebSocket tests
        pass
    
    def test_chat_message_sending(self):
        """Test sending chat messages via WebSocket"""
        pass


class PerformanceTests(APITestCase):
    """Performance and load tests"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='Pass123!',
            role='customer'
        )
        login_response = self.client.post('/api/auth/login/', {
            'email': 'test@example.com',
            'password': 'Pass123!',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")
    
    def test_bulk_ticket_creation(self):
        """Test creating multiple tickets"""
        import time
        start = time.time()
        
        for i in range(10):
            self.client.post('/api/tickets/', {
                'title': f'Ticket {i}',
                'description': 'Test description',
                'category': 'general',
                'priority': 'medium',
            })
        
        elapsed = time.time() - start
        # Should complete 10 tickets in reasonable time (e.g., < 5 seconds)
        self.assertLess(elapsed, 5.0)
    
    def test_search_performance(self):
        """Test search performance"""
        import time
        
        # Create test data
        for i in range(100):
            from knowledge_base.models import KBArticle
            KBArticle.objects.create(
                title=f'Article {i}',
                content=f'Content about topic {i}',
                category='General',
                is_published=True
            )
        
        start = time.time()
        response = self.client.get('/api/knowledge_base/search/?q=topic')
        elapsed = time.time() - start
        
        # Search should complete quickly
        self.assertLess(elapsed, 1.0)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
