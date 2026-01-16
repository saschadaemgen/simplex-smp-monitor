"""
ChutneX Analytics - REST API Views (EXTENDED)
==============================================
Copyright (c) 2026 cannatoshi

REST API for ChutneX Analytics with ALL model fields exposed.
Provides comprehensive data for forensic analysis dashboard.

Field Coverage:
- TorNetwork: 38 fields (100%)
- TorNode: 34 fields (100%)
- TrafficCapture: 24 fields (100%)
- CircuitEvent: 16 fields (100%)
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from django.utils import timezone
from django.http import Http404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

# Model imports
from chutney.models import TorNetwork, TorNode, TrafficCapture, CircuitEvent

# Stem for direct Tor control
try:
    from stem.control import Controller
    from stem import CircStatus
    STEM_AVAILABLE = True
except ImportError:
    STEM_AVAILABLE = False
    Controller = None

logger = logging.getLogger(__name__)

# Default Control Port Password
TOR_CONTROL_PASSWORD = "chutnex2025"


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


def connect_to_node(control_port: int, password: str = None) -> Optional[Controller]:
    """Connect to a Tor node's control port."""
    if not STEM_AVAILABLE:
        return None
    
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
    """Get live stats from a single node via stem - ALL fields."""
    stats = {
        # === IDENTIFICATION ===
        'id': str(node.id),
        'network_id': str(node.network_id),
        'name': node.name,
        'node_type': node.node_type,
        'index': node.index,
        
        # === DOCKER ===
        'container_id': node.container_id,
        'container_name': node.container_name,
        
        # === NETWORK CONFIG ===
        'control_port': node.control_port,
        'socks_port': node.socks_port,
        'or_port': node.or_port,
        'dir_port': node.dir_port,
        
        # === TOR IDENTITY ===
        'fingerprint': node.fingerprint,
        'v3_identity': node.v3_identity,
        'nickname': node.nickname,
        
        # === HIDDEN SERVICE ===
        'onion_address': node.onion_address,
        'hs_port': node.hs_port,
        'hs_target_port': node.hs_target_port,
        
        # === FLAGS ===
        'flags': node.flags or [],
        
        # === STATUS ===
        'status': 'offline',
        'status_message': node.status_message,
        'bootstrap_progress': node.bootstrap_progress,
        
        # === TRAFFIC CAPTURE ===
        'capture_enabled': node.capture_enabled,
        'capture_interface': node.capture_interface,
        'capture_file_path': node.capture_file_path,
        
        # === STATISTICS (from DB, updated by live) ===
        'bytes_read': node.bytes_read,
        'bytes_written': node.bytes_written,
        'circuits_created': node.circuits_created,
        'circuits_active': node.circuits_active,
        
        # === BANDWIDTH ===
        'bandwidth_rate': node.bandwidth_rate,
        'bandwidth_burst': node.bandwidth_burst,
        
        # === TIMESTAMPS ===
        'created_at': node.created_at.isoformat() if node.created_at else None,
        'updated_at': node.updated_at.isoformat() if node.updated_at else None,
        'started_at': node.started_at.isoformat() if node.started_at else None,
        'last_seen': node.last_seen.isoformat() if node.last_seen else None,
        
        # === LIVE DATA (populated below) ===
        'live_circuits': [],
        'version': None,
    }
    
    if not node.control_port:
        return stats
    
    controller = connect_to_node(node.control_port)
    if not controller:
        return stats
    
    try:
        stats['status'] = 'running'
        stats['version'] = str(controller.get_version())
        
        # Fingerprint (live)
        try:
            live_fp = controller.get_info('fingerprint', None)
            if live_fp:
                stats['fingerprint'] = live_fp
        except:
            pass
        
        # Bootstrap progress
        try:
            bootstrap_status = controller.get_info('status/bootstrap-phase')
            if 'PROGRESS=' in bootstrap_status:
                progress = bootstrap_status.split('PROGRESS=')[1].split()[0]
                stats['bootstrap_progress'] = int(progress)
        except:
            stats['bootstrap_progress'] = 100
        
        # Traffic stats (live)
        try:
            stats['bytes_read'] = int(controller.get_info('traffic/read', '0'))
            stats['bytes_written'] = int(controller.get_info('traffic/written', '0'))
        except:
            pass
        
        # Bandwidth rate
        try:
            # Get accounting info for rate
            accounting = controller.get_info('accounting/bytes', None)
            if accounting:
                parts = accounting.split()
                if len(parts) >= 2:
                    stats['bandwidth_rate'] = int(parts[0]) + int(parts[1])
        except:
            pass
        
        # Circuits (live)
        try:
            circuits = []
            for circ in controller.get_circuits():
                circuits.append({
                    'id': circ.id,
                    'status': str(circ.status),
                    'purpose': str(circ.purpose) if circ.purpose else None,
                    'path': [
                        {
                            'fingerprint': entry[0],
                            'nickname': entry[1] if len(entry) > 1 else entry[0][:8]
                        }
                        for entry in circ.path
                    ] if circ.path else [],
                    'build_flags': list(circ.build_flags) if circ.build_flags else [],
                    'created': circ.created.isoformat() if hasattr(circ, 'created') and circ.created else None,
                })
            stats['live_circuits'] = circuits
            stats['circuits_active'] = len([c for c in circuits if c['status'] == 'BUILT'])
        except Exception as e:
            logger.debug(f"Error getting circuits: {e}")
        
        # Relay flags from consensus
        try:
            ns = controller.get_network_status(stats['fingerprint'])
            if ns:
                stats['flags'] = list(ns.flags) if ns.flags else []
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
    nodes = TorNode.objects.filter(network=network).order_by('node_type', 'index')
    return [get_node_live_stats(node) for node in nodes]


def serialize_network(network: TorNetwork) -> Dict[str, Any]:
    """Serialize ALL TorNetwork fields."""
    return {
        # === IDENTIFICATION ===
        'id': str(network.id),
        'name': network.name,
        'slug': network.slug,
        'description': network.description,
        
        # === CONFIGURATION ===
        'template': network.template,
        'num_directory_authorities': network.num_directory_authorities,
        'num_guard_relays': network.num_guard_relays,
        'num_middle_relays': network.num_middle_relays,
        'num_exit_relays': network.num_exit_relays,
        'num_clients': network.num_clients,
        'num_hidden_services': network.num_hidden_services,
        
        # === DOCKER ===
        'docker_network_name': network.docker_network_name,
        'container_prefix': network.container_prefix,
        
        # === PORT RANGES ===
        'base_control_port': network.base_control_port,
        'base_socks_port': network.base_socks_port,
        'base_or_port': network.base_or_port,
        'base_dir_port': network.base_dir_port,
        
        # === TOR OPTIONS ===
        'testing_tor_network': network.testing_tor_network,
        'voting_interval': network.voting_interval,
        'assume_reachable': network.assume_reachable,
        
        # === TRAFFIC CAPTURE ===
        'capture_enabled': network.capture_enabled,
        'capture_filter': network.capture_filter,
        'max_capture_size_mb': network.max_capture_size_mb,
        'capture_rotate_interval': network.capture_rotate_interval,
        
        # === STATUS ===
        'status': network.status,
        'status_message': network.status_message,
        'bootstrap_progress': network.bootstrap_progress,
        
        # === CONSENSUS ===
        'consensus_valid': network.consensus_valid,
        'consensus_valid_after': network.consensus_valid_after.isoformat() if network.consensus_valid_after else None,
        'consensus_fresh_until': network.consensus_fresh_until.isoformat() if network.consensus_fresh_until else None,
        'consensus_valid_until': network.consensus_valid_until.isoformat() if network.consensus_valid_until else None,
        
        # === STATISTICS ===
        'total_circuits_created': network.total_circuits_created,
        'total_bytes_transferred': network.total_bytes_transferred,
        'total_cells_processed': network.total_cells_processed,
        
        # === TIMESTAMPS ===
        'created_at': network.created_at.isoformat() if network.created_at else None,
        'updated_at': network.updated_at.isoformat() if network.updated_at else None,
        'started_at': network.started_at.isoformat() if network.started_at else None,
        'stopped_at': network.stopped_at.isoformat() if network.stopped_at else None,
        
        # === COMPUTED ===
        'total_nodes': network.total_nodes,
        'is_running': network.is_running,
    }


def serialize_capture(capture: TrafficCapture) -> Dict[str, Any]:
    """Serialize ALL TrafficCapture fields."""
    return {
        # === IDENTIFICATION ===
        'id': str(capture.id),
        'node_id': str(capture.node_id),
        'node_name': capture.node.name if capture.node else None,
        'name': capture.name,
        
        # === CONFIGURATION ===
        'capture_type': capture.capture_type,
        'filter_expression': capture.filter_expression,
        'interface': capture.interface,
        
        # === FILE ===
        'file_path': capture.file_path,
        'file_size_bytes': capture.file_size_bytes,
        'file_size_mb': capture.file_size_mb,
        'file_hash_sha256': capture.file_hash_sha256,
        
        # === TIME PERIOD ===
        'started_at': capture.started_at.isoformat() if capture.started_at else None,
        'stopped_at': capture.stopped_at.isoformat() if capture.stopped_at else None,
        'duration_seconds': capture.duration_seconds,
        
        # === STATISTICS ===
        'packet_count': capture.packet_count,
        'bytes_captured': capture.bytes_captured,
        'packets_dropped': capture.packets_dropped,
        'packets_per_second': capture.packets_per_second,
        
        # === STATUS ===
        'status': capture.status,
        
        # === ANALYSIS ===
        'unique_flows': capture.unique_flows,
        'tor_cells_detected': capture.tor_cells_detected,
        'first_packet_time': capture.first_packet_time.isoformat() if capture.first_packet_time else None,
        'last_packet_time': capture.last_packet_time.isoformat() if capture.last_packet_time else None,
        'avg_inter_packet_delay_ms': capture.avg_inter_packet_delay_ms,
        'analysis_notes': capture.analysis_notes,
        
        # === RELATED ===
        'related_circuit_id': capture.related_circuit_id,
        
        # === TIMESTAMPS ===
        'created_at': capture.created_at.isoformat() if capture.created_at else None,
        'updated_at': capture.updated_at.isoformat() if capture.updated_at else None,
    }


def serialize_circuit_event(event: CircuitEvent) -> Dict[str, Any]:
    """Serialize ALL CircuitEvent fields."""
    return {
        # === IDENTIFICATION ===
        'id': str(event.id),
        'network_id': str(event.network_id),
        'circuit_id': event.circuit_id,
        
        # === EVENT ===
        'event_type': event.event_type,
        'purpose': event.purpose,
        
        # === PATH ===
        'path': event.path,
        'path_length': event.path_length,
        'path_display': event.path_display,
        
        # === STATUS ===
        'status': event.status,
        'reason': event.reason,
        'remote_reason': event.remote_reason,
        
        # === TIMING ===
        'event_time': event.event_time.isoformat() if event.event_time else None,
        'build_time_ms': event.build_time_ms,
        
        # === SOURCE ===
        'source_node_id': str(event.source_node_id) if event.source_node_id else None,
        'source_node_name': event.source_node.name if event.source_node else None,
        
        # === RAW ===
        'raw_event': event.raw_event,
        
        # === TIMESTAMP ===
        'created_at': event.created_at.isoformat() if event.created_at else None,
    }


# ============================================================================
# API VIEWS
# ============================================================================

class NetworkAnalyticsView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/analytics/
    
    Returns COMPREHENSIVE network analytics with ALL fields.
    """
    
    def get(self, request, pk=None):
        network = get_network_or_404(pk)
        nodes_stats = get_all_nodes_stats(network)
        
        # Aggregate stats
        running_nodes = [n for n in nodes_stats if n['status'] == 'running']
        total_bytes_read = sum(n['bytes_read'] for n in nodes_stats)
        total_bytes_written = sum(n['bytes_written'] for n in nodes_stats)
        
        # Count circuits from live data
        all_circuits = []
        for node in nodes_stats:
            all_circuits.extend(node.get('live_circuits', []))
        
        # Deduplicate circuits by ID
        seen_circuit_ids = set()
        unique_circuits = []
        for circ in all_circuits:
            if circ['id'] not in seen_circuit_ids:
                seen_circuit_ids.add(circ['id'])
                unique_circuits.append(circ)
        
        total_circuits = len(unique_circuits)
        active_circuits = len([c for c in unique_circuits if c['status'] == 'BUILT'])
        
        # Count by type
        nodes_by_type = {}
        for node in nodes_stats:
            node_type = node['node_type']
            if node_type not in nodes_by_type:
                nodes_by_type[node_type] = 0
            nodes_by_type[node_type] += 1
        
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
        
        # Count DAs for consensus validity
        running_das = len([n for n in running_nodes if n['node_type'] == 'da'])
        required_das = (network.num_directory_authorities // 2) + 1
        
        return Response({
            # === NETWORK (ALL fields) ===
            'network': serialize_network(network),
            
            # === LIVE STATUS ===
            'live_status': {
                'status': overall_status,
                'bootstrap_progress': int(avg_bootstrap),
                'consensus_valid': running_das >= required_das,
            },
            
            # === NODES SUMMARY ===
            'nodes': {
                'total': len(nodes_stats),
                'running': len(running_nodes),
                'offline': len(nodes_stats) - len(running_nodes),
                'by_type': nodes_by_type,
            },
            
            # === TRAFFIC ===
            'traffic': {
                'bytes_read': total_bytes_read,
                'bytes_written': total_bytes_written,
                'total': total_bytes_read + total_bytes_written,
            },
            
            # === CIRCUITS ===
            'circuits': {
                'total': total_circuits,
                'active': active_circuits,
                'by_status': {
                    'built': len([c for c in unique_circuits if c['status'] == 'BUILT']),
                    'launched': len([c for c in unique_circuits if c['status'] == 'LAUNCHED']),
                    'extended': len([c for c in unique_circuits if c['status'] == 'EXTENDED']),
                    'failed': len([c for c in unique_circuits if c['status'] == 'FAILED']),
                    'closed': len([c for c in unique_circuits if c['status'] == 'CLOSED']),
                },
                'by_purpose': {},  # TODO: Count by purpose
            },
            
            # === AUTHORITIES ===
            'authorities': {
                'total': network.num_directory_authorities,
                'running': running_das,
                'required': required_das,
                'voting': running_das >= required_das,
            },
            
            # === METADATA ===
            'source': 'live' if running_nodes else 'database',
            'timestamp': timezone.now().isoformat(),
        })


class NetworkBandwidthView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/bandwidth/
    
    Returns aggregated bandwidth data.
    """
    
    def get(self, request, pk=None):
        network = get_network_or_404(pk)
        nodes_stats = get_all_nodes_stats(network)
        
        total_read = sum(n['bytes_read'] for n in nodes_stats)
        total_written = sum(n['bytes_written'] for n in nodes_stats)
        
        # Per-node bandwidth
        nodes_bandwidth = []
        for node in nodes_stats:
            nodes_bandwidth.append({
                'node_id': node['id'],
                'node_name': node['name'],
                'node_type': node['node_type'],
                'status': node['status'],
                'bytes_read': node['bytes_read'],
                'bytes_written': node['bytes_written'],
                'bandwidth_rate': node['bandwidth_rate'],
                'bandwidth_burst': node['bandwidth_burst'],
            })
        
        # By type
        by_type = {}
        for node in nodes_stats:
            t = node['node_type']
            if t not in by_type:
                by_type[t] = {'bytes_read': 0, 'bytes_written': 0, 'count': 0}
            by_type[t]['bytes_read'] += node['bytes_read']
            by_type[t]['bytes_written'] += node['bytes_written']
            by_type[t]['count'] += 1
        
        return Response({
            'totals': {
                'bytes_read': total_read,
                'bytes_written': total_written,
                'total': total_read + total_written,
            },
            'by_type': by_type,
            'nodes': nodes_bandwidth,
            'history': [],  # Would need InfluxDB
            'source': 'live',
            'timestamp': timezone.now().isoformat(),
        })


class NetworkBandwidthNodesView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/bandwidth/nodes/
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
                'status': node['status'],
                'bytes_read': node['bytes_read'],
                'bytes_written': node['bytes_written'],
                'bandwidth_rate': node['bandwidth_rate'],
                'bandwidth_burst': node['bandwidth_burst'],
            })
        
        return Response({
            'nodes': sorted(nodes_bandwidth, key=lambda x: x['bytes_read'] + x['bytes_written'], reverse=True),
            'count': len(nodes_bandwidth),
            'source': 'live',
            'timestamp': timezone.now().isoformat(),
        })


class NetworkCircuitsView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/circuits/
    
    Returns ALL circuit data with full details.
    """
    
    def get(self, request, pk=None):
        network = get_network_or_404(pk)
        circuit_status = request.query_params.get('status')
        limit = int(request.query_params.get('limit', 100))
        
        nodes_stats = get_all_nodes_stats(network)
        
        # Collect all circuits from live nodes
        circuits = []
        for node in nodes_stats:
            for circ in node.get('live_circuits', []):
                if circuit_status and circ['status'] != circuit_status:
                    continue
                circ['source_node'] = node['name']
                circ['source_node_id'] = node['id']
                circ['source_node_type'] = node['node_type']
                circuits.append(circ)
        
        # Deduplicate
        seen_ids = set()
        unique_circuits = []
        for circ in circuits:
            if circ['id'] not in seen_ids:
                seen_ids.add(circ['id'])
                unique_circuits.append(circ)
        
        # Also get historical events from DB
        db_events = CircuitEvent.objects.filter(network=network).order_by('-event_time')[:100]
        
        return Response({
            'circuits': unique_circuits[:limit],
            'total': len(unique_circuits),
            'by_status': {
                'BUILT': len([c for c in unique_circuits if c['status'] == 'BUILT']),
                'LAUNCHED': len([c for c in unique_circuits if c['status'] == 'LAUNCHED']),
                'FAILED': len([c for c in unique_circuits if c['status'] == 'FAILED']),
                'CLOSED': len([c for c in unique_circuits if c['status'] == 'CLOSED']),
            },
            'by_purpose': {},
            'recent_events': [serialize_circuit_event(e) for e in db_events[:20]],
            'source': 'live',
            'timestamp': timezone.now().isoformat(),
        })


class NetworkConsensusView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/consensus/
    
    Returns FULL consensus details.
    """
    
    def get(self, request, pk=None):
        network = get_network_or_404(pk)
        
        # Get DA nodes
        da_nodes = TorNode.objects.filter(network=network, node_type='da')
        da_stats = [get_node_live_stats(node) for node in da_nodes]
        
        running_das = [n for n in da_stats if n['status'] == 'running']
        required = (network.num_directory_authorities // 2) + 1
        
        # Get relay count from consensus
        relay_count = 0
        for da in da_stats:
            if da['status'] == 'running' and da['control_port']:
                controller = connect_to_node(da['control_port'])
                if controller:
                    try:
                        consensus = list(controller.get_network_statuses())
                        relay_count = len(consensus)
                    except:
                        pass
                    finally:
                        try:
                            controller.close()
                        except:
                            pass
                    break
        
        return Response({
            'consensus': {
                'is_valid': len(running_das) >= required,
                'relay_count': relay_count,
                'authorities_total': len(da_stats),
                'authorities_running': len(running_das),
                'required_authorities': required,
                
                # From network model
                'valid_after': network.consensus_valid_after.isoformat() if network.consensus_valid_after else None,
                'fresh_until': network.consensus_fresh_until.isoformat() if network.consensus_fresh_until else None,
                'valid_until': network.consensus_valid_until.isoformat() if network.consensus_valid_until else None,
                
                # Voting config
                'voting_interval': network.voting_interval,
                'testing_tor_network': network.testing_tor_network,
                'assume_reachable': network.assume_reachable,
            },
            'authorities': [
                {
                    'id': da['id'],
                    'name': da['name'],
                    'status': da['status'],
                    'fingerprint': da['fingerprint'],
                    'v3_identity': da['v3_identity'],
                    'dir_port': da['dir_port'],
                    'flags': da['flags'],
                    'is_voting': da['status'] == 'running' and da['bootstrap_progress'] >= 100,
                }
                for da in da_stats
            ],
            'source': 'live',
            'timestamp': timezone.now().isoformat(),
        })


class NetworkNodesView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/nodes/
    
    Returns ALL nodes with COMPLETE field data.
    """
    
    def get(self, request, pk=None):
        network = get_network_or_404(pk)
        node_type = request.query_params.get('type')
        status_filter = request.query_params.get('status')
        
        nodes = TorNode.objects.filter(network=network)
        if node_type:
            nodes = nodes.filter(node_type=node_type)
        
        # Get live stats for all nodes
        nodes_data = []
        for node in nodes:
            stats = get_node_live_stats(node)
            if status_filter and stats['status'] != status_filter:
                continue
            nodes_data.append(stats)
        
        # Count by type
        by_type = {}
        for node in nodes_data:
            t = node['node_type']
            if t not in by_type:
                by_type[t] = {'total': 0, 'running': 0}
            by_type[t]['total'] += 1
            if node['status'] == 'running':
                by_type[t]['running'] += 1
        
        return Response({
            'nodes': nodes_data,
            'count': len(nodes_data),
            'running': len([n for n in nodes_data if n['status'] == 'running']),
            'by_type': by_type,
            'source': 'live',
            'timestamp': timezone.now().isoformat(),
        })


class NetworkCapturesView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/captures/
    
    Returns ALL traffic captures with COMPLETE data.
    """
    
    def get(self, request, pk=None):
        network = get_network_or_404(pk)
        status_filter = request.query_params.get('status')
        
        # Get all captures for nodes in this network
        node_ids = TorNode.objects.filter(network=network).values_list('id', flat=True)
        captures = TrafficCapture.objects.filter(node_id__in=node_ids).order_by('-started_at')
        
        if status_filter:
            captures = captures.filter(status=status_filter)
        
        captures_data = [serialize_capture(c) for c in captures]
        
        # Statistics
        total_size = sum(c['file_size_bytes'] or 0 for c in captures_data)
        total_packets = sum(c['packet_count'] or 0 for c in captures_data)
        total_cells = sum(c['tor_cells_detected'] or 0 for c in captures_data)
        
        return Response({
            'captures': captures_data,
            'count': len(captures_data),
            'by_status': {
                'recording': len([c for c in captures_data if c['status'] == 'recording']),
                'completed': len([c for c in captures_data if c['status'] == 'completed']),
                'analyzing': len([c for c in captures_data if c['status'] == 'analyzing']),
                'analyzed': len([c for c in captures_data if c['status'] == 'analyzed']),
                'error': len([c for c in captures_data if c['status'] == 'error']),
            },
            'totals': {
                'file_size_bytes': total_size,
                'packet_count': total_packets,
                'tor_cells_detected': total_cells,
            },
            'source': 'database',
            'timestamp': timezone.now().isoformat(),
        })


class NetworkAlertsView(APIView):
    """
    GET /api/v1/chutney/networks/{id}/alerts/
    
    Returns generated alerts based on network state.
    """
    
    def get(self, request, pk=None):
        network = get_network_or_404(pk)
        nodes_stats = get_all_nodes_stats(network)
        
        alerts = []
        
        # Check for offline nodes
        offline_nodes = [n for n in nodes_stats if n['status'] == 'offline']
        for node in offline_nodes:
            alerts.append({
                'id': f"offline-{node['id']}",
                'level': 'error',
                'type': 'node_offline',
                'message': f"Node {node['name']} is offline",
                'node_id': node['id'],
                'node_name': node['name'],
                'timestamp': timezone.now().isoformat(),
            })
        
        # Check for low bootstrap progress
        for node in nodes_stats:
            if node['status'] == 'running' and node['bootstrap_progress'] < 100:
                alerts.append({
                    'id': f"bootstrap-{node['id']}",
                    'level': 'warning',
                    'type': 'bootstrap_incomplete',
                    'message': f"Node {node['name']} bootstrap at {node['bootstrap_progress']}%",
                    'node_id': node['id'],
                    'node_name': node['name'],
                    'timestamp': timezone.now().isoformat(),
                })
        
        # Check DA count for consensus
        da_nodes = [n for n in nodes_stats if n['node_type'] == 'da']
        running_das = [n for n in da_nodes if n['status'] == 'running']
        required = (network.num_directory_authorities // 2) + 1
        
        if len(running_das) < required:
            alerts.append({
                'id': 'consensus-risk',
                'level': 'critical',
                'type': 'consensus_risk',
                'message': f"Only {len(running_das)}/{required} Directory Authorities running - consensus at risk!",
                'timestamp': timezone.now().isoformat(),
            })
        
        # Check capture file sizes
        node_ids = [n['id'] for n in nodes_stats]
        captures = TrafficCapture.objects.filter(
            node_id__in=node_ids,
            status='recording'
        )
        for capture in captures:
            if capture.file_size_bytes > (network.max_capture_size_mb * 0.9 * 1024 * 1024):
                alerts.append({
                    'id': f"capture-size-{capture.id}",
                    'level': 'warning',
                    'type': 'capture_size_warning',
                    'message': f"Capture {capture.name} approaching size limit ({capture.file_size_mb}MB / {network.max_capture_size_mb}MB)",
                    'node_id': str(capture.node_id),
                    'timestamp': timezone.now().isoformat(),
                })
        
        return Response({
            'alerts': alerts,
            'count': len(alerts),
            'by_level': {
                'critical': len([a for a in alerts if a['level'] == 'critical']),
                'error': len([a for a in alerts if a['level'] == 'error']),
                'warning': len([a for a in alerts if a['level'] == 'warning']),
                'info': len([a for a in alerts if a['level'] == 'info']),
            },
            'timestamp': timezone.now().isoformat(),
        })


class NodeStatsView(APIView):
    """
    GET /api/v1/chutney/nodes/{id}/stats/
    
    Returns COMPLETE stats for a single node.
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
    """
    
    def get(self, request, pk=None):
        node = get_node_or_404(pk)
        stats = get_node_live_stats(node)
        
        return Response({
            'bandwidth': {
                'bytes_read': stats['bytes_read'],
                'bytes_written': stats['bytes_written'],
                'bandwidth_rate': stats['bandwidth_rate'],
                'bandwidth_burst': stats['bandwidth_burst'],
            },
            'source': 'live' if stats['status'] == 'running' else 'database',
            'timestamp': timezone.now().isoformat(),
        })


class NodeCircuitsView(APIView):
    """
    GET /api/v1/chutney/nodes/{id}/circuits/
    """
    
    def get(self, request, pk=None):
        node = get_node_or_404(pk)
        stats = get_node_live_stats(node)
        
        return Response({
            'circuits': stats.get('live_circuits', []),
            'count': len(stats.get('live_circuits', [])),
            'active': stats['circuits_active'],
            'source': 'live' if stats['status'] == 'running' else 'database',
            'timestamp': timezone.now().isoformat(),
        })