"""Cookie-based JWT authentication integration tests."""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@override_settings(
    JWT_COOKIE_SECURE=False,
    JWT_COOKIE_SAMESITE='Lax',
)
class CookieAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='cookie-test@example.com',
            password='SecurePass123!',
            first_name='Cookie',
            last_name='Test',
            role='customer',
        )

    def test_login_sets_httponly_cookies(self):
        response = self.client.post(
            '/api/auth/login/',
            {'email': 'cookie-test@example.com', 'password': 'SecurePass123!'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('user', response.data)
        self.assertNotIn('access', response.data)
        self.assertNotIn('refresh', response.data)
        self.assertIn('access_token', response.cookies)
        self.assertIn('refresh_token', response.cookies)
        self.assertTrue(response.cookies['access_token']['httponly'])
        self.assertTrue(response.cookies['refresh_token']['httponly'])

    def test_me_with_cookie_session(self):
        login = self.client.post(
            '/api/auth/login/',
            {'email': 'cookie-test@example.com', 'password': 'SecurePass123!'},
            format='json',
        )
        self.client.cookies = login.cookies
        me = self.client.get('/api/auth/me/')
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(me.data['email'], 'cookie-test@example.com')

    def test_refresh_rotates_cookies(self):
        login = self.client.post(
            '/api/auth/login/',
            {'email': 'cookie-test@example.com', 'password': 'SecurePass123!'},
            format='json',
        )
        self.client.cookies = login.cookies
        old_refresh = login.cookies['refresh_token'].value
        refresh = self.client.post('/api/auth/refresh/', format='json')
        self.assertEqual(refresh.status_code, status.HTTP_200_OK)
        new_refresh = refresh.cookies['refresh_token'].value
        self.assertNotEqual(old_refresh, new_refresh)

    def test_logout_clears_and_blacklists(self):
        login = self.client.post(
            '/api/auth/login/',
            {'email': 'cookie-test@example.com', 'password': 'SecurePass123!'},
            format='json',
        )
        self.client.cookies = login.cookies
        logout = self.client.post('/api/auth/logout/', format='json')
        self.assertEqual(logout.status_code, status.HTTP_200_OK)
        me = self.client.get('/api/auth/me/')
        self.assertEqual(me.status_code, status.HTTP_401_UNAUTHORIZED)
