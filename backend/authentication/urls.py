from django.urls import path

from .views import (
    CSRFTokenView,
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    LogoutView,
    ProfileView,
    RegisterView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", CookieTokenObtainPairView.as_view(), name="login"),
    path("refresh/", CookieTokenRefreshView.as_view(), name="refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("csrf/", CSRFTokenView.as_view(), name="csrf"),
    path("me/", ProfileView.as_view(), name="profile"),
]
