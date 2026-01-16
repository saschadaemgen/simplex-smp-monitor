"""
ChutneX WebSocket Consumers
============================
Copyright (c) 2026 cannatoshi

WebSocket consumers for real-time Tor network analytics.
"""
import json
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer

logger = logging.getLogger(__name__)


class TorEventsConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for Tor network events.
    
    Path: ws/chutnex/<network_id>/events/
    """
    
    async def connect(self):
        self.network_id = self.scope['url_route']['kwargs']['network_id']
        self.group_name = f'chutnex_events_{self.network_id}'
        
        # Join group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
        
        logger.info(f"[ChutneX] Events WebSocket connected for network {self.network_id}")
        
        # Send initial connection message
        await self.send_json({
            'type': 'connection',
            'status': 'connected',
            'network_id': self.network_id,
        })
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        logger.info(f"[ChutneX] Events WebSocket disconnected for network {self.network_id}")
    
    async def receive_json(self, content):
        """Handle incoming messages from client."""
        msg_type = content.get('type')
        
        if msg_type == 'subscribe':
            categories = content.get('categories', [])
            await self.send_json({
                'type': 'subscribed',
                'categories': categories,
            })
        
        elif msg_type == 'ping':
            await self.send_json({'type': 'pong'})
        
        elif msg_type == 'request_snapshot':
            # Send current state snapshot
            await self.send_json({
                'type': 'snapshot',
                'data': {
                    'events': [],
                    'circuits': [],
                    'bandwidth': {},
                }
            })
    
    async def tor_event(self, event):
        """Receive event from channel layer and send to WebSocket."""
        await self.send_json(event['data'])
    
    async def bandwidth_update(self, event):
        """Receive bandwidth update from channel layer."""
        await self.send_json({
            'type': 'bandwidth',
            'data': event['data'],
        })
    
    async def circuit_update(self, event):
        """Receive circuit update from channel layer."""
        await self.send_json({
            'type': 'circuit',
            'data': event['data'],
        })


class TorAnalyticsConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for Tor analytics data.
    
    Path: ws/chutnex/<network_id>/analytics/
    """
    
    async def connect(self):
        self.network_id = self.scope['url_route']['kwargs']['network_id']
        self.group_name = f'chutnex_analytics_{self.network_id}'
        
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
        
        logger.info(f"[ChutneX] Analytics WebSocket connected for network {self.network_id}")
        
        await self.send_json({
            'type': 'connection',
            'status': 'connected',
            'network_id': self.network_id,
        })
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    async def receive_json(self, content):
        """Handle incoming messages."""
        msg_type = content.get('type')
        
        if msg_type == 'ping':
            await self.send_json({'type': 'pong'})
        
        elif msg_type == 'refresh':
            await self.send_json({
                'type': 'stats',
                'data': {
                    'nodes': 0,
                    'circuits': 0,
                    'bandwidth': {'read': 0, 'written': 0},
                }
            })
    
    async def analytics_update(self, event):
        """Receive analytics update from channel layer."""
        await self.send_json(event['data'])