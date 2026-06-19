from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .cookies import clear_auth_cookies, set_auth_cookies
from .models import User
from .serializers import RegisterSerializer, UserSerializer
from .tokens import CustomTokenObtainPairSerializer, CustomTokenObtainPairView


class CookieTokenObtainPairView(CustomTokenObtainPairView):
    """Login: issue JWTs in HttpOnly cookies; return user profile only."""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            access = response.data.pop('access', None)
            refresh = response.data.pop('refresh', None)
            if access and refresh:
                set_auth_cookies(response, access, refresh)
        return response


class CookieTokenRefreshView(APIView):
    """Refresh access token using refresh_token cookie with rotation."""

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(settings.JWT_COOKIE_REFRESH_NAME)
        if not refresh_token:
            response = Response(
                {'detail': 'Refresh token not found.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_auth_cookies(response)
            return response

        serializer = TokenRefreshSerializer(data={'refresh': refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, ValidationError):
            response = Response(
                {'detail': 'Invalid or expired refresh token.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_auth_cookies(response)
            return response

        access = serializer.validated_data['access']
        refresh = serializer.validated_data.get('refresh', refresh_token)
        response = Response({'detail': 'Token refreshed successfully.'})
        set_auth_cookies(response, access, refresh)
        return response


class LogoutView(APIView):
    """Blacklist refresh token and clear auth cookies."""

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(settings.JWT_COOKIE_REFRESH_NAME)
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass

        response = Response({'detail': 'Successfully logged out.'})
        clear_auth_cookies(response)
        return response


class CSRFTokenView(APIView):
    """Ensure CSRF cookie is set for unsafe cross-origin requests."""

    permission_classes = [AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response({'detail': 'CSRF cookie set.'})


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = CustomTokenObtainPairSerializer.get_token(user)
        access = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response(
            {'user': UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )
        set_auth_cookies(response, access, refresh_token)
        return response


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
