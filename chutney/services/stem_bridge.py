"""
ChutneX Analytics - Stem Event Bridge
=====================================
Copyright (c) 2026 cannatoshi

Real-time bridge between Tor Control Ports (via stem) and Django Channels WebSockets.

Architecture:
    Tor Nodes (Control Port 9051)
           ↓ stem library
    StemEventBridge (Thread-safe Queue)
           ↓ async dispatcher
    Django Channels (group_send)
           ↓ WebSocket
    React Frontend (real-time updates)

Usage:
    from chutney.services.stem_bridge import ChutneXEventBridge
    
    bridge = ChutneXEventBridge(network_id='uuid-here')
    bridge.start()  # Connects to all nodes, starts event streaming
    bridge.stop()   # Graceful shutdown
"""

import asyncio
import json
import logging
import queue
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set
from uuid import UUID

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.utils import timezone

# Stem imports
try:
    from stem import Signal
    from stem.control import Controller, EventType
    from stem.response.events import (
        BandwidthEvent,
        CircuitEvent,
        StreamEvent,
        ORConnEvent,
        NetworkStatusEvent,
    )
    STEM_AVAILABLE = True
except ImportError:
    STEM_AVAILABLE = False
    logging.warning("stem library not available - Tor monitoring disabled")


logger = logging.getLogger('chutney.stem_bridge')


# =============================================================================
# CONSTANTS & CONFIGURATION
# =============================================================================

class EventCategory(str, Enum):
    """Event categories for filtering subscriptions"""
    BANDWIDTH = 'bandwidth'
    CIRCUIT = 'circuit'
    STREAM = 'stream'
    CONNECTION = 'connection'
    CONSENSUS = 'consensus'
    NODE_STATUS = 'node_status'
    ALERT = 'alert'


# Events we subscribe to on each Tor node
SUBSCRIBED_EVENTS = [
    EventType.BW,           # Bandwidth (1/second)
    EventType.CIRC,         # Circuit lifecycle
    EventType.STREAM,       # Stream events
    EventType.ORCONN,       # OR connection status
    EventType.NEWCONSENSUS, # New consensus received
    EventType.NS,           # Network status changes
]

# Batching configuration
BANDWIDTH_BATCH_INTERVAL = 1.0  # seconds
EVENT_QUEUE_MAX_SIZE = 10000
DISPATCHER_SLEEP_INTERVAL = 0.05  # 50ms


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class TorEvent:
    """Normalized event structure for WebSocket transmission"""
    event_type: str
    category: EventCategory
    node_id: str
    node_name: str
    timestamp: datetime
    data: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'event_type': self.event_type,
            'category': self.category.value,
            'node_id': self.node_id,
            'node_name': self.node_name,
            'timestamp': self.timestamp.isoformat(),
            'data': self.data,
        }


@dataclass
class NodeConnection:
    """Represents a connection to a single Tor node's Control Port"""
    node_id: str
    node_name: str
    node_type: str  # da, guard, middle, exit, client
    host: str
    control_port: int
    controller: Optional['Controller'] = None
    connected: bool = False
    last_seen: Optional[datetime] = None
    error_count: int = 0
    
    def __post_init__(self):
        self.lock = threading.Lock()


@dataclass
class BandwidthAccumulator:
    """Accumulates bandwidth samples for batched transmission"""
    node_id: str
    node_name: str
    bytes_read: int = 0
    bytes_written: int = 0
    sample_count: int = 0
    last_flush: float = field(default_factory=time.time)
    
    def add_sample(self, read: int, written: int):
        self.bytes_read += read
        self.bytes_written += written
        self.sample_count += 1
    
    def should_flush(self, interval: float = BANDWIDTH_BATCH_INTERVAL) -> bool:
        return (time.time() - self.last_flush) >= interval
    
    def flush(self) -> Dict[str, Any]:
        """Returns averaged data and resets accumulator"""
        avg_read = self.bytes_read // max(1, self.sample_count)
        avg_written = self.bytes_written // max(1, self.sample_count)
        
        result = {
            'bytes_read': self.bytes_read,
            'bytes_written': self.bytes_written,
            'avg_bytes_read': avg_read,
            'avg_bytes_written': avg_written,
            'sample_count': self.sample_count,
            'interval_seconds': time.time() - self.last_flush,
        }
        
        # Reset
        self.bytes_read = 0
        self.bytes_written = 0
        self.sample_count = 0
        self.last_flush = time.time()
        
        return result


# =============================================================================
# SINGLE NODE BRIDGE
# =============================================================================

class NodeEventBridge:
    """
    Bridge for a single Tor node.
    
    Connects to Control Port, subscribes to events, and forwards
    them to the parent ChutneXEventBridge's queue.
    """
    
    def __init__(
        self,
        node_id: str,
        node_name: str,
        node_type: str,
        host: str,
        control_port: int,
        event_queue: queue.Queue,
        password: Optional[str] = None,
    ):
        self.node_id = node_id
        self.node_name = node_name
        self.node_type = node_type
        self.host = host
        self.control_port = control_port
        self.event_queue = event_queue
        self.password = password
        
        self.controller: Optional[Controller] = None
        self.connected = False
        self.running = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        
        # Bandwidth batching
        self.bw_accumulator = BandwidthAccumulator(
            node_id=node_id,
            node_name=node_name
        )
        
        logger.info(f"NodeEventBridge initialized: {node_name} ({host}:{control_port})")
    
    def start(self):
        """Start the event bridge in a background thread"""
        if self.running:
            return
        
        self.running = True
        self._thread = threading.Thread(
            target=self._run,
            name=f"stem-bridge-{self.node_name}",
            daemon=True
        )
        self._thread.start()
    
    def stop(self):
        """Stop the event bridge gracefully"""
        self.running = False
        
        with self._lock:
            if self.controller:
                try:
                    self.controller.close()
                except Exception as e:
                    logger.warning(f"Error closing controller for {self.node_name}: {e}")
                self.controller = None
                self.connected = False
        
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5.0)
    
    def _run(self):
        """Main event loop - runs in background thread"""
        while self.running:
            try:
                if not self.connected:
                    self._connect()
                
                # Keep connection alive, flush bandwidth batches
                if self.connected and self.bw_accumulator.should_flush():
                    self._flush_bandwidth()
                
                time.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error in bridge loop for {self.node_name}: {e}")
                self.connected = False
                time.sleep(5.0)  # Backoff before retry
    
    def _connect(self):
        """Establish connection to Tor Control Port"""
        try:
            logger.info(f"Connecting to {self.node_name} at {self.host}:{self.control_port}")
            
            controller = Controller.from_port(
                address=self.host,
                port=self.control_port
            )
            
            # Authenticate
            if self.password:
                controller.authenticate(password=self.password)
            else:
                controller.authenticate()
            
            # Subscribe to events
            for event_type in SUBSCRIBED_EVENTS:
                controller.add_event_listener(
                    self._handle_event,
                    event_type
                )
            
            with self._lock:
                self.controller = controller
                self.connected = True
            
            logger.info(f"✓ Connected to {self.node_name}")
            
            # Send connection event
            self._enqueue_event(TorEvent(
                event_type='node_connected',
                category=EventCategory.NODE_STATUS,
                node_id=self.node_id,
                node_name=self.node_name,
                timestamp=timezone.now(),
                data={
                    'node_type': self.node_type,
                    'host': self.host,
                    'control_port': self.control_port,
                    'tor_version': str(controller.get_version()),
                }
            ))
            
        except Exception as e:
            logger.error(f"Failed to connect to {self.node_name}: {e}")
            self.connected = False
            raise
    
    def _handle_event(self, event):
        """
        Handle incoming stem event.
        
        CRITICAL: This runs in stem's event thread - keep it fast!
        No heavy operations, just normalize and enqueue.
        """
        try:
            if isinstance(event, BandwidthEvent):
                self._handle_bandwidth(event)
            elif isinstance(event, CircuitEvent):
                self._handle_circuit(event)
            elif isinstance(event, StreamEvent):
                self._handle_stream(event)
            elif isinstance(event, ORConnEvent):
                self._handle_orconn(event)
            else:
                self._handle_generic(event)
                
        except Exception as e:
            logger.error(f"Error handling event from {self.node_name}: {e}")
    
    def _handle_bandwidth(self, event: 'BandwidthEvent'):
        """Handle bandwidth event - accumulate for batching"""
        self.bw_accumulator.add_sample(event.read, event.written)
        
        # Flush if interval elapsed
        if self.bw_accumulator.should_flush():
            self._flush_bandwidth()
    
    def _flush_bandwidth(self):
        """Flush accumulated bandwidth data"""
        data = self.bw_accumulator.flush()
        
        self._enqueue_event(TorEvent(
            event_type='bandwidth',
            category=EventCategory.BANDWIDTH,
            node_id=self.node_id,
            node_name=self.node_name,
            timestamp=timezone.now(),
            data=data
        ))
    
    def _handle_circuit(self, event: 'CircuitEvent'):
        """Handle circuit lifecycle event"""
        # Extract path information
        path = []
        if event.path:
            for fingerprint, nickname in event.path:
                path.append({
                    'fingerprint': fingerprint,
                    'nickname': nickname or 'Unknown',
                })
        
        self._enqueue_event(TorEvent(
            event_type='circuit',
            category=EventCategory.CIRCUIT,
            node_id=self.node_id,
            node_name=self.node_name,
            timestamp=timezone.now(),
            data={
                'circuit_id': event.id,
                'status': str(event.status),
                'path': path,
                'path_length': len(path),
                'purpose': str(event.purpose) if event.purpose else None,
                'build_flags': list(event.build_flags) if event.build_flags else [],
                'reason': str(event.reason) if event.reason else None,
                'remote_reason': str(event.remote_reason) if event.remote_reason else None,
                'hs_state': str(event.hs_state) if hasattr(event, 'hs_state') and event.hs_state else None,
                'rend_query': event.rend_query if hasattr(event, 'rend_query') else None,
                'created': event.created.isoformat() if hasattr(event, 'created') and event.created else None,
            }
        ))
    
    def _handle_stream(self, event: 'StreamEvent'):
        """Handle stream event"""
        self._enqueue_event(TorEvent(
            event_type='stream',
            category=EventCategory.STREAM,
            node_id=self.node_id,
            node_name=self.node_name,
            timestamp=timezone.now(),
            data={
                'stream_id': event.id,
                'status': str(event.status),
                'circuit_id': event.circ_id,
                'target': event.target,
                'target_address': event.target_address,
                'target_port': event.target_port,
                'reason': str(event.reason) if event.reason else None,
                'remote_reason': str(event.remote_reason) if event.remote_reason else None,
                'purpose': str(event.purpose) if event.purpose else None,
            }
        ))
    
    def _handle_orconn(self, event: 'ORConnEvent'):
        """Handle OR connection event"""
        self._enqueue_event(TorEvent(
            event_type='or_connection',
            category=EventCategory.CONNECTION,
            node_id=self.node_id,
            node_name=self.node_name,
            timestamp=timezone.now(),
            data={
                'status': str(event.status),
                'endpoint': event.endpoint,
                'endpoint_fingerprint': event.endpoint_fingerprint,
                'endpoint_nickname': event.endpoint_nickname,
                'reason': str(event.reason) if event.reason else None,
                'conn_count': event.conn_count if hasattr(event, 'conn_count') else None,
            }
        ))
    
    def _handle_generic(self, event):
        """Handle any other event type"""
        event_type = type(event).__name__.lower().replace('event', '')
        
        self._enqueue_event(TorEvent(
            event_type=event_type,
            category=EventCategory.NODE_STATUS,
            node_id=self.node_id,
            node_name=self.node_name,
            timestamp=timezone.now(),
            data={
                'raw': str(event),
            }
        ))
    
    def _enqueue_event(self, event: TorEvent):
        """Add event to queue for async dispatch"""
        try:
            self.event_queue.put_nowait(event)
        except queue.Full:
            logger.warning(f"Event queue full, dropping event from {self.node_name}")
    
    # =========================================================================
    # PUBLIC API - Query methods (call from Django views/tasks)
    # =========================================================================
    
    def get_info(self, *params) -> Dict[str, str]:
        """Get info from Tor (GETINFO command)"""
        with self._lock:
            if not self.controller or not self.connected:
                return {}
            try:
                return {p: self.controller.get_info(p, default='') for p in params}
            except Exception as e:
                logger.error(f"get_info failed for {self.node_name}: {e}")
                return {}
    
    def get_circuits(self) -> List[Dict]:
        """Get all current circuits"""
        with self._lock:
            if not self.controller or not self.connected:
                return []
            try:
                circuits = []
                for circ in self.controller.get_circuits():
                    path = [{'fingerprint': fp, 'nickname': nn} for fp, nn in circ.path]
                    circuits.append({
                        'id': circ.id,
                        'status': str(circ.status),
                        'purpose': str(circ.purpose) if circ.purpose else None,
                        'path': path,
                        'build_flags': list(circ.build_flags) if circ.build_flags else [],
                    })
                return circuits
            except Exception as e:
                logger.error(f"get_circuits failed for {self.node_name}: {e}")
                return []
    
    def get_network_status(self) -> List[Dict]:
        """Get network status entries (relay descriptors)"""
        with self._lock:
            if not self.controller or not self.connected:
                return []
            try:
                entries = []
                for desc in self.controller.get_network_statuses():
                    entries.append({
                        'fingerprint': desc.fingerprint,
                        'nickname': desc.nickname,
                        'address': desc.address,
                        'or_port': desc.or_port,
                        'dir_port': desc.dir_port,
                        'flags': list(desc.flags) if desc.flags else [],
                        'bandwidth': desc.bandwidth if hasattr(desc, 'bandwidth') else None,
                    })
                return entries
            except Exception as e:
                logger.error(f"get_network_status failed for {self.node_name}: {e}")
                return []


# =============================================================================
# MAIN BRIDGE - Manages all nodes in a ChutneX network
# =============================================================================

class ChutneXEventBridge:
    """
    Central event bridge for an entire ChutneX private Tor network.
    
    Manages connections to all nodes and dispatches events to Django Channels.
    
    Usage:
        bridge = ChutneXEventBridge(network_id='uuid')
        bridge.start()
        
        # Later...
        bridge.stop()
    """
    
    def __init__(self, network_id: str, channel_group: Optional[str] = None):
        self.network_id = network_id
        self.channel_group = channel_group or f"chutnex_{network_id}"
        
        self.event_queue: queue.Queue = queue.Queue(maxsize=EVENT_QUEUE_MAX_SIZE)
        self.node_bridges: Dict[str, NodeEventBridge] = {}
        
        self._running = False
        self._dispatcher_thread: Optional[threading.Thread] = None
        self._dispatcher_task: Optional[asyncio.Task] = None
        
        logger.info(f"ChutneXEventBridge initialized for network {network_id}")
    
    def start(self):
        """Start the bridge - connects to all nodes and begins dispatching"""
        if self._running:
            logger.warning("Bridge already running")
            return
        
        if not STEM_AVAILABLE:
            logger.error("Cannot start bridge - stem library not available")
            return
        
        self._running = True
        
        # Load nodes from database and create bridges
        self._load_nodes()
        
        # Start all node bridges
        for bridge in self.node_bridges.values():
            bridge.start()
        
        # Start async dispatcher
        self._dispatcher_thread = threading.Thread(
            target=self._run_dispatcher,
            name=f"chutnex-dispatcher-{self.network_id}",
            daemon=True
        )
        self._dispatcher_thread.start()
        
        logger.info(f"ChutneX bridge started with {len(self.node_bridges)} nodes")
    
    def stop(self):
        """Stop the bridge gracefully"""
        self._running = False
        
        # Stop all node bridges
        for bridge in self.node_bridges.values():
            bridge.stop()
        
        # Wait for dispatcher
        if self._dispatcher_thread and self._dispatcher_thread.is_alive():
            self._dispatcher_thread.join(timeout=10.0)
        
        logger.info("ChutneX bridge stopped")
    
    def _load_nodes(self):
        """Load nodes from database and create bridges"""
        # Import here to avoid circular imports
        from chutney.models import TorNetwork, TorNode
        
        try:
            network = TorNetwork.objects.get(id=self.network_id)
            nodes = network.nodes.filter(
                status__in=['running', 'bootstrapping']
            )
            
            for node in nodes:
                # Determine host - container name if in Docker, localhost otherwise
                import os
                if os.environ.get('RUNNING_IN_DOCKER'):
                    host = node.container_name or f"chutnex-{network.slug}-{node.name}"
                else:
                    host = '127.0.0.1'
                
                bridge = NodeEventBridge(
                    node_id=str(node.id),
                    node_name=node.name,
                    node_type=node.node_type,
                    host=host,
                    control_port=node.control_port or 9051,
                    event_queue=self.event_queue,
                )
                self.node_bridges[str(node.id)] = bridge
            
            logger.info(f"Loaded {len(self.node_bridges)} nodes for network {network.name}")
            
        except TorNetwork.DoesNotExist:
            logger.error(f"Network {self.network_id} not found")
        except Exception as e:
            logger.error(f"Error loading nodes: {e}")
    
    def _run_dispatcher(self):
        """Run the async dispatcher in a new event loop"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            loop.run_until_complete(self._dispatch_events())
        finally:
            loop.close()
    
    async def _dispatch_events(self):
        """
        Async dispatcher - reads events from queue and sends to Django Channels.
        
        Runs in its own thread with its own event loop.
        """
        channel_layer = get_channel_layer()
        
        if not channel_layer:
            logger.error("No channel layer configured!")
            return
        
        logger.info(f"Dispatcher started, sending to group: {self.channel_group}")
        
        while self._running:
            try:
                # Non-blocking get with timeout
                try:
                    event = await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: self.event_queue.get(timeout=DISPATCHER_SLEEP_INTERVAL)
                    )
                except queue.Empty:
                    continue
                
                # Send to channel layer
                await channel_layer.group_send(
                    self.channel_group,
                    {
                        'type': 'tor_event',
                        'event': event.to_dict(),
                    }
                )
                
            except Exception as e:
                logger.error(f"Dispatcher error: {e}")
                await asyncio.sleep(1.0)
        
        logger.info("Dispatcher stopped")
    
    # =========================================================================
    # PUBLIC API
    # =========================================================================
    
    def get_node_bridge(self, node_id: str) -> Optional[NodeEventBridge]:
        """Get a specific node bridge"""
        return self.node_bridges.get(node_id)
    
    def get_all_circuits(self) -> Dict[str, List[Dict]]:
        """Get circuits from all connected nodes"""
        results = {}
        for node_id, bridge in self.node_bridges.items():
            if bridge.connected:
                results[node_id] = bridge.get_circuits()
        return results
    
    def get_network_stats(self) -> Dict[str, Any]:
        """Get aggregated network statistics"""
        connected = sum(1 for b in self.node_bridges.values() if b.connected)
        total = len(self.node_bridges)
        
        return {
            'network_id': self.network_id,
            'nodes_total': total,
            'nodes_connected': connected,
            'nodes_disconnected': total - connected,
            'queue_size': self.event_queue.qsize(),
            'queue_max': EVENT_QUEUE_MAX_SIZE,
        }
    
    def broadcast_snapshot(self):
        """Broadcast a full network snapshot (called periodically or on demand)"""
        # Get all data
        circuits = self.get_all_circuits()
        stats = self.get_network_stats()
        
        # Enqueue as special snapshot event
        snapshot_event = TorEvent(
            event_type='network_snapshot',
            category=EventCategory.NODE_STATUS,
            node_id='network',
            node_name=self.network_id,
            timestamp=timezone.now(),
            data={
                'stats': stats,
                'circuits': circuits,
            }
        )
        
        try:
            self.event_queue.put_nowait(snapshot_event)
        except queue.Full:
            logger.warning("Queue full, couldn't send snapshot")


# =============================================================================
# BRIDGE MANAGER - Singleton to manage all active bridges
# =============================================================================

class BridgeManager:
    """
    Singleton manager for all ChutneX event bridges.
    
    Usage:
        manager = BridgeManager()
        manager.start_bridge('network-uuid')
        manager.stop_bridge('network-uuid')
        manager.stop_all()
    """
    
    _instance: Optional['BridgeManager'] = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._bridges = {}
        return cls._instance
    
    def start_bridge(self, network_id: str) -> ChutneXEventBridge:
        """Start a bridge for a network (or return existing)"""
        if network_id in self._bridges:
            return self._bridges[network_id]
        
        bridge = ChutneXEventBridge(network_id)
        bridge.start()
        self._bridges[network_id] = bridge
        
        return bridge
    
    def stop_bridge(self, network_id: str):
        """Stop a specific bridge"""
        if network_id in self._bridges:
            self._bridges[network_id].stop()
            del self._bridges[network_id]
    
    def stop_all(self):
        """Stop all bridges"""
        for network_id in list(self._bridges.keys()):
            self.stop_bridge(network_id)
    
    def get_bridge(self, network_id: str) -> Optional[ChutneXEventBridge]:
        """Get an existing bridge"""
        return self._bridges.get(network_id)
    
    def list_bridges(self) -> List[str]:
        """List all active bridge network IDs"""
        return list(self._bridges.keys())


# Global instance
bridge_manager = BridgeManager()