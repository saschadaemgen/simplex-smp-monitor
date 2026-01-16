"""
ChutneX Analytics - REST API Views
===================================
Copyright (c) 2026 cannatoshi

REST API for ChutneX Analytics with direct stem connection to Tor Control Ports.
"""
import logging
from typing import Optional, Dict, Any, List

from django.utils import timezone
from django.http import Http404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

# Correct model imports
from chutney.models import TorNetwork, TorNode, CircuitEvent

# Stem for direct Tor control
try:
    from stem.control import Controller
    from stem import CircStatus
    STEM_AVAILABLE = True
except ImportError:
    STEM_AVAILABLE = False
    Controller = None

logger = logging.getLogger(__name__)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_network_or_404(network_id):
    """Get network by ID or raise 404."""
    try:
        return TorNetwork.objects.get(id=network_id)
    except TorNetwork.DoesNotExist:
        raise Http404(f"Network {network_id} not found")


def get_node_or_404(node_id):
    """Get node by ID or raise 404."""
    try:
        return TorNode.objects.get(id=node_id)
    except TorNode.DoesNotExist:
        raise Http404(f"Node {node_id} not found")


# Default Control Port Password (from tor_control.py)
TOR_CONTROL_PASSWORD = "chutnex2025"


def connect_to_node(control_port: int, password: str = None) -> Optional[Controller]:
    """
    Connect to a Tor node's control port.
    Returns Controller or None if connection fails.
    """
    if not STEM_AVAILABLE:
        return None
    
    # Use default password if none provided
    if password is None:
        password = TOR_CONTROL_PASSWORD
    
    try:
        controller = Controller.from_port(port=control_port)
        controller.authenticate(password=password)
        return controller
    except Exception as e:
        logger.debug(f"Could not connect to control port {control_port}: {e}")
        return None


def get_node_live_stats(node: TorNode) -> Dict[str, Any]:
    """Get live stats from a single node via stem."""
    stats = {
        'id': str(node.id),
        'name': node.name,
        'node_type': node.node_type,
        'status': 'offline',
        'control_port': node.control_port,
        'bytes_read': 0,
        'bytes_written': 0,
        'circuits': [],
        'version': None,
        'fingerprint': None,
        'bootstrap_progress': 0,
    }
    
    if not node.control_port:
        return stats
    
    controller = connect_to_node(node.control_port)
    if not controller:
        return stats
    
    try:
        # Basic info
        stats['status'] = 'running'
        stats['version'] = str(controller.get_version())
        
        # Fingerprint
        try:
            stats['fingerprint'] = controller.get_info('fingerprint', None)
        except:
            pass
        
        # Bootstrap progress
        try:
            bootstrap_status = controller.get_info('status/bootstrap-phase')
            if 'PROGRESS=' in bootstrap_status:
                progress = bootstrap_status.split('PROGRESS=')[1].split()[0]
                stats['bootstrap_progress'] = int(progress)
        except:
            stats['bootstrap_progress'] = 100  # Assume complete if can't get
        
        # Bandwidth
        try:
            bw_read = controller.get_info('traffic/read', '0')
            bw_written = controller.get_info('traffic/written', '0')
            stats['bytes_read'] = int(bw_read)
            stats['bytes_written'] = int(bw_written)
        except:
            pass
        
        # Circuits
        try:
            for circ in controller.get_circuits():
                stats['circuits'].append({
                    'id': circ.id,
                    'status': str(circ.status),
                    'purpose': str(circ.purpose) if circ.purpose else None,
                    'path': [entry[0][:8] + '...' for entry in circ.path] if circ.path else [],
                })
        except:
            pass
        
    except Exception as e:
        logger.error(f"Error getting stats from {node.name}: {e}")
    finally:
        try:
            controller.close()
        except:
            pass
    
    return stats


def get_all_nodes_stats(network: TorNetwork) -> List[Dict[str, Any]]:
    """Get live stats from all nodes in a network."""
    nodes = TorNode.objects.filter(network=network)
    return [get_node_live_stats(node) for node in nodes]


# ============================================================================
# API VIEWS
# ============================================================================

class NetworkAnalyticsView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/analytics/
    
    Returns comprehensive network analytics overview.
    """
    
    def get(self, request, pk=None):
        network = get_network_or_404(pk)
        nodes_stats = get_all_nodes_stats(network)
        
        # Aggregate stats
        running_nodes = [n for n in nodes_stats if n['status'] == 'running']
        total_bytes_read = sum(n['bytes_read'] for n in nodes_stats)
        total_bytes_written = sum(n['bytes_written'] for n in nodes_stats)
        total_circuits = sum(len(n['circuits']) for n in nodes_stats)
        active_circuits = sum(
            len([c for c in n['circuits'] if c['status'] == 'BUILT'])
            for n in nodes_stats
        )
        
        # Count by type
        nodes_by_type = {}
        for node in nodes_stats:
            node_type = node['node_type']
            nodes_by_type[node_type] = nodes_by_type.get(node_type, 0) + 1
        
        # Determine overall status
        if len(running_nodes) == len(nodes_stats) and len(nodes_stats) > 0:
            overall_status = 'running'
        elif len(running_nodes) > 0:
            overall_status = 'partial'
        else:
            overall_status = network.status
        
        # Average bootstrap progress
        bootstrap_values = [n['bootstrap_progress'] for n in running_nodes]
        avg_bootstrap = sum(bootstrap_values) / len(bootstrap_values) if bootstrap_values else 0
        
        return Response({
            'network': {
                'id': str(network.id),
                'name': network.name,
                'status': overall_status,
                'bootstrap_progress': int(avg_bootstrap),
                'consensus_valid': len(running_nodes) >= 3,  # At least 3 DAs needed
            },
            'nodes': {
                'total': len(nodes_stats),
                'running': len(running_nodes),
                'by_type': nodes_by_type,
            },
            'traffic': {
                'bytes_read': total_bytes_read,
                'bytes_written': total_bytes_written,
            },
            'circuits': {
                'total': total_circuits,
                'active': active_circuits,
            },
            'source': 'live' if running_nodes else 'database',
            'timestamp': timezone.now().isoformat(),
        })


class NetworkBandwidthView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/bandwidth/
    
    Returns aggregated bandwidth data for the network.
    """
    
    def get(self, request, pk=None):
        network = get_network_or_404(pk)
        nodes_stats = get_all_nodes_stats(network)
        
        total_read = sum(n['bytes_read'] for n in nodes_stats)
        total_written = sum(n['bytes_written'] for n in nodes_stats)
        
        return Response({
            'totals': {
                'bytes_read': total_read,
                'bytes_written': total_written,
                'total': total_read + total_written,
            },
            'history': [],  # Would need InfluxDB for historical data
            'source': 'live',
            'timestamp': timezone.now().isoformat(),
        })


class NetworkBandwidthNodesView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/bandwidth/nodes/
    
    Returns per-node bandwidth data.
    """
    
    def get(self, request, pk=None):
        network = get_network_or_404(pk)
        nodes_stats = get_all_nodes_stats(network)
        
        nodes_bandwidth = []
        for node in nodes_stats:
            nodes_bandwidth.append({
                'node_id': node['id'],
                'node_name': node['name'],
                'node_type': node['node_type'],
                'bytes_read': node['bytes_read'],
                'bytes_written': node['bytes_written'],
                'status': node['status'],
            })
        
        return Response({
            'nodes': nodes_bandwidth,
            'count': len(nodes_bandwidth),
            'source': 'live',
            'timestamp': timezone.now().isoformat(),
        })


class NetworkCircuitsView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/circuits/
    
    Returns circuit information for the network.
    """
    
    def get(self, request, pk=None):
        network = get_network_or_404(pk)
        circuit_status = request.query_params.get('status')
        limit = int(request.query_params.get('limit', 100))
        
        nodes_stats = get_all_nodes_stats(network)
        
        circuits = []
        for node in nodes_stats:
            for circ in node['circuits']:
                if circuit_status and circ['status'] != circuit_status:
                    continue
                circ['source_node'] = node['name']
                circ['source_node_id'] = node['id']
                circuits.append(circ)
        
        # Deduplicate by circuit ID (same circuit appears on multiple nodes)
        seen_ids = set()
        unique_circuits = []
        for circ in circuits:
            if circ['id'] not in seen_ids:
                seen_ids.add(circ['id'])
                unique_circuits.append(circ)
        
        return Response({
            'circuits': unique_circuits[:limit],
            'total': len(unique_circuits),
            'source': 'live',
            'timestamp': timezone.now().isoformat(),
        })


class NetworkConsensusView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/consensus/
    
    Returns consensus status and validity information.
    """
    
    def get(self, request, pk=None):
        network = get_network_or_404(pk)
        
        # Get DA nodes
        da_nodes = TorNode.objects.filter(network=network, node_type='da')
        da_stats = [get_node_live_stats(node) for node in da_nodes]
        
        running_das = [n for n in da_stats if n['status'] == 'running']
        
        # Try to get consensus info from first running DA
        consensus_data = {
            'is_valid': len(running_das) >= 2,  # Need majority
            'authorities_total': len(da_stats),
            'authorities_running': len(running_das),
            'required_authorities': (len(da_stats) // 2) + 1,
            'relay_count': 0,
            'bandwidth_weights': {},
        }
        
        # Get relay count from consensus
        for da in da_stats:
            if da['status'] == 'running' and da['control_port']:
                controller = connect_to_node(da['control_port'])
                if controller:
                    try:
                        # Get network status
                        consensus = controller.get_network_statuses()
                        consensus_data['relay_count'] = len(list(consensus))
                    except:
                        pass
                    finally:
                        try:
                            controller.close()
                        except:
                            pass
                    break
        
        return Response({
            'consensus': consensus_data,
            'authorities': [
                {
                    'name': da['name'],
                    'status': da['status'],
                    'fingerprint': da['fingerprint'],
                }
                for da in da_stats
            ],
            'source': 'live',
            'timestamp': timezone.now().isoformat(),
        })


class NodeStatsView(APIView):
    """
    GET /api/v1/chutney/nodes/{id}/stats/
    
    Returns detailed stats for a single node.
    """
    
    def get(self, request, pk=None):
        node = get_node_or_404(pk)
        stats = get_node_live_stats(node)
        
        return Response({
            'node': stats,
            'source': 'live' if stats['status'] == 'running' else 'database',
            'timestamp': timezone.now().isoformat(),
        })


class NodeBandwidthView(APIView):
    """
    GET /api/v1/chutney/nodes/{id}/live-bandwidth/
    
    Returns live bandwidth data for a single node.
    """
    
    def get(self, request, pk=None):
        node = get_node_or_404(pk)
        stats = get_node_live_stats(node)
        
        return Response({
            'bandwidth': {
                'bytes_read': stats['bytes_read'],
                'bytes_written': stats['bytes_written'],
            },
            'source': 'live' if stats['status'] == 'running' else 'database',
            'timestamp': timezone.now().isoformat(),
        })


class NodeCircuitsView(APIView):
    """
    GET /api/v1/chutney/nodes/{id}/circuits/
    
    Returns circuits passing through a specific node.
    """
    
    def get(self, request, pk=None):
        node = get_node_or_404(pk)
        stats = get_node_live_stats(node)
        
        return Response({
            'circuits': stats['circuits'],
            'count': len(stats['circuits']),
            'source': 'live' if stats['status'] == 'running' else 'database',
            'timestamp': timezone.now().isoformat(),
        })


class NetworkNodesView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/nodes/
    
    Returns all nodes with their live status.
    """
    
    def get(self, request, pk=None):
        network = get_network_or_404(pk)
        node_type = request.query_params.get('type')
        
        nodes = TorNode.objects.filter(network=network)
        if node_type:
            nodes = nodes.filter(node_type=node_type)
        
        nodes_data = []
        for node in nodes:
            stats = get_node_live_stats(node)
            nodes_data.append({
                'id': str(node.id),
                'name': node.name,
                'node_type': node.node_type,
                'status': stats['status'],
                'control_port': node.control_port,
                'or_port': node.or_port,
                'dir_port': getattr(node, 'dir_port', None),
                'socks_port': getattr(node, 'socks_port', None),
                'bytes_read': stats['bytes_read'],
                'bytes_written': stats['bytes_written'],
                'circuit_count': len(stats['circuits']),
                'bootstrap_progress': stats['bootstrap_progress'],
                'fingerprint': stats['fingerprint'],
                'version': stats['version'],
            })
        
        return Response({
            'nodes': nodes_data,
            'count': len(nodes_data),
            'source': 'live',
            'timestamp': timezone.now().isoformat(),
        })


class NetworkAlertsView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/alerts/
    
    Returns alerts and warnings for the network.
    """
    
    def get(self, request, pk=None):
        network = get_network_or_404(pk)
        nodes_stats = get_all_nodes_stats(network)
        
        alerts = []
        
        # Check for offline nodes
        offline_nodes = [n for n in nodes_stats if n['status'] == 'offline']
        for node in offline_nodes:
            alerts.append({
                'level': 'error',
                'type': 'node_offline',
                'message': f"Node {node['name']} is offline",
                'node_id': node['id'],
                'timestamp': timezone.now().isoformat(),
            })
        
        # Check for low bootstrap progress
        for node in nodes_stats:
            if node['status'] == 'running' and node['bootstrap_progress'] < 100:
                alerts.append({
                    'level': 'warning',
                    'type': 'bootstrap_incomplete',
                    'message': f"Node {node['name']} bootstrap at {node['bootstrap_progress']}%",
                    'node_id': node['id'],
                    'timestamp': timezone.now().isoformat(),
                })
        
        # Check DA count
        da_nodes = [n for n in nodes_stats if n['node_type'] == 'da']
        running_das = [n for n in da_nodes if n['status'] == 'running']
        if len(running_das) < 2:
            alerts.append({
                'level': 'critical',
                'type': 'consensus_risk',
                'message': f"Only {len(running_das)} Directory Authorities running - consensus at risk!",
                'timestamp': timezone.now().isoformat(),
            })
        
        return Response({
            'alerts': alerts,
            'count': len(alerts),
            'timestamp': timezone.now().isoformat(),
        })