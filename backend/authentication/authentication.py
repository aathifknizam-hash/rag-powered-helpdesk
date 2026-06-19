"""JWT authentication that reads access tokens from HttpOnly cookies."""

from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class CookieJWTAuthentication(JWTAuthentication):
    """
    Authenticate using Authorization header (optional) or access_token cookie.
    Header takes precedence for API tooling; cookies are used by the SPA.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
        else:
            raw_token = request.COOKIES.get(settings.JWT_COOKIE_ACCESS_NAME)

        if raw_token is None:
            return None

        if isinstance(raw_token, bytes):
            raw_token = raw_token.decode('utf-8')

        try:
            validated_token = self.get_validated_token(raw_token)
        except TokenError as exc:
            raise InvalidToken(exc.args[0]) from exc

        return self.get_user(validated_token), validated_token
