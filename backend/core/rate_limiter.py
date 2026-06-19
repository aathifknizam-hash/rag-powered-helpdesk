"""
Rate Limiting Utilities - Phase 11 Security
Uses Django cache for efficient rate limiting
"""

from django.core.cache import cache
from rest_framework.exceptions import Throttled
from datetime import datetime, timedelta
import hashlib


class RateLimiter:
    """Centralized rate limiting manager"""
    
    def __init__(self, limit=100, window=3600):
        """
        limit: Number of requests allowed
        window: Time window in seconds (default 1 hour)
        """
        self.limit = limit
        self.window = window
    
    def get_client_identifier(self, request):
        """Get unique identifier for client"""
        user = request.user
        if user and user.is_authenticated:
            return f"user_{user.id}"
        
        # Fallback to IP address
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        
        return f"ip_{hashlib.md5(ip.encode()).hexdigest()}"
    
    def is_allowed(self, request, key_suffix=''):
        """Check if request is allowed"""
        identifier = self.get_client_identifier(request)
        cache_key = f"rate_limit:{identifier}:{key_suffix}"
        
        request_count = cache.get(cache_key, 0)
        
        if request_count >= self.limit:
            return False
        
        cache.set(cache_key, request_count + 1, self.window)
        return True
    
    def get_remaining(self, request, key_suffix=''):
        """Get remaining requests"""
        identifier = self.get_client_identifier(request)
        cache_key = f"rate_limit:{identifier}:{key_suffix}"
        
        request_count = cache.get(cache_key, 0)
        return max(0, self.limit - request_count)


class APIRateLimiter(RateLimiter):
    """Rate limiter for API endpoints (default 100/hour)"""
    def __init__(self):
        super().__init__(limit=100, window=3600)


class AuthenticationRateLimiter(RateLimiter):
    """Rate limiter for auth endpoints (max 5 attempts/15 minutes)"""
    def __init__(self):
        super().__init__(limit=5, window=900)


class SearchRateLimiter(RateLimiter):
    """Rate limiter for search operations (max 30/minute)"""
    def __init__(self):
        super().__init__(limit=30, window=60)


def rate_limit_decorator(limiter=None):
    """Decorator for rate limiting view functions"""
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            if limiter is None:
                _limiter = APIRateLimiter()
            else:
                _limiter = limiter
            
            if not _limiter.is_allowed(request):
                raise Throttled(detail='Rate limit exceeded')
            
            response = view_func(request, *args, **kwargs)
            
            # Add rate limit headers
            remaining = _limiter.get_remaining(request)
            response['X-RateLimit-Limit'] = str(_limiter.limit)
            response['X-RateLimit-Remaining'] = str(remaining)
            response['X-RateLimit-Reset'] = str(int((datetime.now() + timedelta(seconds=_limiter.window)).timestamp()))
            
            return response
        return wrapper
    return decorator


# Predefined limiters for common endpoints
api_limiter = APIRateLimiter()
auth_limiter = AuthenticationRateLimiter()
search_limiter = SearchRateLimiter()
