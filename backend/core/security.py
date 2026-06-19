"""
Security Middleware - Phase 11 Security Hardening
Implements OWASP protections and security headers
"""

from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponse
import logging
from functools import wraps
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(MiddlewareMixin):
    """Add security headers to all responses"""

    def process_response(self, request, response):
        # Content Security Policy
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' ws: wss:; "
            "frame-ancestors 'none'; "
            "base-uri 'self';"
        )
        
        # X-Frame-Options: prevent clickjacking
        response['X-Frame-Options'] = 'DENY'
        
        # X-Content-Type-Options: prevent MIME sniffing
        response['X-Content-Type-Options'] = 'nosniff'
        
        # X-XSS-Protection: legacy XSS protection
        response['X-XSS-Protection'] = '1; mode=block'
        
        # Referrer-Policy: control referrer information
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions-Policy: disable potentially dangerous features
        response['Permissions-Policy'] = (
            'accelerometer=(), camera=(), geolocation=(), '
            'gyroscope=(), magnetometer=(), microphone=(), '
            'payment=(), usb=()'
        )
        
        # HSTS: enforce HTTPS (production only)
        # response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        return response


class InputValidationMiddleware(MiddlewareMixin):
    """Validate and sanitize input"""

    DANGEROUS_PATTERNS = [
        '<script',
        'javascript:',
        'onerror=',
        'onload=',
        'onclick=',
    ]

    def process_request(self, request):
        # Check for suspicious patterns in query string
        if request.GET:
            query_string = request.GET.urlencode().lower()
            for pattern in self.DANGEROUS_PATTERNS:
                if pattern in query_string:
                    logger.warning(f'Dangerous pattern detected in query: {pattern}')
                    return HttpResponse('Invalid request', status=400)
        
        return None


class SQLInjectionProtectionMiddleware(MiddlewareMixin):
    """Detect potential SQL injection attempts"""

    SQL_KEYWORDS = ['union', 'select', 'insert', 'update', 'delete', 'drop', 'create']

    def process_request(self, request):
        # Check request body for SQL keywords
        if request.method in ['POST', 'PATCH', 'PUT']:
            try:
                body = request.body.decode('utf-8').lower()
                if any(keyword in body for keyword in self.SQL_KEYWORDS):
                    # Log but allow (Django ORM prevents actual SQL injection)
                    logger.debug('SQL keyword detected in request body')
            except:
                pass
        
        return None


class RateLimitingMiddleware(MiddlewareMixin):
    """Track requests per IP for rate limiting"""

    def __init__(self, get_response):
        self.get_response = get_response
        self.request_counts = {}
        super().__init__(get_response)

    def get_client_ip(self, request):
        """Get client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def process_request(self, request):
        # This is a simple in-memory approach
        # For production, use Redis or django-ratelimit
        ip = self.get_client_ip(request)
        
        if ip in self.request_counts:
            count, timestamp = self.request_counts[ip]
            import time
            # Reset count every 60 seconds
            if time.time() - timestamp > 60:
                self.request_counts[ip] = (1, time.time())
            else:
                count += 1
                # Limit to 300 requests per minute
                if count > 300:
                    logger.warning(f'Rate limit exceeded for IP: {ip}')
                    return HttpResponse('Rate limit exceeded', status=429)
                self.request_counts[ip] = (count, timestamp)
        else:
            import time
            self.request_counts[ip] = (1, time.time())
        
        return None


def validate_request_data(schema):
    """Decorator to validate request data against schema"""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Validate schema if provided
            if hasattr(request, 'data') and schema:
                for field, validators in schema.items():
                    if field in request.data:
                        value = request.data[field]
                        for validator in validators:
                            validator(value)
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def sanitize_string(value, max_length=1000):
    """Sanitize string input"""
    if not isinstance(value, str):
        raise ValidationError('Value must be a string')
    
    if len(value) > max_length:
        raise ValidationError(f'Value exceeds maximum length of {max_length}')
    
    # Remove potentially dangerous characters
    dangerous_chars = ['<', '>', '"', "'", '&', ';']
    for char in dangerous_chars:
        if char in value:
            value = value.replace(char, '')
    
    return value.strip()


def validate_email(value):
    """Validate email format"""
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, value):
        raise ValidationError('Invalid email format')


def validate_password(value):
    """Validate password strength"""
    if len(value) < 8:
        raise ValidationError('Password must be at least 8 characters')
    
    if not any(c.isupper() for c in value):
        raise ValidationError('Password must contain uppercase letter')
    
    if not any(c.isdigit() for c in value):
        raise ValidationError('Password must contain digit')
    
    if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in value):
        raise ValidationError('Password must contain special character')
