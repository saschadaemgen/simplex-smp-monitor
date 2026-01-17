"""
SimpleX Event Bridge - WebSocket Listener Mode

Listens to real-time events from SimpleX CLI containers via WebSocket.
Processes message delivery events and updates the database accordingly.

Architecture:
    Browser (React :3001)
        ↕ WebSocket
    Django REST API (:8000)
        ↕ Redis Pub/Sub
    SimplexEventBridge ← YOU ARE HERE
        ↕ WebSocket :3031-3080
    SimpleX CLI Containers
        ↕ Tor/.onion
    SMP Servers

Event Types Handled:
    - newChatItems: Message received by a client
    - chatItemsStatusesUpdated: Delivery receipt (sent → delivered)
"""

import asyncio
import json
import logging
import re
from typing import Dict, Optional, Set
from channels.layers import get_channel_layer
from asgiref.sync import sync_to_async
from django.utils import timezone
from django.db.models import F

logger = logging.getLogger(__name__)

# Regex pattern to extract tracking ID from message content
# Matches: [msg_a1b2c3d4e5f6] at the start of a message
# Pattern for tracking IDs in messages:
# - Test messages: [test_0d52e84a_0000] (test_<uuid8>_<sequence>)
# - Regular messages: [msg_a1b2c3d4e5f6] (msg_<uuid12>)
TRACKING_ID_PATTERN = re.compile(r'^\[(test_[a-f0-9]{8}_\d{4}|msg_[a-f0-9]{12})\]\s*')


class SimplexEventBridge:
    """
    Bridge between SimpleX CLI containers and Django Channels.
    
    Uses persistent WebSocket connections to each running container
    to receive real-time events for message delivery tracking.
    
    Features:
        - Automatic connection management per client
        - Reconnection with exponential backoff
        - Tracking ID based message matching (reliable)
        - Fallback to content-based matching (legacy)
        - Real-time browser updates via Redis Channel Layer
    """
    
    def __init__(self):
        self.channel_layer = None
        self.running = False
        self.client_listeners: Dict[str, asyncio.Task] = {}
        self.connected_clients: Set[str] = set()
        
        # Reconnection settings
        self.min_reconnect_delay = 1.0    # Start with 1 second
        self.max_reconnect_delay = 60.0   # Max 60 seconds
        self.reconnect_delays: Dict[str, float] = {}
    
    async def start(self):
        """
        Main entry point. Starts the event bridge.
        Runs indefinitely, managing WebSocket listeners for all running clients.
        """
        self.channel_layer = get_channel_layer()
        self.running = True
        
        logger.info("🚀 SimplexEventBridge starting (WebSocket listener mode)...")
        
        while self.running:
            try:
                await self._manage_client_listeners()
                await self._broadcast_bridge_status()
                await asyncio.sleep(5)  # Check for new/stopped clients every 5s
            except Exception as e:
                logger.error(f"Bridge manager error: {e}")
                await asyncio.sleep(5)
        
        logger.info("SimplexEventBridge stopped")
    
    async def stop(self):
        """Stop the event bridge and all client listeners"""
        self.running = False
        
        # Cancel all listener tasks
        for slug, task in self.client_listeners.items():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        self.client_listeners.clear()
        self.connected_clients.clear()
        logger.info("SimplexEventBridge stopped, all listeners cancelled")
    
    # =========================================================================
    # Client Listener Management
    # =========================================================================
    
    async def _manage_client_listeners(self):
        """
        Ensures each running client has an active WebSocket listener.
        Removes listeners for clients that are no longer running.
        """
        running_clients = await self._get_running_clients()
        running_slugs = {c['slug'] for c in running_clients}
        
        # Start listeners for new clients
        for client in running_clients:
            slug = client['slug']
            if slug not in self.client_listeners or self.client_listeners[slug].done():
                logger.info(f"🔌 Starting listener for {client['name']} (:{client['websocket_port']})")
                task = asyncio.create_task(self._listen_to_client(client))
                self.client_listeners[slug] = task
        
        # Stop listeners for clients that are no longer running
        for slug in list(self.client_listeners.keys()):
            if slug not in running_slugs:
                logger.info(f"🔌 Stopping listener for {slug} (client no longer running)")
                self.client_listeners[slug].cancel()
                del self.client_listeners[slug]
                self.connected_clients.discard(slug)
                self.reconnect_delays.pop(slug, None)
    
    async def _listen_to_client(self, client: dict):
        """
        Persistent WebSocket listener for a single client.
        Automatically reconnects with exponential backoff on disconnect.
        
        Args:
            client: Dict with keys: id, slug, name, websocket_port
        """
        import websockets
        
        slug = client['slug']
        port = client['websocket_port']
        ws_url = client.get('websocket_url', f'ws://localhost:{port}')
        
        while self.running:
            try:
                async with websockets.connect(
                    ws_url,
                    ping_interval=20,
                    ping_timeout=10,
                    close_timeout=5
                ) as ws:
                    # Connected successfully
                    self.connected_clients.add(slug)
                    self.reconnect_delays[slug] = self.min_reconnect_delay
                    logger.info(f"📡 Listening: {client['name']} ({ws_url})")
                    
                    # Listen for events
                    async for message in ws:
                        try:
                            data = json.loads(message)
                            await self._process_event(client, data)
                        except json.JSONDecodeError:
                            logger.warning(f"Invalid JSON from {slug}: {message[:100]}")
                        except Exception as e:
                            logger.error(f"Event processing error ({slug}): {e}")
                            
            except asyncio.CancelledError:
                # Task was cancelled, exit gracefully
                self.connected_clients.discard(slug)
                raise
                
            except Exception as e:
                self.connected_clients.discard(slug)
                
                if not self.running:
                    break
                
                # Exponential backoff for reconnection
                delay = self.reconnect_delays.get(slug, self.min_reconnect_delay)
                logger.warning(f"Connection lost to {client['name']}: {e}. Reconnecting in {delay:.1f}s...")
                
                await asyncio.sleep(delay)
                
                # Increase delay for next time (exponential backoff)
                self.reconnect_delays[slug] = min(delay * 2, self.max_reconnect_delay)
    
    # =========================================================================
    # Event Processing
    # =========================================================================
    
    async def _process_event(self, client: dict, data: dict):
        """
        Routes incoming SimpleX events to appropriate handlers.
        
        Args:
            client: The client that received the event
            data: The parsed JSON event data
        """
        resp = data.get('resp', {})
        resp_type = resp.get('type', '')
        
        if resp_type == 'newChatItems':
            # New message received
            await self._handle_new_chat_items(client, resp)
            
        elif resp_type == 'chatItemsStatusesUpdated':
            # Delivery status update (sent → delivered)
            await self._handle_status_update(client, resp)
    
    async def _handle_new_chat_items(self, client: dict, resp: dict):
        """
        Handles newChatItems events - when a client receives a message.
        
        This is triggered on the RECIPIENT side when a message arrives.
        We need to:
        1. Increment the recipient's messages_received counter
        2. Find and mark the corresponding TestMessage as delivered
        3. Push updates to the browser
        
        Args:
            client: The recipient client
            resp: The response data containing chat items
        """
        chat_items = resp.get('chatItems', [])
        
        for item in chat_items:
            chat_item = item.get('chatItem', {})
            content = chat_item.get('content', {})
            
            # Only process received text messages
            if content.get('type') != 'rcvMsgContent':
                continue
            
            msg_content = content.get('msgContent', {})
            if msg_content.get('type') != 'text':
                continue
            
            text = msg_content.get('text', '')
            if not text:
                continue
            
            # Extract sender info
            chat_info = item.get('chatInfo', {})
            contact = chat_info.get('contact', {})
            sender_name = contact.get('localDisplayName', 'unknown')
            
            logger.info(f"📨 {client['name']} ← {sender_name}: \"{text[:50]}...\"")
            
            # Increment received counter
            await self._increment_received(client['slug'])
            
            # Try to find and mark the TestMessage as delivered
            tracking_id = self._extract_tracking_id(text)
            
            if tracking_id:
                # Preferred: Match by tracking ID (reliable)
                latency = await self._mark_message_delivered_by_tracking_id(tracking_id)
                if latency is not None:
                    logger.info(f"  ✓✓ Delivered (tracking: {tracking_id}, latency: {latency}ms)")
            else:
                # Fallback: Match by content (legacy, less reliable)
                latency = await self._mark_message_delivered_by_content(client['slug'], text)
                if latency is not None:
                    logger.info(f"  ✓✓ Delivered (content match, latency: {latency}ms)")
            
            # Push updates to browser
            await self._push_new_message_event(client['slug'], sender_name, text)
            await self._push_stats_update(client['slug'])
    
    async def _handle_status_update(self, client: dict, resp: dict):
        """
        Handles chatItemsStatusesUpdated events - delivery receipts.
        
        This is triggered on the SENDER side when their message status changes.
        Status flow: sndNew → sndSent (server ACK) → sndRcvd/sndRead (client ACK)
        
        Args:
            client: The sender client
            resp: The response data containing status updates
        """
        chat_items = resp.get('chatItems', [])
        
        for item in chat_items:
            chat_item = item.get('chatItem', {})
            meta = chat_item.get('meta', {})
            item_status = meta.get('itemStatus', {})
            status_type = item_status.get('type', '')
            
            # Extract message content
            content = chat_item.get('content', {})
            msg_content = content.get('msgContent', {})
            text = msg_content.get('text', '') if msg_content else ''
            
            if not text:
                continue
            
            # Extract tracking ID
            tracking_id = self._extract_tracking_id(text)
            
            # Handle server acknowledgment (sndSent = server received the message)
            if status_type == 'sndSent':
                logger.info(f"✓ {client['name']} → server: \"{text[:40]}...\"")
                if tracking_id:
                    latency = await self._mark_message_sent_by_tracking_id(tracking_id)
                    if latency is not None:
                        logger.info(f"  ✓ Server ACK (tracking: {tracking_id}, latency: {latency}ms)")
                    # FIXED: Always push status update for 'sent'
                    await self._push_message_status_event(tracking_id, 'sent', latency)
                continue
            
            # Handle client acknowledgment (sndRcvd/sndRead = recipient received/read)
            if status_type not in ['sndRcvd', 'sndRead']:
                continue
            
            logger.info(f"✓✓ {client['name']} delivery confirmed: \"{text[:40]}...\"")
            
            # Try to find and update the TestMessage
            latency = None
            
            if tracking_id:
                latency = await self._mark_message_delivered_by_tracking_id(tracking_id)
            else:
                latency = await self._mark_message_delivered_by_sender(client['slug'], text)
            
            # FIXED: Always push status update to browser (even if latency is None)
            # The frontend needs to know the message was delivered!
            await self._push_message_status_event(tracking_id, 'delivered', latency)
            
            # Also push stats update for the sender
            await self._push_stats_update(client['slug'])
    
    # =========================================================================
    # Tracking ID Extraction
    # =========================================================================
    
    def _extract_tracking_id(self, text: str) -> Optional[str]:
        """
        Extracts tracking ID from message content.
        
        Args:
            text: Message content, e.g. "[test_0d52e84a_0000] Hello" or "[msg_a1b2c3d4e5f6] Hello"
            
        Returns:
            Tracking ID (e.g. "test_0d52e84a_0000" or "msg_a1b2c3d4e5f6") or None if not found
        """
        match = TRACKING_ID_PATTERN.match(text)
        if match:
            return match.group(1)  # Return the full tracking ID
        return None
    
    # =========================================================================
    # Database Operations (sync_to_async wrapped)
    # =========================================================================
    
    @sync_to_async
    def _get_running_clients(self) -> list:
        """Fetch all running clients from database"""
        from clients.models import SimplexClient
        clients = SimplexClient.objects.filter(status=SimplexClient.Status.RUNNING)
        return [
            {
                'id': str(c.id),
                'slug': c.slug,
                'name': c.name,
                'websocket_port': c.websocket_port,
                'websocket_url': c.websocket_url,
            }
            for c in clients
        ]
    
    @sync_to_async
    def _increment_received(self, slug: str):
        """Increment messages_received counter for a client"""
        from clients.models import SimplexClient
        SimplexClient.objects.filter(slug=slug).update(
            messages_received=F('messages_received') + 1,
            last_active_at=timezone.now()
        )
    
    @sync_to_async
    def _mark_message_sent_by_tracking_id(self, tracking_id: str) -> Optional[int]:
        """
        Find and mark a message as sent (server received) using tracking ID.
        
        This is called when we receive the sndSent status update, indicating
        the SMP server has acknowledged receipt of the message.
        
        Note: Due to Tor latency, this may arrive AFTER the message is already
        delivered. In that case, we still update the server timestamp.
        
        Args:
            tracking_id: The unique tracking ID (e.g. "test_0d52e84a_0000")
            
        Returns:
            Latency to server in ms, or None if message not found
        """
        from clients.models import TestMessage
        
        try:
            # Accept sending, sent, OR delivered status (out-of-order events)
            msg = TestMessage.objects.get(
                tracking_id=tracking_id,
                delivery_status__in=['sending', 'sent', 'delivered']
            )
            msg.mark_sent()
            return msg.latency_to_server_ms
        except TestMessage.DoesNotExist:
            return None
        except TestMessage.MultipleObjectsReturned:
            logger.warning(f"Multiple messages with tracking_id {tracking_id}")
            return None
    
    @sync_to_async
    def _mark_message_delivered_by_tracking_id(self, tracking_id: str) -> Optional[int]:
        """
        Find and mark a message as delivered using tracking ID.
        
        Args:
            tracking_id: The unique tracking ID (e.g. "msg_a1b2c3d4e5f6")
            
        Returns:
            Total latency in ms, or None if message not found
        """
        from clients.models import TestMessage
        
        try:
            msg = TestMessage.objects.get(
                tracking_id=tracking_id,
                delivery_status__in=['sending', 'sent']
            )
            msg.mark_delivered()
            return msg.total_latency_ms
        except TestMessage.DoesNotExist:
            return None
        except TestMessage.MultipleObjectsReturned:
            # Should never happen with unique tracking_id, but handle it
            logger.warning(f"Multiple messages with tracking_id {tracking_id}")
            return None
    
    @sync_to_async
    def _mark_message_delivered_by_content(self, recipient_slug: str, content: str) -> Optional[int]:
        """
        Find and mark a message as delivered using content matching.
        This is a fallback for messages without tracking IDs.
        
        Args:
            recipient_slug: The recipient client's slug
            content: The message content
            
        Returns:
            Total latency in ms, or None if message not found
        """
        from clients.models import TestMessage
        
        msg = TestMessage.objects.filter(
            recipient__slug=recipient_slug,
            content=content,
            delivery_status__in=['sending', 'sent']
        ).order_by('-created_at').first()
        
        if msg:
            msg.mark_delivered()
            return msg.total_latency_ms
        return None
    
    @sync_to_async
    def _mark_message_delivered_by_sender(self, sender_slug: str, content: str) -> Optional[int]:
        """
        Find and mark a message as delivered using sender + content matching.
        Used when processing delivery receipts on the sender side.
        
        Args:
            sender_slug: The sender client's slug
            content: The message content
            
        Returns:
            Total latency in ms, or None if message not found
        """
        from clients.models import TestMessage
        
        msg = TestMessage.objects.filter(
            sender__slug=sender_slug,
            content=content,
            delivery_status__in=['sending', 'sent']
        ).order_by('-created_at').first()
        
        if msg:
            msg.mark_delivered()
            return msg.total_latency_ms
        return None
    
    @sync_to_async
    def _get_client_stats(self, slug: str) -> Optional[dict]:
        """Fetch current message stats for a client"""
        from clients.models import SimplexClient
        return SimplexClient.objects.filter(slug=slug).values(
            'messages_sent', 'messages_received'
        ).first()
    
    # =========================================================================
    # Browser Push Events (via Redis Channel Layer)
    # =========================================================================
    
    async def _broadcast_bridge_status(self):
        """Broadcast current bridge status to all connected browsers"""
        if not self.channel_layer:
            return
        
        try:
            await self.channel_layer.group_send(
                "clients_all",
                {
                    "type": "bridge_status",
                    "connected_clients": len(self.connected_clients),
                }
            )
        except Exception as e:
            logger.debug(f"Could not broadcast bridge status: {e}")
    
    async def _push_new_message_event(self, recipient_slug: str, sender_name: str, content: str):
        """Push new message notification to browser"""
        if not self.channel_layer:
            return
        
        try:
            # Remove tracking ID from content for display
            display_content = TRACKING_ID_PATTERN.sub('', content)
            
            await self.channel_layer.group_send(
                "clients_all",
                {
                    "type": "new_message",
                    "client_slug": recipient_slug,
                    "sender": sender_name,
                    "content": display_content[:100],
                    "timestamp": timezone.now().isoformat(),
                }
            )
        except Exception as e:
            logger.debug(f"Could not push new_message event: {e}")
    
    async def _push_stats_update(self, slug: str):
        """Push updated stats to browser"""
        if not self.channel_layer:
            return
        
        stats = await self._get_client_stats(slug)
        if not stats:
            return
        
        try:
            await self.channel_layer.group_send(
                "clients_all",
                {
                    "type": "client_stats",
                    "client_slug": slug,
                    "messages_sent": stats['messages_sent'],
                    "messages_received": stats['messages_received'],
                }
            )
        except Exception as e:
            logger.debug(f"Could not push stats update: {e}")
    
    async def _push_message_status_event(self, tracking_id: Optional[str], status: str, latency_ms: Optional[int]):
        """Push message status update to browser"""
        if not self.channel_layer:
            return
        
        try:
            await self.channel_layer.group_send(
                "clients_all",
                {
                    "type": "message_status",
                    "message_id": tracking_id or "",
                    "status": status,
                    "latency_ms": latency_ms,
                }
            )
        except Exception as e:
            logger.debug(f"Could not push message status: {e}")


# =============================================================================
# Singleton Pattern & Module-level Functions
# =============================================================================

_bridge: Optional[SimplexEventBridge] = None


def get_event_bridge() -> SimplexEventBridge:
    """Get or create the singleton EventBridge instance"""
    global _bridge
    if _bridge is None:
        _bridge = SimplexEventBridge()
    return _bridge


async def start_event_bridge():
    """Start the event bridge (called from apps.py on Django startup)"""
    bridge = get_event_bridge()
    await bridge.start()


async def stop_event_bridge():
    """Stop the event bridge (called on shutdown)"""
    global _bridge
    if _bridge:
        await _bridge.stop()
        _bridge = None