"""
ChutneX - Private Tor Network Manager
=====================================
Copyright (c) 2025 cannatoshi

Manages isolated Tor networks for SimpleX forensics.
Based on testing-tor-network architecture.
"""

import logging
import time
import docker
from datetime import datetime
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class ChutneXManager:
    """
    Manages ChutneX private Tor networks using Docker.
    
    Key concept: Shared volume /status contains dir-authorities file
    that all nodes read to discover Directory Authorities.
    """
    
    CHUTNEX_IMAGE = 'chutnex:latest'
    NETWORK_PREFIX = 'chutnex'
    STATUS_VOLUME_PREFIX = 'chutnex-status'
    
    def __init__(self):
        self.client = docker.from_env()
    
    # ==========================================================================
    # Network Management
    # ==========================================================================
    
    def create_network(self, network) -> bool:
        """Create Docker network and status volume for ChutneX."""
        from chutney.models import TorNetwork
        
        try:
            network_name = f"{self.NETWORK_PREFIX}-{network.slug}"
            volume_name = f"{self.STATUS_VOLUME_PREFIX}-{network.slug}"
            
            # Create Docker network (NOT internal - we need port mappings!)
            try:
                self.client.networks.get(network_name)
                logger.info(f"Network {network_name} already exists")
            except docker.errors.NotFound:
                self.client.networks.create(
                    network_name,
                    driver='bridge',
                    # internal=False allows port mappings to host
                    ipam=docker.types.IPAMConfig(
                        pool_configs=[
                            docker.types.IPAMPool(subnet='10.99.0.0/16')
                        ]
                    )
                )
                logger.info(f"Created network: {network_name}")
            
            # Create shared status volume
            try:
                self.client.volumes.get(volume_name)
                logger.info(f"Volume {volume_name} already exists")
            except docker.errors.NotFound:
                self.client.volumes.create(volume_name)
                logger.info(f"Created status volume: {volume_name}")
            
            # Clear dir-authorities file
            self._clear_dir_authorities(volume_name)
            
            # Update network record
            network.docker_network_name = network_name
            network.save(update_fields=['docker_network_name'])
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to create network: {e}")
            return False
    
    def _clear_dir_authorities(self, volume_name: str):
        """Clear the dir-authorities file in the status volume."""
        try:
            self.client.containers.run(
                'alpine',
                f'rm -f /status/dir-authorities && touch /status/dir-authorities',
                volumes={volume_name: {'bind': '/status', 'mode': 'rw'}},
                remove=True
            )
        except Exception as e:
            logger.warning(f"Could not clear dir-authorities: {e}")
    
    def delete_network(self, network) -> bool:
        """Delete Docker network, volume, and all containers."""
        try:
            network_name = f"{self.NETWORK_PREFIX}-{network.slug}"
            volume_name = f"{self.STATUS_VOLUME_PREFIX}-{network.slug}"
            
            # Stop and remove all containers
            for node in network.nodes.all():
                self.delete_node(node)
            
            # Remove network
            try:
                docker_net = self.client.networks.get(network_name)
                docker_net.remove()
                logger.info(f"Removed network: {network_name}")
            except docker.errors.NotFound:
                pass
            
            # Remove volume
            try:
                volume = self.client.volumes.get(volume_name)
                volume.remove()
                logger.info(f"Removed volume: {volume_name}")
            except docker.errors.NotFound:
                pass
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete network: {e}")
            return False
    
    # ==========================================================================
    # Node Management
    # ==========================================================================
    
    def create_and_start_node(self, node, ip_address: str) -> str:
        """Create and start a single ChutneX node container."""
        from chutney.models import TorNode
        
        network = node.network
        network_name = f"{self.NETWORK_PREFIX}-{network.slug}"
        volume_name = f"{self.STATUS_VOLUME_PREFIX}-{network.slug}"
        container_name = f"{self.NETWORK_PREFIX}-{network.slug}-{node.name}"
        
        # Remove existing container
        try:
            existing = self.client.containers.get(container_name)
            existing.remove(force=True)
        except docker.errors.NotFound:
            pass
        
        # Map node_type to role
        role_map = {
            'da': 'da',
            'guard': 'relay',
            'middle': 'relay',
            'exit': 'exit',
            'client': 'client',
            'hs': 'hs',
        }
        role = role_map.get(node.node_type, 'client')
        
        # Environment variables
        da_count = network.nodes.filter(node_type='da').count()
        
        environment = {
            'ROLE': role,
            'NICK': node.nickname or node.name,
            'DA_COUNT': str(da_count),
        }
        
        # Hidden Service config
        if node.node_type == 'hs':
            environment['HS_PORT'] = str(node.hs_port or 80)
            environment['SERVICE_PORT'] = str(node.hs_target_port or 80)
            environment['SERVICE_IP'] = '127.0.0.1'
        
        # Port bindings - Control Port for ALL nodes, SOCKS for clients
        ports = {}
        
        # Control Port mapping (9051 internal -> node.control_port external)
        if node.control_port:
            ports['9051/tcp'] = ('0.0.0.0', node.control_port)
        
        # SOCKS Port for clients (9050 internal -> node.socks_port external)
        if node.node_type == 'client' and node.socks_port:
            ports['9050/tcp'] = ('0.0.0.0', node.socks_port)
        
        # OR Port for relays
        if node.or_port and node.node_type in ['da', 'guard', 'middle', 'exit']:
            ports['9001/tcp'] = ('0.0.0.0', node.or_port)
        
        # Dir Port for DAs
        if node.dir_port and node.node_type == 'da':
            ports['9030/tcp'] = ('0.0.0.0', node.dir_port)
        
        # Create container
        container = self.client.containers.create(
            image=self.CHUTNEX_IMAGE,
            name=container_name,
            detach=True,
            environment=environment,
            volumes={
                volume_name: {'bind': '/status', 'mode': 'rw'}
            },
            ports=ports if ports else None,
        )
        
        # Connect to our network with static IP
        docker_net = self.client.networks.get(network_name)
        docker_net.connect(container, ipv4_address=ip_address)
        
        # Start container
        container.start()
        
        # Update node record
        node.container_id = container.id
        node.container_name = container_name
        node.status = TorNode.Status.STARTING
        node.started_at = timezone.now()
        node.save(update_fields=['container_id', 'container_name', 'status', 'started_at'])
        
        logger.info(f"Started node {node.name} ({role}) at {ip_address} with ports {ports}")
        return container.id
    
    def start_node(self, node) -> bool:
        """Start a single node (must have container created)."""
        from chutney.models import TorNode
        try:
            if node.container_name:
                container = self.client.containers.get(node.container_name)
                container.start()
                node.status = TorNode.Status.STARTING
                node.started_at = timezone.now()
                node.save(update_fields=['status', 'started_at'])
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to start node {node.name}: {e}")
            return False
    
    def stop_node(self, node) -> bool:
        """Stop a single node."""
        from chutney.models import TorNode
        try:
            if node.container_name:
                container = self.client.containers.get(node.container_name)
                container.stop(timeout=5)
                node.status = TorNode.Status.STOPPED
                node.save(update_fields=['status'])
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to stop node {node.name}: {e}")
            return False
    
    def delete_node(self, node) -> bool:
        """Stop and remove a node container."""
        from chutney.models import TorNode
        try:
            if node.container_name:
                try:
                    container = self.client.containers.get(node.container_name)
                    container.remove(force=True)
                    logger.info(f"Removed container: {node.container_name}")
                except docker.errors.NotFound:
                    pass
            
            node.container_id = ''
            node.container_name = ''
            node.status = TorNode.Status.NOT_CREATED
            node.save(update_fields=['container_id', 'container_name', 'status'])
            
            return True
        except Exception as e:
            logger.error(f"Failed to delete node {node.name}: {e}")
            return False
    
    def get_node_logs(self, node, tail: int = 100) -> str:
        """Get container logs for a node."""
        try:
            if not node.container_name:
                return "No container"
            container = self.client.containers.get(node.container_name)
            return container.logs(tail=tail, timestamps=True).decode('utf-8')
        except docker.errors.NotFound:
            return "Container not found"
        except Exception as e:
            return f"Error: {e}"
    
    def get_node_status(self, node) -> dict:
        """Get current status of a node container."""
        try:
            if not node.container_name:
                return {'status': 'not_created', 'running': False}
            
            container = self.client.containers.get(node.container_name)
            logs = container.logs(tail=50).decode('utf-8')
            
            # Check bootstrap progress
            bootstrap_pct = 0
            if 'Bootstrapped 100%' in logs:
                bootstrap_pct = 100
            elif 'Bootstrapped' in logs:
                for line in logs.split('\n'):
                    if 'Bootstrapped' in line:
                        try:
                            pct = int(line.split('Bootstrapped')[1].split('%')[0].strip())
                            bootstrap_pct = max(bootstrap_pct, pct)
                        except:
                            pass
            
            return {
                'status': container.status,
                'running': container.status == 'running',
                'bootstrap_progress': bootstrap_pct,
            }
        except docker.errors.NotFound:
            return {'status': 'not_found', 'running': False}
        except Exception as e:
            return {'status': 'error', 'running': False, 'error': str(e)}
    
    def update_node_status_from_container(self, node) -> bool:
        """Update node DB status from actual container status."""
        from chutney.models import TorNode
        
        try:
            status = self.get_node_status(node)
            
            if status['running']:
                if status['bootstrap_progress'] >= 100:
                    node.status = TorNode.Status.RUNNING
                else:
                    node.status = TorNode.Status.BOOTSTRAPPING
                node.bootstrap_progress = status['bootstrap_progress']
            elif status['status'] == 'exited':
                node.status = TorNode.Status.STOPPED
            elif status['status'] == 'not_found':
                node.status = TorNode.Status.NOT_CREATED
            
            node.save(update_fields=['status', 'bootstrap_progress'])
            return True
        except Exception as e:
            logger.error(f"Failed to update node status: {e}")
            return False
    
    def update_all_node_statuses(self, network) -> int:
        """Update status for all nodes in a network. Returns count of running nodes."""
        running_count = 0
        for node in network.nodes.all():
            self.update_node_status_from_container(node)
            if node.status == 'running':
                running_count += 1
        return running_count
    
    # ==========================================================================
    # Full Network Lifecycle
    # ==========================================================================
    
    def start_network(self, network) -> bool:
        """
        Start a complete ChutneX network.
        
        Order:
        1. Create Docker network and volume
        2. Start DAs first (they register their fingerprints)
        3. Wait for DAs to be ready
        4. Start all other nodes
        5. Wait for bootstrap and update statuses
        """
        from chutney.models import TorNetwork, TorNode
        
        try:
            network.status = TorNetwork.Status.CREATING
            network.status_message = "Creating network infrastructure..."
            network.save(update_fields=['status', 'status_message'])
            
            # Create network and volume
            if not self.create_network(network):
                raise Exception("Failed to create Docker network")
            
            # Create nodes in DB if not exist
            self._ensure_nodes_exist(network)
            
            # Assign IPs
            ip_base = "10.99.1."
            ip_counter = 10
            
            # Start DAs FIRST
            network.status_message = "Starting Directory Authorities..."
            network.save(update_fields=['status_message'])
            
            da_nodes = network.nodes.filter(node_type='da')
            for node in da_nodes:
                ip = f"{ip_base}{ip_counter}"
                ip_counter += 1
                self.create_and_start_node(node, ip)
            
            # Wait for DAs to generate fingerprints
            logger.info("Waiting for DAs to register...")
            time.sleep(5)
            
            # Verify DAs are ready
            volume_name = f"{self.STATUS_VOLUME_PREFIX}-{network.slug}"
            da_count = self._count_dir_authorities(volume_name)
            if da_count < da_nodes.count():
                logger.warning(f"Only {da_count}/{da_nodes.count()} DAs registered")
                time.sleep(5)
            
            # Start all other nodes
            network.status = TorNetwork.Status.BOOTSTRAPPING
            network.status_message = "Starting relays and clients..."
            network.save(update_fields=['status', 'status_message'])
            
            other_nodes = network.nodes.exclude(node_type='da')
            for node in other_nodes:
                ip = f"{ip_base}{ip_counter}"
                ip_counter += 1
                self.create_and_start_node(node, ip)
            
            # Wait for bootstrap
            network.status_message = "Waiting for nodes to bootstrap..."
            network.save(update_fields=['status_message'])
            time.sleep(10)
            
            # Update all node statuses
            running_count = self.update_all_node_statuses(network)
            
            # Update network status
            network.status = TorNetwork.Status.RUNNING
            network.status_message = f"Network running with {running_count}/{network.nodes.count()} nodes bootstrapped"
            network.started_at = timezone.now()
            network.save(update_fields=['status', 'status_message', 'started_at'])
            
            logger.info(f"ChutneX network '{network.name}' started successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start network: {e}")
            network.status = TorNetwork.Status.ERROR
            network.status_message = str(e)
            network.save(update_fields=['status', 'status_message'])
            return False
    
    def stop_network(self, network) -> bool:
        """Stop all containers in a network."""
        from chutney.models import TorNetwork, TorNode
        
        try:
            network.status = TorNetwork.Status.STOPPING
            network.save(update_fields=['status'])
            
            for node in network.nodes.all():
                self.stop_node(node)
            
            network.status = TorNetwork.Status.STOPPED
            network.stopped_at = timezone.now()
            network.save(update_fields=['status', 'stopped_at'])
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop network: {e}")
            return False
    
    def refresh_network_status(self, network) -> dict:
        """Refresh status of all nodes and return summary."""
        from chutney.models import TorNetwork
        
        running_count = self.update_all_node_statuses(network)
        total = network.nodes.count()
        
        # Update network bootstrap progress
        if total > 0:
            total_bootstrap = sum(n.bootstrap_progress for n in network.nodes.all())
            network.bootstrap_progress = total_bootstrap // total
        
        # Check consensus
        if running_count == total and network.bootstrap_progress >= 100:
            network.consensus_valid = True
            if network.status != TorNetwork.Status.RUNNING:
                network.status = TorNetwork.Status.RUNNING
        
        network.save()
        
        return {
            'total': total,
            'running': running_count,
            'bootstrap_progress': network.bootstrap_progress,
            'consensus_valid': network.consensus_valid,
        }
    
    def _ensure_nodes_exist(self, network):
        """Create node records in DB based on network config."""
        from chutney.models import TorNode
        
        if network.nodes.count() > 0:
            return  # Already have nodes
        
        node_configs = []
        
        # Directory Authorities
        for i in range(network.num_directory_authorities):
            node_configs.append({
                'name': f'da{i+1}',
                'node_type': 'da',
                'index': i,
                'control_port': network.base_control_port + i,
                'or_port': network.base_or_port + i,
                'dir_port': network.base_dir_port + i,
            })
        
        idx = network.num_directory_authorities
        
        # Guard Relays
        for i in range(network.num_guard_relays):
            node_configs.append({
                'name': f'guard{i+1}',
                'node_type': 'guard',
                'index': i,
                'control_port': network.base_control_port + idx,
                'or_port': network.base_or_port + idx,
            })
            idx += 1
        
        # Middle Relays
        for i in range(network.num_middle_relays):
            node_configs.append({
                'name': f'middle{i+1}',
                'node_type': 'middle',
                'index': i,
                'control_port': network.base_control_port + idx,
                'or_port': network.base_or_port + idx,
            })
            idx += 1
        
        # Exit Relays
        for i in range(network.num_exit_relays):
            node_configs.append({
                'name': f'exit{i+1}',
                'node_type': 'exit',
                'index': i,
                'control_port': network.base_control_port + idx,
                'or_port': network.base_or_port + idx,
            })
            idx += 1
        
        # Clients
        for i in range(network.num_clients):
            node_configs.append({
                'name': f'client{i+1}',
                'node_type': 'client',
                'index': i,
                'control_port': network.base_control_port + idx,
                'socks_port': network.base_socks_port + i,
            })
            idx += 1
        
        # Hidden Services
        for i in range(network.num_hidden_services):
            node_configs.append({
                'name': f'hs{i+1}',
                'node_type': 'hs',
                'index': i,
                'control_port': network.base_control_port + idx,
                'hs_port': 80,
                'hs_target_port': 8080,
            })
            idx += 1
        
        # Create nodes
        for config in node_configs:
            TorNode.objects.create(network=network, **config)
        
        logger.info(f"Created {len(node_configs)} nodes for network {network.name}")
    
    def _count_dir_authorities(self, volume_name: str) -> int:
        """Count registered DAs in the status volume."""
        try:
            result = self.client.containers.run(
                'alpine',
                'cat /status/dir-authorities | wc -l',
                volumes={volume_name: {'bind': '/status', 'mode': 'ro'}},
                remove=True
            )
            return int(result.decode().strip())
        except:
            return 0


# Singleton instance
_manager = None

def get_chutnex_manager() -> ChutneXManager:
    """Get singleton ChutneX manager instance."""
    global _manager
    if _manager is None:
        _manager = ChutneXManager()
    return _manager
