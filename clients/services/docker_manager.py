"""
Docker Manager für SimpleX CLI Clients

Verwaltet Docker Container für jeden CLI Client:
- Container erstellen/starten/stoppen/löschen
- Volume Management für persistente Daten
- Logs abrufen
- Health Checks

Voraussetzungen:
- Docker installiert und läuft
- docker-py installiert: pip install docker
- Netzwerk 'simplex-clients' existiert (wird automatisch erstellt)
"""

import docker
import logging
from typing import Optional, List, Dict, Any
from django.conf import settings

logger = logging.getLogger(__name__)


class DockerManager:
    """
    Verwaltet Docker Container für SimpleX CLI Clients.
    
    Jeder Client läuft in einem eigenen Container mit:
    - SimpleX Chat CLI im WebSocket-Modus
    - Optional: Tor für Onion-Routing
    - Persistentes Volume für Datenbank/Schlüssel
    """
    
    # Docker Image für CLI Clients
    IMAGE_NAME = getattr(settings, 'SIMPLEX_CLI_IMAGE', 'simplex-cli:latest')
    
    # Docker Netzwerk
    NETWORK_NAME = getattr(settings, 'SIMPLEX_CLI_NETWORK', 'simplex-clients')
    
    # Container Labels für Identifikation
    LABEL_PREFIX = 'simplex.cli'
    
    def __init__(self):
        """Initialisiert Docker Client"""
        try:
            self.client = docker.from_env()
            self._ensure_network_exists()
            logger.info("Docker Manager initialisiert")
        except docker.errors.DockerException as e:
            logger.error(f"Docker nicht verfügbar: {e}")
            raise
    
    def _ensure_network_exists(self):
        """Erstellt das Docker Netzwerk falls nicht vorhanden"""
        try:
            self.client.networks.get(self.NETWORK_NAME)
        except docker.errors.NotFound:
            logger.info(f"Erstelle Docker Netzwerk: {self.NETWORK_NAME}")
            self.client.networks.create(
                self.NETWORK_NAME,
                driver='bridge',
                labels={f'{self.LABEL_PREFIX}.managed': 'true'}
            )
    
    def create_client_container(self, simplex_client) -> str:
        """
        Erstellt einen neuen Docker Container für einen Client.
        
        Args:
            simplex_client: SimplexClient Model-Instanz
            
        Returns:
            Container ID
        """
        from clients.models import SimplexClient
        
        container_name = simplex_client.container_name
        volume_name = simplex_client.data_volume
        port = simplex_client.websocket_port
        
        # Volume erstellen falls nicht vorhanden
        self._ensure_volume_exists(volume_name)
        
        # SMP Server als Umgebungsvariable
        smp_servers = ','.join([
            s.address for s in simplex_client.smp_servers.all()
        ])
        
        # Environment Variablen basierend auf connection_mode
        connection_mode = getattr(simplex_client, 'connection_mode', 'public_tor')
        
        environment = {
            'SIMPLEX_PORT': str(port),  # Externer Port für socat
            'SMP_SERVERS': smp_servers or '',
            'PROFILE_NAME': simplex_client.profile_name,
        }
        
        # Tor-Konfiguration basierend auf connection_mode
        if connection_mode == 'direct':
            environment['USE_TOR'] = 'false'
            network_name = self.NETWORK_NAME
            logger.info(f"Direct Mode: Kein Tor für {container_name}")
        elif connection_mode == 'public_tor':
            environment['USE_TOR'] = 'true'
            network_name = self.NETWORK_NAME
            logger.info(f"Public Tor Mode: localhost:9050 für {container_name}")
        elif connection_mode == 'chutnex_internal':
            environment['USE_TOR'] = 'true'
            # Client läuft IM ChutneX Netzwerk
            if simplex_client.chutnex_network:
                network_name = f"chutnex-{simplex_client.chutnex_network.slug}"
                environment['CHUTNEX_MODE'] = '1'
                logger.info(f"ChutneX Internal Mode: Container in {network_name}")
            else:
                network_name = self.NETWORK_NAME
                logger.warning(f"ChutneX Internal aber kein Netzwerk gewählt - Fallback zu {network_name}")
        elif connection_mode == 'chutnex_external':
            environment['USE_TOR'] = 'true'
            # Client ist außerhalb, verbindet über SOCKS
            network_name = self.NETWORK_NAME
            if simplex_client.chutnex_socks_port:
                # TODO: Tor so konfigurieren, dass es ChutneX SOCKS nutzt statt localhost:9050
                environment['TOR_SOCKS_PORT'] = str(simplex_client.chutnex_socks_port)
                logger.info(f"ChutneX External Mode: SOCKS Port {simplex_client.chutnex_socks_port}")
            else:
                logger.warning(f"ChutneX External aber kein SOCKS Port - Fallback zu Public Tor")
        else:
            environment['USE_TOR'] = 'true'
            network_name = self.NETWORK_NAME
        
        # Container Konfiguration
        # Für ChutneX Internal: Container in beiden Netzwerken (Bridge für Port-Mapping, ChutneX für Tor)
        # Erst ohne network erstellen (landet in bridge), dann nach Start zusätzlich in ChutneX verbinden
        container_config = {
            'name': container_name,
            'image': self.IMAGE_NAME,
            'detach': True,
            'environment': environment,
            'volumes': {
                volume_name: {'bind': '/data', 'mode': 'rw'}
            },
            'ports': {
                f'{port}/tcp': port  # Mapping: Host-Port -> Container socat Port
            },
            'network': self.NETWORK_NAME,  # Immer erst ins Standard-Netzwerk für Port-Mapping
            'labels': {
                f'{self.LABEL_PREFIX}.managed': 'true',
                f'{self.LABEL_PREFIX}.client_id': str(simplex_client.id),
                f'{self.LABEL_PREFIX}.client_slug': simplex_client.slug,
            },
            'restart_policy': {'Name': 'unless-stopped'},
            # Healthcheck
            'healthcheck': {
                'test': ['CMD', 'nc', '-z', 'localhost', '3030'],
                'interval': 10000000000,  # 10s in nanoseconds
                'timeout': 5000000000,    # 5s
                'retries': 3,
            },
        }
        
        try:
            container = self.client.containers.create(**container_config)
            logger.info(f"Container erstellt: {container_name} ({container.id[:12]})")
            
            # Update SimplexClient mit Container ID
            simplex_client.container_id = container.id
            simplex_client.status = SimplexClient.Status.CREATED
            simplex_client.save(update_fields=['container_id', 'status'])
            
            # Für ChutneX Internal: Container zusätzlich ins ChutneX Netzwerk verbinden
            if connection_mode == 'chutnex_internal' and simplex_client.chutnex_network:
                chutnex_network_name = f"chutnex-{simplex_client.chutnex_network.slug}"
                try:
                    chutnex_net = self.client.networks.get(chutnex_network_name)
                    chutnex_net.connect(container)
                    logger.info(f"Container {container_name} zusätzlich in {chutnex_network_name} verbunden")
                except Exception as e:
                    logger.warning(f"Konnte Container nicht in ChutneX verbinden: {e}")
            
            return container.id
            
        except docker.errors.APIError as e:
            logger.error(f"Fehler beim Erstellen des Containers: {e}")
            simplex_client.status = SimplexClient.Status.ERROR
            simplex_client.last_error = str(e)
            simplex_client.save(update_fields=['status', 'last_error'])
            raise
    
    def start_container(self, simplex_client) -> bool:
        """
        Startet einen Container.
        
        Falls kein Container existiert, wird einer erstellt.
        """
        from clients.models import SimplexClient
        
        container_id = simplex_client.container_id
        
        # Container erstellen falls nicht vorhanden
        if not container_id:
            container_id = self.create_client_container(simplex_client)
        
        try:
            container = self.client.containers.get(container_id)
            
            if container.status == 'running':
                logger.info(f"Container läuft bereits: {simplex_client.container_name}")
                return True
            
            simplex_client.status = SimplexClient.Status.STARTING
            simplex_client.save(update_fields=['status'])
            
            container.start()
            
            # Warte kurz und prüfe Status
            container.reload()
            
            if container.status == 'running':
                simplex_client.status = SimplexClient.Status.RUNNING
                simplex_client.last_error = ''
                simplex_client.save(update_fields=['status', 'last_error'])
                logger.info(f"Container gestartet: {simplex_client.container_name}")
                return True
            else:
                raise Exception(f"Container Status: {container.status}")
                
        except docker.errors.NotFound:
            # Container existiert nicht mehr - neu erstellen
            logger.warning(f"Container nicht gefunden, erstelle neu: {simplex_client.container_name}")
            simplex_client.container_id = ''
            simplex_client.save(update_fields=['container_id'])
            return self.start_container(simplex_client)
            
        except Exception as e:
            logger.error(f"Fehler beim Starten: {e}")
            simplex_client.status = SimplexClient.Status.ERROR
            simplex_client.last_error = str(e)
            simplex_client.save(update_fields=['status', 'last_error'])
            return False
    
    def stop_container(self, simplex_client, timeout: int = 10) -> bool:
        """
        Stoppt einen Container.
        
        Args:
            simplex_client: SimplexClient Model-Instanz
            timeout: Sekunden warten vor SIGKILL
        """
        from clients.models import SimplexClient
        
        if not simplex_client.container_id:
            simplex_client.status = SimplexClient.Status.STOPPED
            simplex_client.save(update_fields=['status'])
            return True
        
        try:
            container = self.client.containers.get(simplex_client.container_id)
            
            simplex_client.status = SimplexClient.Status.STOPPING
            simplex_client.save(update_fields=['status'])
            
            container.stop(timeout=timeout)
            
            simplex_client.status = SimplexClient.Status.STOPPED
            simplex_client.save(update_fields=['status'])
            
            logger.info(f"Container gestoppt: {simplex_client.container_name}")
            return True
            
        except docker.errors.NotFound:
            logger.warning(f"Container nicht gefunden: {simplex_client.container_name}")
            simplex_client.status = SimplexClient.Status.STOPPED
            simplex_client.container_id = ''
            simplex_client.save(update_fields=['status', 'container_id'])
            return True
            
        except Exception as e:
            logger.error(f"Fehler beim Stoppen: {e}")
            simplex_client.status = SimplexClient.Status.ERROR
            simplex_client.last_error = str(e)
            simplex_client.save(update_fields=['status', 'last_error'])
            return False
    
    def restart_container(self, simplex_client, timeout: int = 10) -> bool:
        """Startet einen Container neu"""
        self.stop_container(simplex_client, timeout)
        return self.start_container(simplex_client)
    
    def delete_container(self, simplex_client, remove_volume: bool = False) -> bool:
        """
        Löscht einen Container und optional das Volume.
        
        Args:
            simplex_client: SimplexClient Model-Instanz
            remove_volume: Auch das Data Volume löschen
        """
        # Container stoppen und entfernen - versuche per ID und per Name
        container = None
        
        # Versuche per ID
        if simplex_client.container_id:
            try:
                container = self.client.containers.get(simplex_client.container_id)
            except docker.errors.NotFound:
                pass
        
        # Fallback: Versuche per Name
        if not container and simplex_client.container_name:
            try:
                container = self.client.containers.get(simplex_client.container_name)
            except docker.errors.NotFound:
                pass
        
        # Container löschen
        if container:
            try:
                container.remove(force=True)
                logger.info(f"Container gelöscht: {simplex_client.container_name}")
            except Exception as e:
                logger.error(f"Fehler beim Löschen: {e}")
        else:
            logger.warning(f"Container nicht gefunden: {simplex_client.container_name}")
        
        # Volume löschen falls gewünscht
        if remove_volume and simplex_client.data_volume:
            try:
                volume = self.client.volumes.get(simplex_client.data_volume)
                volume.remove(force=True)
                logger.info(f"Volume gelöscht: {simplex_client.data_volume}")
            except docker.errors.NotFound:
                logger.warning(f"Volume nicht gefunden: {simplex_client.data_volume}")
            except Exception as e:
                logger.error(f"Fehler beim Löschen des Volumes: {e}")
        
        return True
    
    def get_container_logs(self, simplex_client, tail: int = 100, 
                          timestamps: bool = True) -> str:
        """
        Holt die Container Logs.
        
        Args:
            simplex_client: SimplexClient Model-Instanz
            tail: Anzahl der letzten Zeilen
            timestamps: Timestamps anzeigen
            
        Returns:
            Log-Output als String
        """
        if not simplex_client.container_id:
            return "[Container nicht erstellt]"
        
        try:
            container = self.client.containers.get(simplex_client.container_id)
            logs = container.logs(
                tail=tail,
                timestamps=timestamps,
                stream=False
            )
            return logs.decode('utf-8', errors='replace')
            
        except docker.errors.NotFound:
            return "[Container nicht gefunden]"
        except Exception:
            logger.exception("Fehler beim Abrufen der Container-Logs")
            return "[Fehler beim Abrufen der Logs]"
    
    def get_container_status(self, simplex_client) -> Dict[str, Any]:
        """
        Holt detaillierten Container-Status.
        
        Returns:
            Dict mit status, health, stats etc.
        """
        if not simplex_client.container_id:
            return {'status': 'not_created', 'running': False}
        
        try:
            container = self.client.containers.get(simplex_client.container_id)
            container.reload()
            
            health = 'unknown'
            if container.attrs.get('State', {}).get('Health'):
                health = container.attrs['State']['Health'].get('Status', 'unknown')
            
            return {
                'status': container.status,
                'running': container.status == 'running',
                'health': health,
                'started_at': container.attrs.get('State', {}).get('StartedAt'),
                'exit_code': container.attrs.get('State', {}).get('ExitCode'),
            }
            
        except docker.errors.NotFound:
            return {'status': 'not_found', 'running': False}
        except Exception as e:
            return {'status': 'error', 'running': False, 'error': str(e)}
    
    def sync_status(self, simplex_client) -> None:
        """
        Synchronisiert den DB-Status mit dem tatsächlichen Container-Status.
        """
        from clients.models import SimplexClient
        
        status = self.get_container_status(simplex_client)
        
        if status['status'] == 'running':
            new_status = SimplexClient.Status.RUNNING
        elif status['status'] in ('exited', 'dead'):
            new_status = SimplexClient.Status.STOPPED
        elif status['status'] == 'not_found':
            new_status = SimplexClient.Status.CREATED
            simplex_client.container_id = ''
        else:
            new_status = SimplexClient.Status.ERROR
        
        if simplex_client.status != new_status:
            simplex_client.status = new_status
            simplex_client.save(update_fields=['status', 'container_id'])
    
    def _ensure_volume_exists(self, volume_name: str) -> None:
        """Erstellt ein Volume falls nicht vorhanden"""
        try:
            self.client.volumes.get(volume_name)
        except docker.errors.NotFound:
            logger.info(f"Erstelle Volume: {volume_name}")
            self.client.volumes.create(
                name=volume_name,
                labels={f'{self.LABEL_PREFIX}.managed': 'true'}
            )
    
    def list_managed_containers(self) -> List[Dict[str, Any]]:
        """
        Listet alle von uns verwalteten Container.
        """
        containers = self.client.containers.list(
            all=True,
            filters={'label': f'{self.LABEL_PREFIX}.managed=true'}
        )
        
        return [{
            'id': c.id,
            'name': c.name,
            'status': c.status,
            'client_slug': c.labels.get(f'{self.LABEL_PREFIX}.client_slug', 'unknown'),
        } for c in containers]
    
    def cleanup_orphaned_containers(self) -> int:
        """
        Entfernt Container ohne zugehörigen SimplexClient.
        
        Returns:
            Anzahl der entfernten Container
        """
        from clients.models import SimplexClient
        
        managed = self.list_managed_containers()
        known_ids = set(SimplexClient.objects.values_list('container_id', flat=True))
        
        removed = 0
        for container_info in managed:
            if container_info['id'] not in known_ids:
                try:
                    container = self.client.containers.get(container_info['id'])
                    container.remove(force=True)
                    logger.info(f"Orphaned Container entfernt: {container_info['name']}")
                    removed += 1
                except Exception as e:
                    logger.error(f"Fehler beim Entfernen: {e}")
        
        return removed


# Singleton-Instanz
_docker_manager: Optional[DockerManager] = None


def get_docker_manager() -> DockerManager:
    """Gibt die Docker Manager Singleton-Instanz zurück"""
    global _docker_manager
    if _docker_manager is None:
        _docker_manager = DockerManager()
    return _docker_manager
