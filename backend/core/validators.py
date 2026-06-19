"""
API Input Validators - Phase 11 Security
Validates and sanitizes API request data
"""

from rest_framework import serializers
from django.core.exceptions import ValidationError
import re


class SafeCharacterValidator:
    """Ensure string contains only safe characters"""
    
    def __init__(self, allowed_chars=None, message=None):
        self.allowed_chars = allowed_chars or r'^[a-zA-Z0-9_\s\-\.@]+$'
        self.message = message or 'This field contains invalid characters'

    def __call__(self, value):
        if not isinstance(value, str):
            raise ValidationError('Value must be a string')
        
        if not re.match(self.allowed_chars, value):
            raise ValidationError(self.message)


class EmailValidator:
    """Validate email addresses"""
    
    def __call__(self, value):
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, value):
            raise ValidationError('Enter a valid email address')


class PasswordValidator:
    """Validate password strength"""
    
    def __init__(self, min_length=8, require_uppercase=True, require_digit=True, require_special=True):
        self.min_length = min_length
        self.require_uppercase = require_uppercase
        self.require_digit = require_digit
        self.require_special = require_special

    def __call__(self, value):
        errors = []
        
        if len(value) < self.min_length:
            errors.append(f'Password must be at least {self.min_length} characters long')
        
        if self.require_uppercase and not any(c.isupper() for c in value):
            errors.append('Password must contain at least one uppercase letter')
        
        if self.require_digit and not any(c.isdigit() for c in value):
            errors.append('Password must contain at least one digit')
        
        if self.require_special and not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in value):
            errors.append('Password must contain at least one special character')
        
        if errors:
            raise ValidationError(errors)


class URLValidator:
    """Validate URLs"""
    
    def __call__(self, value):
        pattern = r'^https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&/=]*)$'
        if not re.match(pattern, value):
            raise ValidationError('Enter a valid URL')


class PhoneValidator:
    """Validate phone numbers"""
    
    def __call__(self, value):
        pattern = r'^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$'
        if not re.match(pattern, value):
            raise ValidationError('Enter a valid phone number')


class InputSanitizer:
    """Sanitize user input"""
    
    @staticmethod
    def sanitize_text(value, max_length=1000, allow_html=False):
        """Sanitize text input"""
        if not isinstance(value, str):
            raise ValidationError('Value must be a string')
        
        if len(value) > max_length:
            raise ValidationError(f'Text exceeds maximum length of {max_length}')
        
        if not allow_html:
            # Remove HTML tags
            value = re.sub(r'<[^>]+>', '', value)
            # Escape dangerous characters
            dangerous_chars = {'<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;'}
            for char, replacement in dangerous_chars.items():
                value = value.replace(char, replacement)
        
        return value.strip()
    
    @staticmethod
    def sanitize_filename(filename):
        """Sanitize filename for safe storage"""
        # Keep only alphanumeric, dots, hyphens, underscores
        filename = re.sub(r'[^\w\s\-\.]', '', filename)
        # Replace spaces with underscores
        filename = re.sub(r'\s+', '_', filename)
        # Remove leading/trailing dots and hyphens
        filename = re.sub(r'^[\.-]+|[\.-]+$', '', filename)
        return filename
    
    @staticmethod
    def sanitize_sql(value):
        """Basic SQL injection prevention (use ORM primarily)"""
        dangerous_keywords = ['union', 'select', 'insert', 'update', 'delete', 'drop', 'truncate']
        value_lower = value.lower()
        
        for keyword in dangerous_keywords:
            if f' {keyword} ' in f' {value_lower} ':
                raise ValidationError(f'Invalid input: contains SQL keywords')
        
        return value


class ValidatedSerializer(serializers.Serializer):
    """Base serializer with built-in validators"""
    
    def validate_email(self, value):
        """Validate email field"""
        validator = EmailValidator()
        validator(value)
        return value
    
    def validate_password(self, value):
        """Validate password field"""
        validator = PasswordValidator()
        validator(value)
        return value
    
    def validate_url(self, value):
        """Validate URL field"""
        validator = URLValidator()
        validator(value)
        return value
