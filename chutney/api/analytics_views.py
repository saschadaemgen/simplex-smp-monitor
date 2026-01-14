"""
SimpleX SMP Monitor - Analytics API Views
=========================================
Copyright (c) 2025 cannatoshi

REST API endpoints for live analytics from Tor Control Port.

Endpoints:
- NetworkAnalyticsView: Complete analytics for a network
- NetworkBandwidthView: Aggregated bandwidth statistics
- NetworkBandwidthNodesView: Per-node bandwidth list
- NetworkCircuitsView: All circuits in the network
- NetworkConsensusView: Consensus from Directory Authority
- NodeStatsView: Live stats for a single node
- NodeBandwidthView: Bandwidth for a single node
- NodeCircuitsView: Circuits from a single node

Integrates with:
- TorControlService for stem communication
- Django REST Framework for API
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from ..models import TorNetwork, TorNode
from ..services import get_tor_control_service


def get_network_or_error(pk):
    """Helper: Gets network or returns error response."""
    try:
        network = TorNetwork.objects.get(pk=pk)
        return network, None
    except TorNetwork.DoesNotExist:
        return None, Response(
            {'error': 'Network not found'},
            status=status.HTTP_404_NOT_FOUND
        )


def get_node_or_error(pk):
    """Helper: Gets node or returns error response."""
    try:
        node = TorNode.objects.get(pk=pk)
        return node, None
    except TorNode.DoesNotExist:
        return None, Response(
            {'error': 'Node not found'},
            status=status.HTTP_404_NOT_FOUND
        )


def check_network_running(network):
    """Helper: Checks if network is running."""
    if network.status != 'running':
        return Response(
            {'error': 'Network is not running', 'status': network.status},
            status=status.HTTP_400_BAD_REQUEST
        )
    return None


def get_nodes_as_dicts(network):
    """Helper: Converts network nodes to dicts for TorControlService."""
    nodes = network.nodes.all()
    return [
        {
            'id': str(node.id),
            'name': node.name,
            'node_type': node.node_type,
            'container_name': node.container_name,
            'control_port': node.control_port,
        }
        for node in nodes
        if node.container_name and node.control_port
    ]


@method_decorator(csrf_exempt, name='dispatch')
class NetworkAnalyticsView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/analytics/
    
    Main endpoint: Returns all analytics for a network.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, pk):
        network, error = get_network_or_error(pk)
        if error:
            return error
        
        running_error = check_network_running(network)
        if running_error:
            return running_error
        
        try:
            service = get_tor_control_service()
            nodes = get_nodes_as_dicts(network)
            analytics = service.get_network_analytics(network, nodes)
            return Response(analytics)
        except Exception as e:
            return Response(
                {'error': f'Failed to get analytics: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


@method_decorator(csrf_exempt, name='dispatch')
class NetworkBandwidthView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/bandwidth/
    
    Aggregated bandwidth statistics for the entire network.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, pk):
        network, error = get_network_or_error(pk)
        if error:
            return error
        
        running_error = check_network_running(network)
        if running_error:
            return running_error
        
        try:
            service = get_tor_control_service()
            nodes = get_nodes_as_dicts(network)
            bandwidth = service.get_network_bandwidth(nodes)
            return Response(bandwidth)
        except Exception as e:
            return Response(
                {'error': f'Failed to get bandwidth: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


@method_decorator(csrf_exempt, name='dispatch')
class NetworkBandwidthNodesView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/bandwidth/nodes/
    
    Bandwidth per node as list.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, pk):
        network, error = get_network_or_error(pk)
        if error:
            return error
        
        running_error = check_network_running(network)
        if running_error:
            return running_error
        
        try:
            service = get_tor_control_service()
            nodes = get_nodes_as_dicts(network)
            
            result = []
            for node in nodes:
                stats = service.get_node_bandwidth(
                    node['container_name'],
                    node['control_port']
                )
                if stats:
                    result.append({
                        'node_id': node['id'],
                        'node_name': node['name'],
                        'node_type': node['node_type'],
                        **stats
                    })
            
            return Response({
                'network_id': str(network.id),
                'nodes': result,
                'count': len(result),
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to get node bandwidth: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


@method_decorator(csrf_exempt, name='dispatch')
class NetworkCircuitsView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/circuits/
    
    All circuits in the network.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, pk):
        network, error = get_network_or_error(pk)
        if error:
            return error
        
        running_error = check_network_running(network)
        if running_error:
            return running_error
        
        try:
            service = get_tor_control_service()
            nodes = get_nodes_as_dicts(network)
            circuits = service.get_network_circuits(nodes)
            return Response(circuits)
        except Exception as e:
            return Response(
                {'error': f'Failed to get circuits: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


@method_decorator(csrf_exempt, name='dispatch')
class NetworkConsensusView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/consensus/
    
    Consensus information from first reachable DA.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, pk):
        network, error = get_network_or_error(pk)
        if error:
            return error
        
        running_error = check_network_running(network)
        if running_error:
            return running_error
        
        try:
            service = get_tor_control_service()
            
            da_nodes = network.nodes.filter(node_type='da')
            consensus = None
            
            for da in da_nodes:
                if da.container_name and da.control_port:
                    consensus = service.get_consensus_info(
                        da.container_name,
                        da.control_port
                    )
                    if consensus:
                        break
            
            if not consensus:
                return Response(
                    {'error': 'No DA reachable for consensus'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            
            return Response(consensus)
        except Exception as e:
            return Response(
                {'error': f'Failed to get consensus: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


@method_decorator(csrf_exempt, name='dispatch')
class NodeStatsView(APIView):
    """
    GET /api/v1/chutney/nodes/{id}/stats/
    
    Live stats for a single node.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, pk):
        node, error = get_node_or_error(pk)
        if error:
            return error
        
        network = node.network
        running_error = check_network_running(network)
        if running_error:
            return running_error
        
        if not node.container_name or not node.control_port:
            return Response(
                {'error': 'Node has no container configuration'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = get_tor_control_service()
            info = service.get_node_info(node.container_name, node.control_port)
            
            if not info:
                return Response(
                    {'error': 'Could not connect to node'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            
            return Response({
                'node_id': str(node.id),
                'node_name': node.name,
                'node_type': node.node_type,
                **info
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to get node stats: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


@method_decorator(csrf_exempt, name='dispatch')
class NodeBandwidthView(APIView):
    """
    GET /api/v1/chutney/nodes/{id}/live-bandwidth/
    
    Live bandwidth for a single node.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, pk):
        node, error = get_node_or_error(pk)
        if error:
            return error
        
        network = node.network
        running_error = check_network_running(network)
        if running_error:
            return running_error
        
        if not node.container_name or not node.control_port:
            return Response(
                {'error': 'Node has no container configuration'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = get_tor_control_service()
            stats = service.get_node_bandwidth(node.container_name, node.control_port)
            
            if not stats:
                return Response(
                    {'error': 'Could not connect to node'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            
            return Response({
                'node_id': str(node.id),
                'node_name': node.name,
                'node_type': node.node_type,
                **stats
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to get node bandwidth: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


@method_decorator(csrf_exempt, name='dispatch')
class NodeCircuitsView(APIView):
    """
    GET /api/v1/chutney/nodes/{id}/circuits/
    
    All circuits from a specific node.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, pk):
        node, error = get_node_or_error(pk)
        if error:
            return error
        
        network = node.network
        running_error = check_network_running(network)
        if running_error:
            return running_error
        
        if not node.container_name or not node.control_port:
            return Response(
                {'error': 'Node has no container configuration'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            service = get_tor_control_service()
            circuits = service.get_node_circuits(node.container_name, node.control_port)
            
            if circuits is None:
                return Response(
                    {'error': 'Could not connect to node'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            
            return Response({
                'node_id': str(node.id),
                'node_name': node.name,
                'node_type': node.node_type,
                'circuits': circuits,
                'count': len(circuits),
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to get node circuits: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )