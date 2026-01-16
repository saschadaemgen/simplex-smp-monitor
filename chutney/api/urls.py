"""
Chutney API URL Configuration (EXTENDED)
=========================================
Copyright (c) 2026 cannatoshi

Complete REST API endpoints with ALL model fields exposed.
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
    NetworkCapturesView,
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
    
    # Network-level analytics (ALL fields)
    path(
        'networks/<uuid:pk>/analytics/',
        NetworkAnalyticsView.as_view(),
        name='network-analytics'
    ),
    # Alias for frontend compatibility
    path(
        'networks/<uuid:pk>/analytics/overview/',
        NetworkAnalyticsView.as_view(),
        name='network-analytics-overview'
    ),
    
    # Bandwidth
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
    
    # Circuits
    path(
        'networks/<uuid:pk>/circuits/',
        NetworkCircuitsView.as_view(),
        name='network-circuits'
    ),
    
    # Consensus
    path(
        'networks/<uuid:pk>/consensus/',
        NetworkConsensusView.as_view(),
        name='network-consensus'
    ),
    
    # Nodes (ALL fields)
    path(
        'networks/<uuid:pk>/nodes/',
        NetworkNodesView.as_view(),
        name='network-nodes'
    ),
    
    # Traffic Captures (NEW - ALL TrafficCapture fields)
    path(
        'networks/<uuid:pk>/captures/',
        NetworkCapturesView.as_view(),
        name='network-captures'
    ),
    
    # Alerts
    path(
        'networks/<uuid:pk>/alerts/',
        NetworkAlertsView.as_view(),
        name='network-alerts'
    ),
    
    # ==========================================================================
    # Node-level analytics
    # ==========================================================================
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