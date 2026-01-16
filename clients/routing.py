"""
WebSocket URL routing for clients app
"""
from django.urls import re_path
from . import consumers

# Import ChutneX consumers
from chutney.consumers import TorEventsConsumer, TorAnalyticsConsumer

websocket_urlpatterns = [
    re_path(r'ws/clients/$', consumers.ClientUpdateConsumer.as_asgi()),
    re_path(r'ws/clients/(?P<client_slug>[\w-]+)/$', consumers.ClientDetailConsumer.as_asgi()),
    # Dashboard uses same consumer for now
    re_path(r'ws/dashboard/$', consumers.ClientUpdateConsumer.as_asgi()),
    
    # ChutneX Analytics WebSocket routes
    re_path(r'ws/chutnex/(?P<network_id>[0-9a-f-]+)/events/$', TorEventsConsumer.as_asgi()),
    re_path(r'ws/chutnex/(?P<network_id>[0-9a-f-]+)/analytics/$', TorAnalyticsConsumer.as_asgi()),
]