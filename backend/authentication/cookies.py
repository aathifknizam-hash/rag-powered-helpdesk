"""HttpOnly cookie helpers for JWT authentication."""

from django.conf import settings


def _cookie_params(max_age: int) -> dict:
    return {
        'httponly': True,
        'secure': getattr(settings, 'JWT_COOKIE_SECURE', not settings.DEBUG),
        'samesite': getattr(settings, 'JWT_COOKIE_SAMESITE', 'Lax'),
        'max_age': max_age,
        'path': getattr(settings, 'JWT_COOKIE_PATH', '/'),
    }


def set_auth_cookies(response, access_token: str, refresh_token: str) -> None:
    """Attach access and refresh JWTs as HttpOnly cookies."""
    access_max_age = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
    refresh_max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())

    response.set_cookie(
        settings.JWT_COOKIE_ACCESS_NAME,
        access_token,
        **_cookie_params(access_max_age),
    )
    response.set_cookie(
        settings.JWT_COOKIE_REFRESH_NAME,
        refresh_token,
        **_cookie_params(refresh_max_age),
    )


def clear_auth_cookies(response) -> None:
    """Remove authentication cookies."""
    response.delete_cookie(
        settings.JWT_COOKIE_ACCESS_NAME,
        path=getattr(settings, 'JWT_COOKIE_PATH', '/'),
        samesite=getattr(settings, 'JWT_COOKIE_SAMESITE', 'Lax'),
    )
    response.delete_cookie(
        settings.JWT_COOKIE_REFRESH_NAME,
        path=getattr(settings, 'JWT_COOKIE_PATH', '/'),
        samesite=getattr(settings, 'JWT_COOKIE_SAMESITE', 'Lax'),
    )
