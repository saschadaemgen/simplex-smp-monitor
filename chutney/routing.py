"""
ChutneX Analytics - WebSocket Routing
=====================================
Copyright (c) 2026 cannatoshi

WebSocket URL patterns for real-time Tor monitoring.

URLs:
    /ws/chutnex/<network_id>/events/    - Raw event stream
    /ws/chutnex/<network_id>/analytics/ - Aggregated analytics
"""

from django.urls import path, re_path

from .consumers import TorEventConsumer, AnalyticsConsumer


websocket_urlpatterns = [
    # Real-time event stream (raw events from stem)
    path(
        'ws/chutnex/<uuid:network_id>/events/',
        TorEventConsumer.as_asgi(),
        name='chutnex-events'
    ),
    
    # Analytics dashboard (aggregated data)
    path(
        'ws/chutnex/<uuid:network_id>/analytics/',
        AnalyticsConsumer.as_asgi(),
        name='chutnex-analytics'
    ),
]