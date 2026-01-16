"""
Chutney API URL Configuration

REST API Endpunkte:
- /api/v1/chutney/networks/
- /api/v1/chutney/nodes/
- /api/v1/chutney/captures/
- /api/v1/chutney/events/

Analytics Endpunkte (NEU):
- /api/v1/chutney/networks/{id}/analytics/
- /api/v1/chutney/networks/{id}/analytics/overview/  <-- NEU für Frontend
- /api/v1/chutney/networks/{id}/bandwidth/
- /api/v1/chutney/networks/{id}/bandwidth/nodes/
- /api/v1/chutney/networks/{id}/circuits/
- /api/v1/chutney/networks/{id}/consensus/
- /api/v1/chutney/networks/{id}/nodes/
- /api/v1/chutney/networks/{id}/alerts/
- /api/v1/chutney/nodes/{id}/stats/
- /api/v1/chutney/nodes/{id}/live-bandwidth/
- /api/v1/chutney/nodes/{id}/circuits/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    TorNetworkViewSet,
    TorNodeViewSet,
    TrafficCaptureViewSet,
    CircuitEventViewSet,
)

from .analytics_views import (
    NetworkAnalyticsView,
    NetworkBandwidthView,
    NetworkBandwidthNodesView,
    NetworkCircuitsView,
    NetworkConsensusView,
    NetworkNodesView,
    NetworkAlertsView,
    NodeStatsView,
    NodeBandwidthView,
    NodeCircuitsView,
)

router = DefaultRouter()
router.register(r'networks', TorNetworkViewSet, basename='tornetwork')
router.register(r'nodes', TorNodeViewSet, basename='tornode')
router.register(r'captures', TrafficCaptureViewSet, basename='trafficcapture')
router.register(r'events', CircuitEventViewSet, basename='circuitevent')

urlpatterns = [
    # Router URLs (CRUD)
    path('', include(router.urls)),
    
    # ==========================================================================
    # Analytics URLs (Live Data via Tor Control Port)
    # ==========================================================================
    
    # Network-level analytics
    path(
        'networks/<uuid:pk>/analytics/',
        NetworkAnalyticsView.as_view(),
        name='network-analytics'
    ),
    # Frontend calls /analytics/overview/ - same view, different URL
    path(
        'networks/<uuid:pk>/analytics/overview/',
        NetworkAnalyticsView.as_view(),
        name='network-analytics-overview'
    ),
    path(
        'networks/<uuid:pk>/bandwidth/',
        NetworkBandwidthView.as_view(),
        name='network-bandwidth'
    ),
    path(
        'networks/<uuid:pk>/bandwidth/nodes/',
        NetworkBandwidthNodesView.as_view(),
        name='network-bandwidth-nodes'
    ),
    path(
        'networks/<uuid:pk>/circuits/',
        NetworkCircuitsView.as_view(),
        name='network-circuits'
    ),
    path(
        'networks/<uuid:pk>/consensus/',
        NetworkConsensusView.as_view(),
        name='network-consensus'
    ),
    path(
        'networks/<uuid:pk>/nodes/',
        NetworkNodesView.as_view(),
        name='network-nodes'
    ),
    path(
        'networks/<uuid:pk>/alerts/',
        NetworkAlertsView.as_view(),
        name='network-alerts'
    ),
    
    # Node-level analytics
    path(
        'nodes/<uuid:pk>/stats/',
        NodeStatsView.as_view(),
        name='node-stats'
    ),
    path(
        'nodes/<uuid:pk>/live-bandwidth/',
        NodeBandwidthView.as_view(),
        name='node-live-bandwidth'
    ),
    path(
        'nodes/<uuid:pk>/circuits/',
        NodeCircuitsView.as_view(),
        name='node-circuits'
    ),
]