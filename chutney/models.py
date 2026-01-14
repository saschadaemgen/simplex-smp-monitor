"""
SimpleX SMP Monitor - Chutney Models
====================================
Copyright (c) 2026 cannatoshi

Private Tor network models for traffic analysis and forensics.

Components:
- TorNetwork: A complete private Tor network
- TorNode: Individual Tor nodes (DA, Guard, Middle, Exit, Client, HS)
- TrafficCapture: PCAP captures per node for analysis
- CircuitEvent: Circuit lifecycle events

Integrates with:
- Docker for container management
- SimpleX SMP Server (Tor mode) for end-to-end tests
- InfluxDB for metrics (optional)
"""

import uuid
import re
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class TorNetwork(models.Model):
    """
    A private Tor network (Chutney instance).
    
    Represents a complete local Tor network with:
    - Directory Authorities (consensus generation)
    - Guard/Middle/Exit Relays
    - Clients (SOCKS proxy access)
    - Optional: Hidden Services
    """
    
    class Status(models.TextChoices):
        NOT_CREATED = 'not_created', 'Not Created'
        CREATED = 'created', 'Created'
        CREATING = 'creating', 'Creating...'
        BOOTSTRAPPING = 'bootstrapping', 'Bootstrapping...'
        RUNNING = 'running', 'Running'
        STOPPING = 'stopping', 'Stopping...'
        STOPPED = 'stopped', 'Stopped'
        ERROR = 'error', 'Error'
    
    class NetworkTemplate(models.TextChoices):
        """Predefined network topologies"""
        MINIMAL = 'minimal', 'Minimal (3 DA, 2 Relay, 1 Exit, 1 Client)'
        BASIC = 'basic', 'Basic (3 DA, 4 Relay, 2 Exit, 2 Client)'
        STANDARD = 'standard', 'Standard (3 DA, 6 Relay, 3 Exit, 3 Client)'
        FORENSIC = 'forensic', 'Forensic (3 DA, 8 Relay, 4 Exit, 4 Client, Full Capture)'
        CUSTOM = 'custom', 'Custom Configuration'
    
    # === Identification ===
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text='Unique name for this Tor network'
    )
    slug = models.SlugField(
        max_length=100,
        unique=True,
        blank=True,
        help_text='URL-friendly name (auto-generated)'
    )
    description = models.TextField(
        blank=True,
        help_text='Description and purpose of this network'
    )
    
    # === Network Configuration ===
    template = models.CharField(
        max_length=20,
        choices=NetworkTemplate.choices,
        default=NetworkTemplate.BASIC,
        help_text='Network topology template'
    )
    
    # Node counts (for Custom template or override)
    num_directory_authorities = models.PositiveIntegerField(
        default=3,
        validators=[MinValueValidator(3), MaxValueValidator(9)],
        help_text='Number of Directory Authorities (min. 3 for consensus)'
    )
    num_guard_relays = models.PositiveIntegerField(
        default=2,
        validators=[MinValueValidator(1), MaxValueValidator(20)],
        help_text='Number of Guard Relays'
    )
    num_middle_relays = models.PositiveIntegerField(
        default=2,
        validators=[MinValueValidator(1), MaxValueValidator(20)],
        help_text='Number of Middle Relays'
    )
    num_exit_relays = models.PositiveIntegerField(
        default=2,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text='Number of Exit Relays'
    )
    num_clients = models.PositiveIntegerField(
        default=2,
        validators=[MinValueValidator(1), MaxValueValidator(20)],
        help_text='Number of Tor Clients (SOCKS proxies)'
    )
    num_hidden_services = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        help_text='Number of Hidden Service nodes'
    )
    
    # === Docker Configuration ===
    docker_network_name = models.CharField(
        max_length=100,
        blank=True,
        help_text='Docker network name (auto-generated)'
    )
    container_prefix = models.CharField(
        max_length=50,
        blank=True,
        help_text='Prefix for container names (auto-generated)'
    )
    
    # === Port Ranges ===
    # Chutney uses port ranges for different services
    base_control_port = models.IntegerField(
        default=8000,
        validators=[MinValueValidator(1024), MaxValueValidator(60000)],
        help_text='Base port for Tor Control Ports (8000, 8001, ...)'
    )
    base_socks_port = models.IntegerField(
        default=9000,
        validators=[MinValueValidator(1024), MaxValueValidator(60000)],
        help_text='Base port for SOCKS proxies (9000, 9001, ...)'
    )
    base_or_port = models.IntegerField(
        default=5000,
        validators=[MinValueValidator(1024), MaxValueValidator(60000)],
        help_text='Base port for Onion Router Ports (5000, 5001, ...)'
    )
    base_dir_port = models.IntegerField(
        default=7000,
        validators=[MinValueValidator(1024), MaxValueValidator(60000)],
        help_text='Base port for Directory Ports (7000, 7001, ...)'
    )
    
    # === Tor Network Options ===
    testing_tor_network = models.BooleanField(
        default=True,
        help_text='TestingTorNetwork 1 - Speeds up bootstrap'
    )
    voting_interval = models.IntegerField(
        default=20,
        validators=[MinValueValidator(10), MaxValueValidator(300)],
        help_text='V3AuthVotingInterval in seconds (lower = faster bootstrap)'
    )
    assume_reachable = models.BooleanField(
        default=True,
        help_text='AssumeReachable 1 - Skips reachability tests'
    )
    
    # === Traffic Capture Settings ===
    capture_enabled = models.BooleanField(
        default=True,
        help_text='Enable traffic capture on all nodes'
    )
    capture_filter = models.CharField(
        max_length=200,
        blank=True,
        default='tcp port 5000-5100 or tcp port 9000-9100',
        help_text='tcpdump filter expression'
    )
    max_capture_size_mb = models.IntegerField(
        default=100,
        validators=[MinValueValidator(10), MaxValueValidator(10000)],
        help_text='Maximum capture size per node in MB'
    )
    capture_rotate_interval = models.IntegerField(
        default=3600,
        validators=[MinValueValidator(60), MaxValueValidator(86400)],
        help_text='Capture rotation interval in seconds'
    )
    
    # === Status ===
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NOT_CREATED
    )
    status_message = models.TextField(
        blank=True,
        help_text='Detailed status message or error'
    )
    bootstrap_progress = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text='Bootstrap progress in percent'
    )
    
    # === Consensus Info (after bootstrap) ===
    consensus_valid = models.BooleanField(
        default=False,
        help_text='Valid consensus available'
    )
    consensus_valid_after = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Consensus valid after'
    )
    consensus_fresh_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Consensus fresh until'
    )
    consensus_valid_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Consensus valid until'
    )
    
    # === Statistics ===
    total_circuits_created = models.PositiveIntegerField(default=0)
    total_bytes_transferred = models.BigIntegerField(default=0)
    total_cells_processed = models.BigIntegerField(default=0)
    
    # === Timestamps ===
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    stopped_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Tor Network'
        verbose_name_plural = 'Tor Networks'
    
    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"
    
    def save(self, *args, **kwargs):
        # Auto-generate slug
        if not self.slug:
            self.slug = re.sub(r'[^a-z0-9-]', '-', self.name.lower())
        
        # Auto-generate Docker network name
        if not self.docker_network_name:
            self.docker_network_name = f"chutney-{self.slug}"
        
        # Auto-generate container prefix
        if not self.container_prefix:
            self.container_prefix = f"chutney-{self.slug}"
        
        # Apply template defaults
        if self.template != self.NetworkTemplate.CUSTOM:
            self._apply_template_defaults()
        
        super().save(*args, **kwargs)
    
    def _apply_template_defaults(self):
        """Apply template defaults"""
        templates = {
            self.NetworkTemplate.MINIMAL: {
                'num_directory_authorities': 3,
                'num_guard_relays': 1,
                'num_middle_relays': 1,
                'num_exit_relays': 1,
                'num_clients': 1,
                'num_hidden_services': 0,
            },
            self.NetworkTemplate.BASIC: {
                'num_directory_authorities': 3,
                'num_guard_relays': 2,
                'num_middle_relays': 2,
                'num_exit_relays': 2,
                'num_clients': 2,
                'num_hidden_services': 0,
            },
            self.NetworkTemplate.STANDARD: {
                'num_directory_authorities': 3,
                'num_guard_relays': 3,
                'num_middle_relays': 3,
                'num_exit_relays': 3,
                'num_clients': 3,
                'num_hidden_services': 1,
            },
            self.NetworkTemplate.FORENSIC: {
                'num_directory_authorities': 3,
                'num_guard_relays': 4,
                'num_middle_relays': 4,
                'num_exit_relays': 4,
                'num_clients': 4,
                'num_hidden_services': 2,
                'capture_enabled': True,
            },
        }
        
        if self.template in templates:
            for key, value in templates[self.template].items():
                setattr(self, key, value)
    
    @property
    def total_nodes(self):
        """Total number of nodes"""
        return (
            self.num_directory_authorities +
            self.num_guard_relays +
            self.num_middle_relays +
            self.num_exit_relays +
            self.num_clients +
            self.num_hidden_services
        )
    
    @property
    def is_running(self):
        return self.status == self.Status.RUNNING
    
    @property
    def status_display(self):
        """Human-readable status with emoji"""
        status_map = {
            'not_created': '⚪ Not Created',
            'created': '🔵 Created',
            'creating': '🔵 Creating...',
            'bootstrapping': '🟡 Bootstrapping...',
            'running': '🟢 Running',
            'stopping': '🟡 Stopping...',
            'stopped': '🔴 Stopped',
            'error': '❌ Error',
        }
        return status_map.get(self.status, '❓ Unknown')
    
    @property
    def running_nodes_count(self):
        """Number of running nodes"""
        return self.nodes.filter(status=TorNode.Status.RUNNING).count()


class TorNode(models.Model):
    """
    A single Tor node in the private network.
    
    Node types:
    - DA (Directory Authority): Generates consensus
    - GUARD: Entry point for circuits
    - MIDDLE: Middle hop
    - EXIT: Exit point
    - CLIENT: SOCKS proxy for applications
    - HS (Hidden Service): .onion service host
    """
    
    class NodeType(models.TextChoices):
        DIRECTORY_AUTHORITY = 'da', 'Directory Authority'
        GUARD = 'guard', 'Guard Relay'
        MIDDLE = 'middle', 'Middle Relay'
        EXIT = 'exit', 'Exit Relay'
        CLIENT = 'client', 'Client (SOCKS Proxy)'
        HIDDEN_SERVICE = 'hs', 'Hidden Service'
    
    class Status(models.TextChoices):
        NOT_CREATED = 'not_created', 'Not Created'
        CREATED = 'created', 'Created'
        STARTING = 'starting', 'Starting...'
        BOOTSTRAPPING = 'bootstrapping', 'Bootstrapping...'
        RUNNING = 'running', 'Running'
        STOPPING = 'stopping', 'Stopping...'
        STOPPED = 'stopped', 'Stopped'
        ERROR = 'error', 'Error'
    
    # Tor Relay Flags (from consensus)
    class RelayFlags(models.TextChoices):
        AUTHORITY = 'Authority', 'Authority'
        BADEXIT = 'BadExit', 'Bad Exit'
        EXIT = 'Exit', 'Exit'
        FAST = 'Fast', 'Fast'
        GUARD = 'Guard', 'Guard'
        HSDIR = 'HSDir', 'Hidden Service Directory'
        RUNNING = 'Running', 'Running'
        STABLE = 'Stable', 'Stable'
        STALEDESC = 'StaleDesc', 'Stale Descriptor'
        V2DIR = 'V2Dir', 'V2 Directory'
        VALID = 'Valid', 'Valid'
    
    # === Identification ===
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    network = models.ForeignKey(
        TorNetwork,
        on_delete=models.CASCADE,
        related_name='nodes'
    )
    name = models.CharField(
        max_length=100,
        help_text='Node name (e.g. da1, guard1, exit2)'
    )
    node_type = models.CharField(
        max_length=10,
        choices=NodeType.choices,
        help_text='Type of Tor node'
    )
    index = models.PositiveIntegerField(
        default=0,
        help_text='Index within the type (0, 1, 2, ...)'
    )
    
    # === Docker Container ===
    container_id = models.CharField(
        max_length=64,
        blank=True,
        help_text='Docker Container ID'
    )
    container_name = models.CharField(
        max_length=100,
        blank=True,
        help_text='Docker Container Name'
    )
    
    # === Network Configuration ===
    control_port = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1024), MaxValueValidator(65535)],
        help_text='Tor Control Port'
    )
    socks_port = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1024), MaxValueValidator(65535)],
        help_text='SOCKS5 Proxy Port (clients only)'
    )
    or_port = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1024), MaxValueValidator(65535)],
        help_text='Onion Router Port'
    )
    dir_port = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1024), MaxValueValidator(65535)],
        help_text='Directory Port (DAs only)'
    )
    
    # === Tor Identity ===
    fingerprint = models.CharField(
        max_length=50,
        blank=True,
        help_text='Relay Fingerprint (40 hex chars)'
    )
    v3_identity = models.CharField(
        max_length=50,
        blank=True,
        help_text='V3 Authority Identity (DAs only)'
    )
    nickname = models.CharField(
        max_length=50,
        blank=True,
        help_text='Tor Relay Nickname'
    )
    
    # === Hidden Service (HS nodes only) ===
    onion_address = models.CharField(
        max_length=62,
        blank=True,
        help_text='.onion address (Hidden Services only)'
    )
    hs_port = models.IntegerField(
        null=True,
        blank=True,
        help_text='Hidden Service virtual port'
    )
    hs_target_port = models.IntegerField(
        null=True,
        blank=True,
        help_text='Hidden Service target port (localhost)'
    )
    
    # === Relay Flags (from consensus) ===
    flags = models.JSONField(
        default=list,
        blank=True,
        help_text='Relay flags from consensus'
    )
    
    # === Status ===
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NOT_CREATED
    )
    status_message = models.TextField(
        blank=True,
        help_text='Detailed status message'
    )
    bootstrap_progress = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text='Bootstrap progress in percent'
    )
    
    # === Traffic Capture ===
    capture_enabled = models.BooleanField(
        default=True,
        help_text='Traffic capture enabled for this node'
    )
    capture_interface = models.CharField(
        max_length=20,
        default='eth0',
        help_text='Network interface for capture'
    )
    capture_file_path = models.CharField(
        max_length=255,
        blank=True,
        help_text='Path to current capture file'
    )
    
    # === Statistics ===
    bytes_read = models.BigIntegerField(default=0, help_text='Bytes received')
    bytes_written = models.BigIntegerField(default=0, help_text='Bytes sent')
    circuits_created = models.PositiveIntegerField(default=0, help_text='Circuits created')
    circuits_active = models.PositiveIntegerField(default=0, help_text='Active circuits')
    
    # === Bandwidth (last measurement) ===
    bandwidth_rate = models.BigIntegerField(
        default=0,
        help_text='Current bandwidth (bytes/s)'
    )
    bandwidth_burst = models.BigIntegerField(
        default=0,
        help_text='Burst bandwidth (bytes/s)'
    )
    
    # === Timestamps ===
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['network', 'node_type', 'index']
        unique_together = ['network', 'name']
        verbose_name = 'Tor Node'
        verbose_name_plural = 'Tor Nodes'
    
    def __str__(self):
        return f"{self.name} ({self.get_node_type_display()}) - {self.network.name}"
    
    def save(self, *args, **kwargs):
        # Auto-generate container name
        if not self.container_name:
            self.container_name = f"{self.network.container_prefix}-{self.name}"
        
        # Auto-generate nickname
        if not self.nickname:
            self.nickname = f"{self.name.replace('-', '')}"
        
        super().save(*args, **kwargs)
    
    @property
    def is_running(self):
        return self.status == self.Status.RUNNING
    
    @property
    def is_relay(self):
        """Is this node a relay (DA, Guard, Middle, Exit)?"""
        return self.node_type in [
            self.NodeType.DIRECTORY_AUTHORITY,
            self.NodeType.GUARD,
            self.NodeType.MIDDLE,
            self.NodeType.EXIT,
        ]
    
    @property
    def status_display(self):
        """Human-readable status with emoji"""
        status_map = {
            'not_created': '⚪ Not Created',
            'created': '🔵 Created',
            'starting': '🟡 Starting...',
            'bootstrapping': '🟡 Bootstrapping...',
            'running': '🟢 Running',
            'stopping': '🟡 Stopping...',
            'stopped': '🔴 Stopped',
            'error': '❌ Error',
        }
        return status_map.get(self.status, '❓ Unknown')
    
    @property
    def node_type_icon(self):
        """Icon for node type"""
        icons = {
            'da': '🏛️',
            'guard': '🛡️',
            'middle': '🔀',
            'exit': '🚪',
            'client': '💻',
            'hs': '🧅',
        }
        return icons.get(self.node_type, '❓')
    
    @property
    def total_bandwidth(self):
        """Total transferred data"""
        return self.bytes_read + self.bytes_written


class TrafficCapture(models.Model):
    """
    A PCAP traffic capture from a Tor node.
    
    Stores metadata about captures for later analysis:
    - Timing correlation
    - Traffic fingerprinting
    - Circuit reconstruction
    """
    
    class CaptureStatus(models.TextChoices):
        RECORDING = 'recording', 'Recording'
        COMPLETED = 'completed', 'Completed'
        ANALYZING = 'analyzing', 'Analyzing...'
        ANALYZED = 'analyzed', 'Analyzed'
        ERROR = 'error', 'Error'
        DELETED = 'deleted', 'Deleted'
    
    class CaptureType(models.TextChoices):
        CONTINUOUS = 'continuous', 'Continuous Recording'
        TRIGGERED = 'triggered', 'Event Triggered'
        MANUAL = 'manual', 'Manual Capture'
        CIRCUIT = 'circuit', 'Circuit Specific'
    
    # === Identification ===
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    node = models.ForeignKey(
        TorNode,
        on_delete=models.CASCADE,
        related_name='captures'
    )
    name = models.CharField(
        max_length=100,
        help_text='Capture name (auto-generated)'
    )
    
    # === Capture Configuration ===
    capture_type = models.CharField(
        max_length=20,
        choices=CaptureType.choices,
        default=CaptureType.CONTINUOUS
    )
    filter_expression = models.CharField(
        max_length=500,
        blank=True,
        help_text='tcpdump/BPF filter expression'
    )
    interface = models.CharField(
        max_length=20,
        default='eth0',
        help_text='Capture interface'
    )
    
    # === File Info ===
    file_path = models.CharField(
        max_length=500,
        help_text='Path to PCAP file'
    )
    file_size_bytes = models.BigIntegerField(
        default=0,
        help_text='File size in bytes'
    )
    file_hash_sha256 = models.CharField(
        max_length=64,
        blank=True,
        help_text='SHA256 hash of file'
    )
    
    # === Time Period ===
    started_at = models.DateTimeField(
        help_text='Capture start'
    )
    stopped_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Capture end'
    )
    duration_seconds = models.IntegerField(
        default=0,
        help_text='Capture duration in seconds'
    )
    
    # === Statistics ===
    packet_count = models.BigIntegerField(
        default=0,
        help_text='Number of packets'
    )
    bytes_captured = models.BigIntegerField(
        default=0,
        help_text='Captured bytes'
    )
    packets_dropped = models.BigIntegerField(
        default=0,
        help_text='Dropped packets (kernel)'
    )
    
    # === Analysis Results ===
    status = models.CharField(
        max_length=20,
        choices=CaptureStatus.choices,
        default=CaptureStatus.RECORDING
    )
    
    # Detected flows
    unique_flows = models.IntegerField(
        default=0,
        help_text='Number of unique flows'
    )
    tor_cells_detected = models.BigIntegerField(
        default=0,
        help_text='Detected Tor cells (512 bytes)'
    )
    
    # Timing data for correlation
    first_packet_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp of first packet'
    )
    last_packet_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp of last packet'
    )
    avg_inter_packet_delay_ms = models.FloatField(
        null=True,
        blank=True,
        help_text='Average inter-packet delay'
    )
    
    # === Analysis Notes ===
    analysis_notes = models.TextField(
        blank=True,
        help_text='Analysis notes and findings'
    )
    
    # === Link to Circuits (optional) ===
    related_circuit_id = models.CharField(
        max_length=50,
        blank=True,
        help_text='Related Circuit ID (if known)'
    )
    
    # === Timestamps ===
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-started_at']
        verbose_name = 'Traffic Capture'
        verbose_name_plural = 'Traffic Captures'
    
    def __str__(self):
        return f"{self.name} - {self.node.name} ({self.get_status_display()})"
    
    @property
    def file_size_mb(self):
        """File size in MB"""
        return round(self.file_size_bytes / (1024 * 1024), 2)
    
    @property
    def packets_per_second(self):
        """Packets per second"""
        if self.duration_seconds > 0:
            return round(self.packet_count / self.duration_seconds, 2)
        return 0
    
    @property
    def is_recording(self):
        return self.status == self.CaptureStatus.RECORDING
    
    @property
    def status_display(self):
        """Human-readable status with emoji"""
        status_map = {
            'recording': '🔴 Recording',
            'completed': '✅ Completed',
            'analyzing': '🔍 Analyzing...',
            'analyzed': '📊 Analyzed',
            'error': '❌ Error',
            'deleted': '🗑️ Deleted',
        }
        return status_map.get(self.status, '❓ Unknown')


class CircuitEvent(models.Model):
    """
    Event in the lifecycle of a Tor circuit.
    
    Captured from Stem via Control Port for forensic analysis.
    """
    
    class EventType(models.TextChoices):
        LAUNCHED = 'launched', 'Circuit Launched'
        BUILT = 'built', 'Circuit Built'
        EXTENDED = 'extended', 'Circuit Extended'
        FAILED = 'failed', 'Circuit Failed'
        CLOSED = 'closed', 'Circuit Closed'
    
    class Purpose(models.TextChoices):
        GENERAL = 'general', 'General'
        HS_CLIENT_INTRO = 'hs_client_intro', 'HS Client Intro'
        HS_CLIENT_REND = 'hs_client_rend', 'HS Client Rendezvous'
        HS_SERVICE_INTRO = 'hs_service_intro', 'HS Service Intro'
        HS_SERVICE_REND = 'hs_service_rend', 'HS Service Rendezvous'
        TESTING = 'testing', 'Testing'
        CONTROLLER = 'controller', 'Controller'
    
    # === Identification ===
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    network = models.ForeignKey(
        TorNetwork,
        on_delete=models.CASCADE,
        related_name='circuit_events'
    )
    
    # === Circuit Info ===
    circuit_id = models.CharField(
        max_length=20,
        help_text='Tor Circuit ID'
    )
    event_type = models.CharField(
        max_length=20,
        choices=EventType.choices
    )
    purpose = models.CharField(
        max_length=30,
        choices=Purpose.choices,
        default=Purpose.GENERAL
    )
    
    # === Circuit Path ===
    # Stored as JSON: [{"fingerprint": "...", "nickname": "...", "ip": "..."}, ...]
    path = models.JSONField(
        default=list,
        help_text='Circuit path (list of hops)'
    )
    path_length = models.IntegerField(
        default=0,
        help_text='Number of hops'
    )
    
    # === Status ===
    status = models.CharField(
        max_length=50,
        blank=True,
        help_text='Circuit status string'
    )
    reason = models.CharField(
        max_length=100,
        blank=True,
        help_text='Reason for FAILED/CLOSED'
    )
    remote_reason = models.CharField(
        max_length=100,
        blank=True,
        help_text='Remote-side reason'
    )
    
    # === Timing ===
    event_time = models.DateTimeField(
        help_text='Event timestamp'
    )
    build_time_ms = models.IntegerField(
        null=True,
        blank=True,
        help_text='Circuit build time in ms (for BUILT events)'
    )
    
    # === Source Node ===
    source_node = models.ForeignKey(
        TorNode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='circuit_events',
        help_text='Node that reported the event'
    )
    
    # === Raw Event Data ===
    raw_event = models.TextField(
        blank=True,
        help_text='Raw event data from Stem'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-event_time']
        verbose_name = 'Circuit Event'
        verbose_name_plural = 'Circuit Events'
        indexes = [
            models.Index(fields=['network', 'circuit_id']),
            models.Index(fields=['event_time']),
            models.Index(fields=['event_type']),
        ]
    
    def __str__(self):
        return f"Circuit {self.circuit_id} - {self.get_event_type_display()}"
    
    @property
    def path_display(self):
        """Formatted path display"""
        if not self.path:
            return "No path"
        nicknames = [hop.get('nickname', '?') for hop in self.path]
        return " → ".join(nicknames)