"""
SimpleX SMP Monitor - Tor Control Service
=========================================
Copyright (c) 2025 cannatoshi

Live connection to Tor Control Ports via stem library.
Supports both host-mode (localhost) and docker-mode (container names).
"""

import logging
import os
from typing import Dict, List, Optional, Any
from datetime import datetime

from stem import CircStatus
from stem.control import Controller

logger = logging.getLogger(__name__)

# Control Port Password
TOR_CONTROL_PASSWORD = "chutnex2025"


class TorControlService:
    """
    Service for Tor Control Port communication.
    Uses stem library for secure connections.
    """
    
    def __init__(self):
        self._controllers: Dict[str, Controller] = {}
        self._docker_mode = os.environ.get('DOCKER_MODE', '').lower() == 'true'
    
    def _get_connection_address(self, container_name: str, control_port: int) -> tuple:
        """Determine connection address based on mode."""
        if self._docker_mode:
            return (container_name, 9051)
        else:
            return ('127.0.0.1', control_port)
    
    def _get_controller(self, container_name: str, control_port: int = 9051) -> Optional[Controller]:
        """Gets or creates Controller connection to a Tor node."""
        address, port = self._get_connection_address(container_name, control_port)
        cache_key = f"{address}:{port}"
        
        if cache_key in self._controllers:
            controller = self._controllers[cache_key]
            if controller.is_alive():
                return controller
            else:
                try:
                    controller.close()
                except:
                    pass
                del self._controllers[cache_key]
        
        try:
            controller = Controller.from_port(address=address, port=port)
            controller.authenticate(password=TOR_CONTROL_PASSWORD)
            self._controllers[cache_key] = controller
            logger.debug(f"Connected to Tor Control: {address}:{port}")
            return controller
        except Exception as e:
            logger.warning(f"Failed to connect to {address}:{port}: {e}")
            return None
    
    def close_all(self):
        """Closes all open Controller connections."""
        for key, controller in list(self._controllers.items()):
            try:
                controller.close()
            except:
                pass
        self._controllers.clear()
    
    # =========================================================================
    # BANDWIDTH METHODS
    # =========================================================================
    
    def get_node_bandwidth(self, container_name: str, control_port: int = 9051) -> Optional[Dict[str, Any]]:
        """Gets bandwidth statistics for a single node."""
        controller = self._get_controller(container_name, control_port)
        if not controller:
            return None
        
        try:
            bytes_read = int(controller.get_info('traffic/read', '0'))
            bytes_written = int(controller.get_info('traffic/written', '0'))
            
            return {
                'bytes_read': bytes_read,
                'bytes_written': bytes_written,
                'bytes_total': bytes_read + bytes_written,
                'timestamp': datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error(f"Error getting bandwidth for {container_name}: {e}")
            return None
    
    def get_network_bandwidth(self, nodes: List[Dict]) -> Dict[str, Any]:
        """Aggregates bandwidth across all nodes of a network."""
        total_read = 0
        total_written = 0
        nodes_reporting = 0
        by_type: Dict[str, Dict[str, int]] = {}
        
        for node in nodes:
            container_name = node.get('container_name')
            control_port = node.get('control_port', 9051)
            node_type = node.get('node_type', 'unknown')
            
            if not container_name or not control_port:
                continue
            
            stats = self.get_node_bandwidth(container_name, control_port)
            if stats:
                total_read += stats['bytes_read']
                total_written += stats['bytes_written']
                nodes_reporting += 1
                
                if node_type not in by_type:
                    by_type[node_type] = {'bytes_read': 0, 'bytes_written': 0, 'node_count': 0}
                by_type[node_type]['bytes_read'] += stats['bytes_read']
                by_type[node_type]['bytes_written'] += stats['bytes_written']
                by_type[node_type]['node_count'] += 1
        
        return {
            'total_bytes_read': total_read,
            'total_bytes_written': total_written,
            'total_bytes': total_read + total_written,
            'nodes_reporting': nodes_reporting,
            'by_type': by_type,
            'timestamp': datetime.utcnow().isoformat(),
        }
    
    def get_aggregated_bandwidth(self, nodes: List[Dict]) -> Dict[str, Any]:
        """Alias for get_network_bandwidth."""
        return self.get_network_bandwidth(nodes)
    
    # =========================================================================
    # CIRCUIT METHODS
    # =========================================================================
    
    def get_node_circuits(self, container_name: str, control_port: int = 9051) -> Optional[List[Dict]]:
        """Gets all circuits of a node."""
        controller = self._get_controller(container_name, control_port)
        if not controller:
            return None
        
        try:
            circuits = []
            for circ in controller.get_circuits():
                path = []
                for fingerprint, nickname in circ.path:
                    path.append({
                        'fingerprint': fingerprint,
                        'nickname': nickname or 'Unknown',
                    })
                
                circuits.append({
                    'circuit_id': str(circ.id),
                    'status': str(circ.status),
                    'purpose': circ.purpose or 'GENERAL',
                    'path': path,
                    'path_length': len(path),
                    'build_flags': list(circ.build_flags) if circ.build_flags else [],
                })
            
            return circuits
        except Exception as e:
            logger.error(f"Error getting circuits for {container_name}: {e}")
            return None
    
    def get_network_circuits(self, nodes: List[Dict]) -> Dict[str, Any]:
        """Collects all circuits from all nodes of a network."""
        all_circuits = []
        seen_circuit_ids = set()
        
        for node in nodes:
            container_name = node.get('container_name')
            control_port = node.get('control_port', 9051)
            node_name = node.get('name', container_name)
            
            if not container_name or not control_port:
                continue
            
            circuits = self.get_node_circuits(container_name, control_port)
            if circuits:
                for circ in circuits:
                    circ_key = f"{circ['circuit_id']}-{'-'.join([h['fingerprint'][:8] for h in circ['path']])}"
                    if circ_key not in seen_circuit_ids:
                        seen_circuit_ids.add(circ_key)
                        circ['source_node'] = node_name
                        circ['source_node_id'] = node.get('id')
                        all_circuits.append(circ)
        
        by_status: Dict[str, int] = {}
        by_purpose: Dict[str, int] = {}
        built_count = 0
        
        for circ in all_circuits:
            status = circ.get('status', 'UNKNOWN')
            purpose = circ.get('purpose', 'GENERAL')
            
            by_status[status] = by_status.get(status, 0) + 1
            by_purpose[purpose] = by_purpose.get(purpose, 0) + 1
            
            if 'BUILT' in status:
                built_count += 1
        
        return {
            'total_circuits': len(all_circuits),
            'built_circuits': built_count,
            'by_status': by_status,
            'by_purpose': by_purpose,
            'circuits': all_circuits,
            'timestamp': datetime.utcnow().isoformat(),
        }
    
    def get_circuit_summary(self, nodes: List[Dict]) -> Dict[str, Any]:
        """Alias for get_network_circuits."""
        return self.get_network_circuits(nodes)
    
    # =========================================================================
    # CONSENSUS METHODS
    # =========================================================================
    
    def get_consensus_info(self, container_name: str, control_port: int = 9051) -> Optional[Dict[str, Any]]:
        """Gets consensus information from a DA."""
        controller = self._get_controller(container_name, control_port)
        if not controller:
            return None
        
        try:
            info = {
                'valid': True,
                'valid_after': None,
                'fresh_until': None,
                'valid_until': None,
                'tor_version': controller.get_info('version', 'unknown'),
                'source_da': container_name,
                'timestamp': datetime.utcnow().isoformat(),
            }
            
            try:
                consensus_doc = controller.get_info('dir/status-vote/current/consensus', None)
                if consensus_doc:
                    for line in consensus_doc.split('\n')[:20]:
                        if line.startswith('valid-after '):
                            info['valid_after'] = line[12:].strip()
                        elif line.startswith('fresh-until '):
                            info['fresh_until'] = line[12:].strip()
                        elif line.startswith('valid-until '):
                            info['valid_until'] = line[12:].strip()
            except:
                pass
            
            return info
        except Exception as e:
            logger.error(f"Error getting consensus from {container_name}: {e}")
            return None
    
    # =========================================================================
    # NODE INFO METHODS
    # =========================================================================
    
    def get_node_info(self, container_name: str, control_port: int = 9051) -> Optional[Dict[str, Any]]:
        """Gets detailed information about a node."""
        controller = self._get_controller(container_name, control_port)
        if not controller:
            return None
        
        try:
            info = {
                'version': controller.get_info('version', 'unknown'),
                'uptime': int(controller.get_info('uptime', '0')),
                'fingerprint': controller.get_info('fingerprint', ''),
                'bytes_read': int(controller.get_info('traffic/read', '0')),
                'bytes_written': int(controller.get_info('traffic/written', '0')),
                'bootstrap_phase': None,
                'bootstrap_progress': 0,
                'is_alive': True,
                'timestamp': datetime.utcnow().isoformat(),
            }
            
            try:
                bootstrap = controller.get_info('status/bootstrap-phase', '')
                if bootstrap:
                    info['bootstrap_phase'] = bootstrap
                    if 'PROGRESS=' in bootstrap:
                        progress_str = bootstrap.split('PROGRESS=')[1].split()[0]
                        info['bootstrap_progress'] = int(progress_str)
            except:
                pass
            
            return info
        except Exception as e:
            logger.error(f"Error getting node info for {container_name}: {e}")
            return None
    
    # =========================================================================
    # COMBINED ANALYTICS
    # =========================================================================
    
    def get_network_analytics(self, network, nodes: List[Dict]) -> Dict[str, Any]:
        """Main method: Collects all analytics for a network."""
        bandwidth = self.get_network_bandwidth(nodes)
        circuits = self.get_network_circuits(nodes)
        
        consensus = None
        da_nodes = [n for n in nodes if n.get('node_type') == 'da']
        for da in da_nodes:
            consensus = self.get_consensus_info(
                da.get('container_name'),
                da.get('control_port', 9051)
            )
            if consensus:
                break
        
        node_stats = []
        running_count = 0
        total_uptime = 0
        
        for node in nodes:
            info = self.get_node_info(
                node.get('container_name'),
                node.get('control_port', 9051)
            )
            if info and info.get('is_alive'):
                running_count += 1
                total_uptime += info.get('uptime', 0)
                
                node_stats.append({
                    'node_id': node.get('id'),
                    'node_name': node.get('name'),
                    'node_type': node.get('node_type'),
                    'version': info.get('version'),
                    'uptime': info.get('uptime', 0),
                    'fingerprint': info.get('fingerprint', ''),
                    'bytes_read': info.get('bytes_read', 0),
                    'bytes_written': info.get('bytes_written', 0),
                    'bootstrap_phase': info.get('bootstrap_phase'),
                    'bootstrap_progress': info.get('bootstrap_progress', 0),
                })
        
        avg_uptime = total_uptime // running_count if running_count > 0 else 0
        
        return {
            'network_id': str(network.id),
            'network_name': network.name,
            'network_status': network.status,
            'bandwidth': bandwidth,
            'circuits': circuits,
            'consensus': consensus,
            'nodes': {
                'total': len(nodes),
                'running': running_count,
                'stats': node_stats,
            },
            'summary': {
                'total_bytes': bandwidth.get('total_bytes', 0),
                'active_circuits': circuits.get('built_circuits', 0),
                'consensus_valid': consensus.get('valid', False) if consensus else False,
                'avg_node_uptime': avg_uptime,
            },
            'timestamp': datetime.utcnow().isoformat(),
        }


_tor_control_service: Optional[TorControlService] = None


def get_tor_control_service() -> TorControlService:
    """Returns the singleton instance of TorControlService."""
    global _tor_control_service
    if _tor_control_service is None:
        _tor_control_service = TorControlService()
    return _tor_control_service
