"""
Docker Management API Views
REST API endpoints for container management.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from ..services import get_docker_service

import logging

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class DockerInfoView(APIView):
    """Get Docker daemon information."""
    
    def get(self, request):
        service = get_docker_service()
        
        if not service.is_connected:
            return Response(
                {"error": "Docker daemon not accessible"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        info = service.get_docker_info()
        return Response(info)


@method_decorator(csrf_exempt, name='dispatch')
class ContainerListView(APIView):
    """List and manage containers."""
    
    def get(self, request):
        """
        List all containers.
        
        Query params:
        - all: Include stopped containers (default: true)
        - status: Filter by status (running, exited, paused, etc.)
        - name: Filter by name (partial match)
        - sort: Sort field (name, status, created)
        - order: Sort order (asc, desc)
        """
        service = get_docker_service()
        
        if not service.is_connected:
            return Response(
                {"error": "Docker daemon not accessible"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Parse query params
        all_containers = request.query_params.get('all', 'true').lower() == 'true'
        status_filter = request.query_params.get('status', None)
        name_filter = request.query_params.get('name', None)
        sort_field = request.query_params.get('sort', 'name')
        sort_order = request.query_params.get('order', 'asc')
        
        # Build filters
        filters = {}
        if status_filter:
            filters['status'] = status_filter
        if name_filter:
            filters['name'] = name_filter
        
        containers = service.list_containers(
            all_containers=all_containers,
            filters=filters if filters else None
        )
        
        # Sort
        reverse = sort_order.lower() == 'desc'
        if sort_field == 'status':
            containers.sort(key=lambda x: x.get('status', ''), reverse=reverse)
        elif sort_field == 'created':
            containers.sort(key=lambda x: x.get('created', ''), reverse=reverse)
        else:  # name
            containers.sort(key=lambda x: x.get('name', '').lower(), reverse=reverse)
        
        # Summary stats
        stats = {
            "total": len(containers),
            "running": sum(1 for c in containers if c.get('status') == 'running'),
            "stopped": sum(1 for c in containers if c.get('status') == 'exited'),
            "paused": sum(1 for c in containers if c.get('status') == 'paused'),
            "other": sum(1 for c in containers if c.get('status') not in ['running', 'exited', 'paused']),
        }
        
        return Response({
            "containers": containers,
            "stats": stats,
            "docker_connected": True,
        })


@method_decorator(csrf_exempt, name='dispatch')
class ContainerDetailView(APIView):
    """Get, manage, or delete a specific container."""
    
    def get(self, request, container_id):
        """Get detailed container information."""
        service = get_docker_service()
        
        if not service.is_connected:
            return Response(
                {"error": "Docker daemon not accessible"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        container = service.get_container(container_id)
        if not container:
            return Response(
                {"error": f"Container not found: {container_id}"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(container)
    
    def delete(self, request, container_id):
        """Remove a container."""
        service = get_docker_service()
        
        if not service.is_connected:
            return Response(
                {"error": "Docker daemon not accessible"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        force = request.query_params.get('force', 'false').lower() == 'true'
        volumes = request.query_params.get('volumes', 'false').lower() == 'true'
        
        result = service.remove_container(container_id, force=force, volumes=volumes)
        
        if result.get('success'):
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class ContainerActionView(APIView):
    """Execute actions on a container (start, stop, restart, kill, pause, unpause)."""
    
    def post(self, request, container_id, action):
        """Execute container action."""
        service = get_docker_service()
        
        if not service.is_connected:
            return Response(
                {"error": "Docker daemon not accessible"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Validate action
        valid_actions = ['start', 'stop', 'restart', 'kill', 'pause', 'unpause']
        if action not in valid_actions:
            return Response(
                {"error": f"Invalid action: {action}. Valid actions: {valid_actions}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get optional parameters
        timeout = int(request.data.get('timeout', 10))
        signal = request.data.get('signal', 'SIGKILL')
        
        # Execute action
        if action == 'start':
            result = service.start_container(container_id)
        elif action == 'stop':
            result = service.stop_container(container_id, timeout=timeout)
        elif action == 'restart':
            result = service.restart_container(container_id, timeout=timeout)
        elif action == 'kill':
            result = service.kill_container(container_id, signal=signal)
        elif action == 'pause':
            result = service.pause_container(container_id)
        elif action == 'unpause':
            result = service.unpause_container(container_id)
        else:
            result = {"success": False, "error": "Unknown action"}
        
        if result.get('success'):
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class ContainerStatsView(APIView):
    """Get container resource statistics."""
    
    def get(self, request, container_id=None):
        """
        Get stats for one or all containers.
        
        If container_id is provided, get stats for that container.
        Otherwise, get stats for all running containers.
        """
        service = get_docker_service()
        
        if not service.is_connected:
            return Response(
                {"error": "Docker daemon not accessible"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        if container_id:
            stats = service.get_container_stats(container_id)
            if not stats:
                return Response(
                    {"error": f"Container not found or not running: {container_id}"},
                    status=status.HTTP_404_NOT_FOUND
                )
            return Response(stats)
        else:
            # Get stats for all running containers
            all_stats = service.get_all_container_stats()
            return Response({
                "stats": all_stats,
                "count": len(all_stats),
            })


@method_decorator(csrf_exempt, name='dispatch')
class ContainerLogsView(APIView):
    """Get container logs."""
    
    def get(self, request, container_id):
        """
        Get container logs.
        
        Query params:
        - tail: Number of lines (default: 100)
        - timestamps: Include timestamps (default: true)
        """
        service = get_docker_service()
        
        if not service.is_connected:
            return Response(
                {"error": "Docker daemon not accessible"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        tail = int(request.query_params.get('tail', 100))
        timestamps = request.query_params.get('timestamps', 'true').lower() == 'true'
        
        logs = service.get_container_logs(
            container_id, 
            tail=tail, 
            timestamps=timestamps
        )
        
        if logs is None:
            return Response(
                {"error": f"Container not found: {container_id}"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            "container_id": container_id,
            "logs": logs,
            "tail": tail,
        })


@method_decorator(csrf_exempt, name='dispatch')
class ContainerPruneView(APIView):
    """Prune stopped containers."""
    
    def post(self, request):
        """Remove all stopped containers."""
        service = get_docker_service()
        
        if not service.is_connected:
            return Response(
                {"error": "Docker daemon not accessible"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        result = service.prune_containers()
        
        if result.get('success'):
            return Response(result)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class ContainerBulkActionView(APIView):
    """Execute actions on multiple containers."""
    
    def post(self, request):
        """
        Execute action on multiple containers.
        
        Body:
        - container_ids: List of container IDs
        - action: Action to perform (start, stop, restart, kill, remove)
        - force: Force action (for remove)
        """
        service = get_docker_service()
        
        if not service.is_connected:
            return Response(
                {"error": "Docker daemon not accessible"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        container_ids = request.data.get('container_ids', [])
        action = request.data.get('action', '')
        force = request.data.get('force', False)
        
        if not container_ids:
            return Response(
                {"error": "No container IDs provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        valid_actions = ['start', 'stop', 'restart', 'kill', 'remove']
        if action not in valid_actions:
            return Response(
                {"error": f"Invalid action: {action}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        results = []
        for container_id in container_ids:
            try:
                if action == 'start':
                    result = service.start_container(container_id)
                elif action == 'stop':
                    result = service.stop_container(container_id)
                elif action == 'restart':
                    result = service.restart_container(container_id)
                elif action == 'kill':
                    result = service.kill_container(container_id)
                elif action == 'remove':
                    result = service.remove_container(container_id, force=force)
                else:
                    result = {"success": False, "error": "Unknown action"}
                
                results.append({
                    "container_id": container_id,
                    **result
                })
            except Exception as e:
                results.append({
                    "container_id": container_id,
                    "success": False,
                    "error": str(e)
                })
        
        success_count = sum(1 for r in results if r.get('success'))
        
        return Response({
            "results": results,
            "total": len(results),
            "success": success_count,
            "failed": len(results) - success_count,
        })
