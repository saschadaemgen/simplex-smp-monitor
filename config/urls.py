"""
SimpleX SMP Monitor - URL Configuration
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
import time

from core.spa import serve_react_spa


def health_check(request):
    return JsonResponse({"status": "healthy", "timestamp": time.time()})


urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # Health Check
    path('api/health/', health_check, name='health_check'),
    
    # REST API v1
    path('api/v1/', include('servers.api.urls')),
    path('api/v1/', include('stresstests.api.urls')),
    path('api/v1/', include('events.api.urls')),
    path('api/v1/', include('clients.api.urls')),
    path('api/v1/dashboard/', include('dashboard.api.urls')),
    
    # Docker Manager API
    path('api/v1/docker/', include('docker_manager.api.urls')),
    
    # Music Player API
    path('', include('music_player.urls')),
    
    # Legacy clients URLs
    path('clients/', include('clients.urls')),

    # Chutney API
    path('api/v1/chutney/', include('chutney.api.urls')),
    path('api/chutney/', include('chutney.api.urls')),
]

# Media files - BEFORE SPA catch-all!
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# SPA catch-all - MUST BE LAST!
urlpatterns += [
    re_path(r'^.*$', serve_react_spa, name='spa'),
]
