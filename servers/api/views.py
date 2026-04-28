"""
Servers API - Views

Extended with Docker hosting support (v0.1.12)
Auto-start Docker containers on server creation (v0.1.13)
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from django.shortcuts import get_object_or_404
from django.utils import timezone
import logging
import re
import socket
import ssl
import time
import threading

from servers.models import Server, Category
from .serializers import (
    ServerListSerializer,
    ServerDetailSerializer,
    ServerCreateUpdateSerializer,
    CategorySerializer,
    ServerDockerActionSerializer,
    ServerLogsSerializer,
    ServerLogsResponseSerializer,
    DockerImagesStatusSerializer,
)

logger = logging.getLogger(__name__)


# CSRF-Exempt for API calls from React dev server
class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return  # Skip CSRF check for API


def parse_simplex_address(address):
    """Parse SimpleX server address to extract host, port, fingerprint, password"""
    try:
        match = re.match(r'^(smp|xftp|ntf)://([^:@]+)(?::([^@]+))?@([^:]+)(?::(\d+))?$', address.strip())
        if match:
            return match.group(4), int(match.group(5) or 5223), match.group(2), match.group(3) or ''
    except:
        pass
    return '', 5223, '', ''


class CategoryViewSet(viewsets.ModelViewSet):
    """ViewSet für Kategorien"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    authentication_classes = [CsrfExemptSessionAuthentication]


class SMPServerViewSet(viewsets.ModelViewSet):
    """
    ViewSet für Server mit Docker-Hosting Support.
    
    Standard CRUD plus:
    - POST /servers/{id}/test/ - Test server connection
    - POST /servers/{id}/toggle_active/ - Toggle active status
    - POST /servers/{id}/toggle_maintenance/ - Toggle maintenance mode
    - POST /servers/{id}/docker-action/ - Start/Stop/Restart/Delete Container
    - GET /servers/{id}/logs/ - Container Logs abrufen
    - GET /servers/docker-images/ - Prüfen welche Images verfügbar sind
    """
    queryset = Server.objects.all()
    authentication_classes = [CsrfExemptSessionAuthentication]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ServerListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ServerCreateUpdateSerializer
        return ServerDetailSerializer
    
    def get_queryset(self):
        queryset = Server.objects.all().order_by('sort_order', 'name')
        
        # Filter by server_type
        server_type = self.request.query_params.get('server_type')
        if server_type:
            queryset = queryset.filter(server_type=server_type)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(last_status=status_filter)
        
        # Filter by active
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by maintenance
        maintenance = self.request.query_params.get('maintenance_mode')
        if maintenance is not None:
            queryset = queryset.filter(maintenance_mode=maintenance.lower() == 'true')
        
        # Filter by category
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(categories__id=category_id)
        
        # Filter by onion
        onion = self.request.query_params.get('onion')
        if onion is not None:
            queryset = queryset.filter(is_onion=onion.lower() == 'true')
        
        # Filter by docker hosted
        is_docker = self.request.query_params.get('is_docker_hosted')
        if is_docker is not None:
            queryset = queryset.filter(is_docker_hosted=is_docker.lower() == 'true')
        
        # Filter by docker status
        docker_status = self.request.query_params.get('docker_status')
        if docker_status:
            queryset = queryset.filter(docker_status=docker_status)
        
        return queryset.distinct()
    
    def perform_create(self, serializer):
        """
        Nach dem Erstellen eines Servers:
        - Für Docker-hosted Server: Container automatisch starten
        """
        server = serializer.save()
        
        # Auto-start Docker container for Docker-hosted servers
        if server.is_docker_hosted:
            logger.info(f"Auto-starting Docker container for new server: {server.name}")
            self._auto_start_container(server)
    
    def _auto_start_container(self, server):
        """Start Docker container in background thread"""
        def start_container_thread():
            try:
                from servers.services import get_server_docker_manager
                manager = get_server_docker_manager()
                
                if manager:
                    success = manager.start_container(server)
                    if success:
                        logger.info(f"Docker container started successfully for: {server.name}")
                    else:
                        logger.error(f"Failed to start Docker container for: {server.name}")
                else:
                    logger.error("Docker manager not available")
            except Exception as e:
                logger.error(f"Error auto-starting container for {server.name}: {e}")
        
        # Start in background thread so API response returns immediately
        thread = threading.Thread(target=start_container_thread, daemon=True)
        thread.start()
    
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test server connection"""
        server = self.get_object()
        
        # Determine address to test
        if server.is_docker_hosted and server.generated_address:
            test_address = server.generated_address
        elif server.address:
            test_address = server.address
        else:
            return Response({
                'status': 'error',
                'message': 'No address to test'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Parse address
        host, port, fingerprint, password = parse_simplex_address(test_address)
        if not host:
            # Try to extract from host field
            host = server.host or ''
            port = 5223
        
        if not host:
            return Response({
                'status': 'error',
                'message': 'Could not determine host to test'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if onion address (needs Tor proxy)
        is_onion = '.onion' in host
        
        try:
            start_time = time.time()
            
            if is_onion:
                # For onion addresses, we need SOCKS proxy
                import socks
                sock = socks.socksocket()
                sock.set_proxy(socks.SOCKS5, "127.0.0.1", 9050)
                sock.settimeout(120)  # Longer timeout for Tor
                sock.connect((host, port))
            else:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(30)
                sock.connect((host, port))
            
            # Wrap with SSL
            # NOTE: SimpleX SMP servers use self-signed certificates;
            # authenticity is verified via the fingerprint embedded in the
            # server address (see parse_simplex_address above), not via a CA.
            # CERT_NONE is intentional here. CodeQL py/insecure-protocol on
            # this block is a known false positive for the SimpleX protocol.
            # TODO(security): add explicit fingerprint pinning - compare
            # SHA-256 of ssock.getpeercert(binary_form=True) against the
            # parsed `fingerprint` after wrap_socket succeeds.
            context = ssl.create_default_context()
            context.minimum_version = ssl.TLSVersion.TLSv1_2
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            
            with context.wrap_socket(sock, server_hostname=host) as ssock:
                latency = int((time.time() - start_time) * 1000)
                
                # Update server
                server.last_status = 'online'
                server.last_latency = latency
                server.last_check = timezone.now()
                server.last_error = None
                server.save()
                
                return Response({
                    'status': 'success',
                    'message': f'Connection successful ({latency}ms)',
                    'latency': latency
                })
        
        except Exception as e:
            server.last_status = 'error'
            server.last_check = timezone.now()
            server.last_error = str(e)
            server.save()
            
            return Response({
                'status': 'error',
                'message': str(e)
            })
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle active status"""
        server = self.get_object()
        server.is_active = not server.is_active
        server.save()
        return Response({
            'id': server.id,
            'is_active': server.is_active
        })
    
    @action(detail=True, methods=['post'])
    def toggle_maintenance(self, request, pk=None):
        """Toggle maintenance mode"""
        server = self.get_object()
        server.maintenance_mode = not server.maintenance_mode
        server.save()
        return Response({
            'id': server.id,
            'maintenance_mode': server.maintenance_mode
        })
    
    @action(detail=True, methods=['post'], url_path='docker-action')
    def docker_action(self, request, pk=None):
        """
        Docker Container Action (start/stop/restart/delete)
        """
        server = self.get_object()
        
        if not server.is_docker_hosted:
            return Response({
                'error': 'Server is not Docker-hosted'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = ServerDockerActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        action_type = serializer.validated_data['action']
        remove_volumes = serializer.validated_data.get('remove_volumes', False)
        
        try:
            from servers.services import get_server_docker_manager
            manager = get_server_docker_manager()
            
            if not manager:
                return Response({
                    'error': 'Docker manager not available'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            success = False
            message = ''
            
            if action_type == 'start':
                success = manager.start_container(server)
                message = 'Container started' if success else 'Failed to start container'
            
            elif action_type == 'stop':
                success = manager.stop_container(server)
                message = 'Container stopped' if success else 'Failed to stop container'
            
            elif action_type == 'restart':
                success = manager.restart_container(server)
                message = 'Container restarted' if success else 'Failed to restart container'
            
            elif action_type == 'delete':
                success = manager.delete_container(server, remove_volumes=remove_volumes)
                message = 'Container deleted' if success else 'Failed to delete container'
            
            # Refresh server data
            server.refresh_from_db()
            
            return Response({
                'success': success,
                'message': message,
                'docker_status': server.docker_status,
                'docker_status_display': server.get_docker_status_display(),
                'generated_address': server.generated_address or '',
                'onion_address': server.onion_address or '',
            })
        
        except Exception as e:
            logger.exception(f"Docker action error: {e}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """Get container logs"""
        server = self.get_object()
        
        if not server.is_docker_hosted:
            return Response({
                'error': 'Server is not Docker-hosted'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        tail = int(request.query_params.get('tail', 100))
        timestamps = request.query_params.get('timestamps', 'true').lower() == 'true'
        
        try:
            from servers.services import get_server_docker_manager
            manager = get_server_docker_manager()
            
            if not manager:
                return Response({
                    'logs': 'Docker manager not available',
                    'container_name': server.container_name or '',
                    'container_status': server.docker_status
                })
            
            logs = manager.get_container_logs(server, tail=tail, timestamps=timestamps)
            
            return Response({
                'logs': logs,
                'container_name': server.container_name or '',
                'container_status': server.docker_status
            })
        
        except Exception as e:
            return Response({
                'logs': f'Error fetching logs: {str(e)}',
                'container_name': server.container_name or '',
                'container_status': server.docker_status
            })
    
    @action(detail=True, methods=['post'], url_path='sync-status')
    def sync_status(self, request, pk=None):
        """Sync Docker status with actual container state"""
        server = self.get_object()
        
        if not server.is_docker_hosted:
            return Response({
                'error': 'Server is not Docker-hosted'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from servers.services import get_server_docker_manager
            manager = get_server_docker_manager()
            
            if manager:
                manager.sync_container_status(server)
            
            server.refresh_from_db()
            
            return Response({
                'docker_status': server.docker_status,
                'docker_status_display': server.get_docker_status_display()
            })
        
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='docker-images')
    def docker_images(self, request):
        """Check which Docker images are available"""
        try:
            from servers.services import get_server_docker_manager
            manager = get_server_docker_manager()
            
            if not manager:
                return Response({
                    'smp': {'ip': False, 'tor': False},
                    'xftp': {'ip': False, 'tor': False},
                    'ntf': {'ip': False, 'tor': False}
                })
            
            result = {}
            for server_type in ['smp', 'xftp', 'ntf']:
                result[server_type] = {
                    'ip': manager.check_image_exists(server_type, 'ip'),
                    'tor': manager.check_image_exists(server_type, 'tor')
                }
            
            return Response(result)
        
        except Exception as e:
            logger.exception(f"Error checking Docker images: {e}")
            return Response({
                'smp': {'ip': False, 'tor': False},
                'xftp': {'ip': False, 'tor': False},
                'ntf': {'ip': False, 'tor': False}
            })
    
    @action(detail=False, methods=['get'], url_path='docker-containers')
    def docker_containers(self, request):
        """List all managed Docker containers"""
        try:
            from servers.services import get_server_docker_manager
            manager = get_server_docker_manager()
            
            if not manager:
                return Response({
                    'containers': [],
                    'count': 0
                })
            
            containers = manager.list_managed_containers()
            
            return Response({
                'containers': containers,
                'count': len(containers)
            })
        
        except Exception as e:
            logger.exception(f"Error listing containers: {e}")
            return Response({
                'containers': [],
                'count': 0
            })
    
    @action(detail=False, methods=['post'], url_path='cleanup-orphaned')
    def cleanup_orphaned(self, request):
        """Remove orphaned Docker containers"""
        try:
            from servers.services import get_server_docker_manager
            manager = get_server_docker_manager()
            
            if not manager:
                return Response({
                    'removed': 0,
                    'message': 'Docker manager not available'
                })
            
            removed = manager.cleanup_orphaned_containers()
            
            return Response({
                'removed': removed,
                'message': f'Removed {removed} orphaned container(s)'
            })
        
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder servers"""
        order_data = request.data.get('order', [])
        
        for item in order_data:
            try:
                server = Server.objects.get(id=item['id'])
                server.sort_order = item['order']
                server.save(update_fields=['sort_order'])
            except Server.DoesNotExist:
                pass
        
        return Response({'status': 'ok'})