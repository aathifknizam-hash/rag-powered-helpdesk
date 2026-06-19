"""
Authentication Security - Phase 11 Security Hardening
Secure password management and token handling
"""

from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from datetime import timedelta
import logging
import os
import secrets

logger = logging.getLogger(__name__)


class PasswordManager:
    """Secure password management"""
    
    MIN_LENGTH = 12
    REQUIRE_UPPERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = True
    
    @staticmethod
    def validate_password_strength(password):
        """Validate password meets security requirements"""
        errors = []
        
        if len(password) < PasswordManager.MIN_LENGTH:
            errors.append(f'Password must be at least {PasswordManager.MIN_LENGTH} characters')
        
        if PasswordManager.REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            errors.append('Password must contain uppercase letter')
        
        if PasswordManager.REQUIRE_DIGIT and not any(c.isdigit() for c in password):
            errors.append('Password must contain digit')
        
        if PasswordManager.REQUIRE_SPECIAL:
            special_chars = '!@#$%^&*()_+-=[]{}|;:,.<>?'
            if not any(c in special_chars for c in password):
                errors.append('Password must contain special character')
        
        return errors
    
    @staticmethod
    def hash_password(password):
        """Hash password securely"""
        return make_password(password)
    
    @staticmethod
    def verify_password(password, hash):
        """Verify password against hash"""
        return check_password(password, hash)
    
    @staticmethod
    def generate_temporary_password(length=16):
        """Generate secure temporary password"""
        return secrets.token_urlsafe(length)


class TokenManager:
    """Secure JWT token management"""
    
    TOKEN_EXPIRY_MINUTES = 15  # Access token
    REFRESH_TOKEN_EXPIRY_DAYS = 7
    
    @staticmethod
    def validate_token_expiry(token_exp):
        """Validate token hasn't expired"""
        from datetime import datetime
        now = datetime.utcnow()
        return datetime.fromtimestamp(token_exp) > now
    
    @staticmethod
    def should_refresh_token(issued_at):
        """Check if token should be refreshed"""
        from datetime import datetime
        now = datetime.utcnow()
        token_age = (now - datetime.fromtimestamp(issued_at)).total_seconds() / 3600
        return token_age > 1  # Refresh if older than 1 hour


class AccountLockout:
    """Handle account lockout after failed login attempts"""
    
    MAX_ATTEMPTS = 5
    LOCKOUT_DURATION_MINUTES = 15
    
    @staticmethod
    def get_lockout_key(username):
        """Get cache key for lockout tracking"""
        return f"lockout:{username}"
    
    @staticmethod
    def get_attempt_count(cache, username):
        """Get current failed attempt count"""
        from django.core.cache import cache
        key = AccountLockout.get_lockout_key(username)
        return cache.get(key, 0)
    
    @staticmethod
    def increment_attempt(username):
        """Increment failed login attempts"""
        from django.core.cache import cache
        key = AccountLockout.get_lockout_key(username)
        attempts = cache.get(key, 0)
        cache.set(key, attempts + 1, AccountLockout.LOCKOUT_DURATION_MINUTES * 60)
        return attempts + 1
    
    @staticmethod
    def is_locked(username):
        """Check if account is locked"""
        from django.core.cache import cache
        return AccountLockout.get_attempt_count(cache, username) >= AccountLockout.MAX_ATTEMPTS
    
    @staticmethod
    def reset_attempts(username):
        """Reset failed attempt counter"""
        from django.core.cache import cache
        key = AccountLockout.get_lockout_key(username)
        cache.delete(key)


class AuditLogger:
    """Security audit logging"""
    
    @staticmethod
    def log_login(user, ip_address, success=True):
        """Log login attempt"""
        action = 'LOGIN_SUCCESS' if success else 'LOGIN_FAILED'
        from audit_logs.models import AuditLog
        AuditLog.objects.create(
            user=user if success else None,
            action=action,
            details={
                'ip_address': ip_address,
                'username': user.email if user else None,
            }
        )
    
    @staticmethod
    def log_permission_denied(user, ip_address, resource):
        """Log permission denied"""
        from audit_logs.models import AuditLog
        AuditLog.objects.create(
            user=user,
            action='PERMISSION_DENIED',
            details={
                'ip_address': ip_address,
                'resource': resource,
            }
        )
    
    @staticmethod
    def log_data_access(user, resource, action='READ'):
        """Log sensitive data access"""
        from audit_logs.models import AuditLog
        AuditLog.objects.create(
            user=user,
            action=f'DATA_{action}',
            details={
                'resource': resource,
                'timestamp': timezone.now().isoformat(),
            }
        )
    
    @staticmethod
    def log_configuration_change(user, setting, old_value, new_value):
        """Log system configuration changes"""
        from audit_logs.models import AuditLog
        AuditLog.objects.create(
            user=user,
            action='CONFIG_CHANGED',
            details={
                'setting': setting,
                'old_value': str(old_value),
                'new_value': str(new_value),
            }
        )


class EncryptionManager:
    """Handle sensitive data encryption"""
    
    @staticmethod
    def encrypt_sensitive_data(data, key=None):
        """Encrypt sensitive information"""
        from cryptography.fernet import Fernet
        
        if key is None:
            key = os.getenv('ENCRYPTION_KEY', Fernet.generate_key())
        
        cipher = Fernet(key)
        encrypted = cipher.encrypt(data.encode())
        return encrypted.decode()
    
    @staticmethod
    def decrypt_sensitive_data(encrypted_data, key=None):
        """Decrypt sensitive information"""
        from cryptography.fernet import Fernet
        
        if key is None:
            key = os.getenv('ENCRYPTION_KEY')
        
        if key is None:
            raise ValueError('ENCRYPTION_KEY not configured')
        
        cipher = Fernet(key)
        decrypted = cipher.decrypt(encrypted_data.encode())
        return decrypted.decode()
