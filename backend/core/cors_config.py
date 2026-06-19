"""
CORS Configuration - Phase 11 Security
Refined cross-origin resource sharing policies
"""

# CORS allowed origins for different environments
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    # Production origins would go here
    # "https://example.com",
]

# CORS allowed origin regexes for pattern matching
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.example\.com$",  # Production subdomains
]

# CORS allowed methods
CORS_ALLOWED_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

# CORS exposed headers
CORS_EXPOSE_HEADERS = [
    "Content-Type",
    "X-CSRFToken",
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
]

# CORS allowed headers
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# CORS configuration options
CORS_ALLOW_CREDENTIALS = True
CORS_MAX_AGE = 3600

# Development-specific CORS
DEBUG_CORS_LOCALHOST = True
