"""
Docker Service - Non-Blocking Version with proper stats
"""

import docker
from docker.errors import DockerException, NotFound, APIError
from typing import Optional, Dict, List, Any
from datetime import datetime
import logging
import threading
import time

logger = logging.getLogger(__name__)


class DockerService:
    """Service class for Docker operations."""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._client = None
        self._connected = False
        self._initialized = True
        self._connect()
    
    def _connect(self) -> bool:
        try:
            self._client = docker.from_env(timeout=10)
            self._client.ping()
            self._connected = True
            logger.info("Connected to Docker daemon")
            return True
        except DockerException as e:
            logger.error(f"Failed to connect to Docker: {e}")
            self._connected = False
            return False
    
    @property
    def is_connected(self) -> bool:
        if not self._connected or not self._client:
            return self._connect()
        try:
            self._client.ping()
            return True
        except:
            self._connected = False
            return self._connect()
    
    @property
    def client(self):
        if not self.is_connected:
            raise DockerException("Not connected to Docker daemon")
        return self._client
    
    def get_docker_info(self) -> Dict[str, Any]:
        try:
            info = self.client.info()
            version = self.client.version()
            return {
                'containers_running': info.get('ContainersRunning', 0),
                'containers_paused': info.get('ContainersPaused', 0),
                'containers_stopped': info.get('ContainersStopped', 0),
                'containers_total': info.get('Containers', 0),
                'images_total': info.get('Images', 0),
                'docker_version': version.get('Version', 'unknown'),
                'os': info.get('OperatingSystem', 'unknown'),
                'architecture': info.get('Architecture', 'unknown'),
                'memory_total': info.get('MemTotal', 0),
                'cpus': info.get('NCPU', 0),
                'kernel_version': info.get('KernelVersion', 'unknown'),
            }
        except DockerException as e:
            logger.error(f"Failed to get Docker info: {e}")
            raise
    
    def list_containers(self, all_containers: bool = True, filters: Optional[Dict] = None) -> List[Dict[str, Any]]:
        try:
            containers = self.client.containers.list(all=all_containers, filters=filters)
            return [self._format_container(c) for c in containers]
        except DockerException as e:
            logger.error(f"Failed to list containers: {e}")
            raise
    
    def _format_container(self, container) -> Dict[str, Any]:
        try:
            attrs = container.attrs
            state = attrs.get('State', {})
            config = attrs.get('Config', {})
            host_config = attrs.get('HostConfig', {})
            network_settings = attrs.get('NetworkSettings', {})
            
            ports = []
            port_bindings = host_config.get('PortBindings') or {}
            for container_port, bindings in port_bindings.items():
                if bindings:
                    ports.append({
                        'container_port': container_port,
                        'host_bindings': [{'host_ip': b.get('HostIp', ''), 'host_port': b.get('HostPort', '')} for b in bindings]
                    })
            
            networks = {}
            for name, net_info in (network_settings.get('Networks') or {}).items():
                networks[name] = {'ip_address': net_info.get('IPAddress', ''), 'gateway': net_info.get('Gateway', '')}
            
            mounts = [{'type': m.get('Type', ''), 'source': m.get('Source', ''), 'destination': m.get('Destination', ''), 'mode': m.get('Mode', '')} for m in attrs.get('Mounts', [])]
            
            image_size = 0
            try:
                if container.image:
                    image_size = container.image.attrs.get('Size', 0)
            except:
                pass
            
            return {
                'id': container.id,
                'short_id': container.short_id,
                'name': container.name,
                'status': state.get('Status', 'unknown'),
                'image': config.get('Image', 'unknown'),
                'image_size': image_size,
                'created': attrs.get('Created', ''),
                'ports': ports,
                'state': {
                    'running': state.get('Running', False),
                    'paused': state.get('Paused', False),
                    'restarting': state.get('Restarting', False),
                    'oom_killed': state.get('OOMKilled', False),
                    'dead': state.get('Dead', False),
                    'exit_code': state.get('ExitCode', 0),
                    'error': state.get('Error', ''),
                    'started_at': state.get('StartedAt', ''),
                    'finished_at': state.get('FinishedAt', ''),
                },
                'networks': networks,
                'mounts': mounts,
                'labels': config.get('Labels', {}),
            }
        except Exception as e:
            logger.error(f"Error formatting container {container.id}: {e}")
            return {'id': container.id, 'short_id': container.short_id, 'name': container.name, 'status': 'unknown', 'image': 'unknown', 'image_size': 0, 'created': '', 'ports': [], 'state': {}, 'networks': {}, 'mounts': [], 'labels': {}}
    
    def get_container(self, container_id: str) -> Dict[str, Any]:
        try:
            container = self.client.containers.get(container_id)
            return self._format_container(container)
        except NotFound:
            raise
        except DockerException as e:
            logger.error(f"Failed to get container {container_id}: {e}")
            raise
    
    def get_container_stats(self, container_id: str) -> Dict[str, Any]:
        """Get container stats using streaming to get accurate CPU data."""
        try:
            container = self.client.containers.get(container_id)
            
            if container.status != 'running':
                return self._empty_stats(container_id, 'not_running')
            
            # Use streaming stats with a quick read for accurate CPU calculation
            # Read 2 samples to get proper delta values
            stats_stream = container.stats(stream=True, decode=True)
            
            try:
                # Get first sample (used as baseline)
                first_stats = next(stats_stream)
                # Small delay to let metrics accumulate  
                time.sleep(0.1)
                # Get second sample with actual deltas
                second_stats = next(stats_stream)
            finally:
                # Always close the stream!
                stats_stream.close()
            
            return self._parse_stats(container_id, second_stats)
            
        except NotFound:
            raise
        except StopIteration:
            return self._empty_stats(container_id, 'no_data')
        except Exception as e:
            logger.error(f"Failed to get stats for {container_id}: {e}")
            return self._empty_stats(container_id, 'error')
    
    def get_all_container_stats(self) -> List[Dict[str, Any]]:
        """Get stats for all running containers."""
        try:
            containers = self.client.containers.list(filters={'status': 'running'})
            
            if not containers:
                return []
            
            results = []
            threads = []
            results_lock = threading.Lock()
            
            def fetch_stats(container):
                try:
                    stats_stream = container.stats(stream=True, decode=True)
                    try:
                        next(stats_stream)  # First sample
                        time.sleep(0.1)
                        stats = next(stats_stream)  # Second sample with deltas
                    finally:
                        stats_stream.close()
                    
                    parsed = self._parse_stats(container.id, stats)
                    parsed['name'] = container.name
                    
                    with results_lock:
                        results.append(parsed)
                except Exception as e:
                    logger.warning(f"Stats error for {container.name}: {e}")
                    with results_lock:
                        results.append(self._empty_stats(container.id, 'error'))
            
            # Fetch stats in parallel using threads
            for container in containers:
                t = threading.Thread(target=fetch_stats, args=(container,))
                t.start()
                threads.append(t)
            
            # Wait for all threads with timeout
            for t in threads:
                t.join(timeout=3.0)
            
            return results
            
        except DockerException as e:
            logger.error(f"Failed to get all container stats: {e}")
            return []
    
    def _parse_stats(self, container_id: str, stats: Dict) -> Dict[str, Any]:
        """Parse Docker stats response."""
        try:
            # CPU calculation
            cpu_percent = 0.0
            cpu_stats = stats.get('cpu_stats', {})
            precpu_stats = stats.get('precpu_stats', {})
            
            cpu_total = cpu_stats.get('cpu_usage', {}).get('total_usage', 0)
            precpu_total = precpu_stats.get('cpu_usage', {}).get('total_usage', 0)
            cpu_delta = cpu_total - precpu_total
            
            system_cpu = cpu_stats.get('system_cpu_usage', 0)
            presystem_cpu = precpu_stats.get('system_cpu_usage', 0)
            system_delta = system_cpu - presystem_cpu
            
            num_cpus = cpu_stats.get('online_cpus') or len(cpu_stats.get('cpu_usage', {}).get('percpu_usage', [1])) or 1
            
            if system_delta > 0 and cpu_delta > 0:
                cpu_percent = (cpu_delta / system_delta) * num_cpus * 100.0
            
            # Memory calculation
            memory_stats = stats.get('memory_stats', {})
            memory_usage = memory_stats.get('usage', 0)
            memory_limit = memory_stats.get('limit', 0)
            
            # Subtract cache for more accurate usage (Linux specific)
            cache = memory_stats.get('stats', {}).get('cache', 0)
            inactive_file = memory_stats.get('stats', {}).get('inactive_file', 0)
            # Use the better metric if available
            actual_cache = inactive_file if inactive_file else cache
            memory_usage = max(0, memory_usage - actual_cache)
            
            memory_percent = (memory_usage / memory_limit * 100) if memory_limit > 0 else 0
            
            # Network I/O
            networks = stats.get('networks', {})
            network_rx = sum(net.get('rx_bytes', 0) for net in networks.values())
            network_tx = sum(net.get('tx_bytes', 0) for net in networks.values())
            
            # Block I/O
            blkio = stats.get('blkio_stats', {}).get('io_service_bytes_recursive', []) or []
            block_read = sum(item.get('value', 0) for item in blkio if item.get('op') == 'read')
            block_write = sum(item.get('value', 0) for item in blkio if item.get('op') == 'write')
            
            return {
                'container_id': container_id,
                'cpu_percent': round(cpu_percent, 2),
                'memory_usage': memory_usage,
                'memory_limit': memory_limit,
                'memory_percent': round(memory_percent, 2),
                'network_rx': network_rx,
                'network_tx': network_tx,
                'block_read': block_read,
                'block_write': block_write,
                'timestamp': datetime.now().isoformat(),
                'status': 'ok'
            }
        except Exception as e:
            logger.error(f"Error parsing stats for {container_id}: {e}")
            return self._empty_stats(container_id, 'parse_error')
    
    def _empty_stats(self, container_id: str, status: str = 'error') -> Dict[str, Any]:
        return {
            'container_id': container_id,
            'cpu_percent': 0,
            'memory_usage': 0,
            'memory_limit': 0,
            'memory_percent': 0,
            'network_rx': 0,
            'network_tx': 0,
            'block_read': 0,
            'block_write': 0,
            'timestamp': datetime.now().isoformat(),
            'status': status
        }
    
    def get_container_logs(self, container_id: str, tail: int = 100, timestamps: bool = True) -> str:
        """Get container logs - non-blocking."""
        try:
            container = self.client.containers.get(container_id)
            logs = container.logs(tail=tail, timestamps=timestamps, stream=False)
            if isinstance(logs, bytes):
                logs = logs.decode('utf-8', errors='replace')
            return logs
        except NotFound:
            raise
        except Exception as e:
            logger.error(f"Failed to get logs for {container_id}: {e}")
            return f"[Error: {e}]"
    
    def start_container(self, container_id: str) -> Dict[str, Any]:
        try:
            container = self.client.containers.get(container_id)
            container.start()
            container.reload()
            return {'success': True, 'message': f'Container {container.name} started', 'status': container.status}
        except NotFound:
            raise
        except APIError as e:
            return {'success': False, 'error': str(e)}
    
    def stop_container(self, container_id: str, timeout: int = 10) -> Dict[str, Any]:
        try:
            container = self.client.containers.get(container_id)
            container.stop(timeout=timeout)
            container.reload()
            return {'success': True, 'message': f'Container {container.name} stopped', 'status': container.status}
        except NotFound:
            raise
        except APIError as e:
            return {'success': False, 'error': str(e)}
    
    def restart_container(self, container_id: str, timeout: int = 10) -> Dict[str, Any]:
        try:
            container = self.client.containers.get(container_id)
            container.restart(timeout=timeout)
            container.reload()
            return {'success': True, 'message': f'Container {container.name} restarted', 'status': container.status}
        except NotFound:
            raise
        except APIError as e:
            return {'success': False, 'error': str(e)}
    
    def kill_container(self, container_id: str, signal: str = 'SIGKILL') -> Dict[str, Any]:
        try:
            container = self.client.containers.get(container_id)
            container.kill(signal=signal)
            container.reload()
            return {'success': True, 'message': f'Container {container.name} killed', 'status': container.status}
        except NotFound:
            raise
        except APIError as e:
            return {'success': False, 'error': str(e)}
    
    def pause_container(self, container_id: str) -> Dict[str, Any]:
        try:
            container = self.client.containers.get(container_id)
            container.pause()
            container.reload()
            return {'success': True, 'message': f'Container {container.name} paused', 'status': container.status}
        except NotFound:
            raise
        except APIError as e:
            return {'success': False, 'error': str(e)}
    
    def unpause_container(self, container_id: str) -> Dict[str, Any]:
        try:
            container = self.client.containers.get(container_id)
            container.unpause()
            container.reload()
            return {'success': True, 'message': f'Container {container.name} unpaused', 'status': container.status}
        except NotFound:
            raise
        except APIError as e:
            return {'success': False, 'error': str(e)}
    
    def remove_container(self, container_id: str, force: bool = False, volumes: bool = False) -> Dict[str, Any]:
        try:
            container = self.client.containers.get(container_id)
            name = container.name
            container.remove(force=force, v=volumes)
            return {'success': True, 'message': f'Container {name} removed'}
        except NotFound:
            raise
        except APIError as e:
            return {'success': False, 'error': str(e)}
    
    def prune_containers(self) -> Dict[str, Any]:
        try:
            result = self.client.containers.prune()
            return {'success': True, 'containers_deleted': result.get('ContainersDeleted', []) or [], 'space_reclaimed': result.get('SpaceReclaimed', 0)}
        except APIError as e:
            return {'success': False, 'error': str(e)}


_service_instance = None
_service_lock = threading.Lock()

def get_docker_service() -> DockerService:
    global _service_instance
    if _service_instance is None:
        with _service_lock:
            if _service_instance is None:
                _service_instance = DockerService()
    return _service_instance
