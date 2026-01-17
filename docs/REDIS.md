# Redis & Real-Time Guide

> **Developer Documentation for Redis, WebSocket & Live Updates**  
> Explains how Redis, Django Channels, and React work together  
> For detailed project structure see `DEVNOTES.md`  
> Last Updated: January 17, 2026

---

## Table of Contents

1. [Overview - The Big Picture](#1-overview---the-big-picture)
2. [Architecture Deep Dive](#2-architecture-deep-dive)
3. [Redis Fundamentals](#3-redis-fundamentals)
4. [Django Channels (Backend)](#4-django-channels-backend)
5. [Event Bridge (Container Listener)](#5-event-bridge-container-listener)
6. [Frontend Hooks (React)](#6-frontend-hooks-react)
7. [Batching for High-Frequency Updates](#7-batching-for-high-frequency-updates)
8. [Step-by-Step: Adding a New Event](#8-step-by-step-adding-a-new-event)
9. [Debugging & Troubleshooting](#9-debugging--troubleshooting)
10. [Performance Best Practices](#10-performance-best-practices)
11. [Event Reference](#11-event-reference)
12. [Code Examples](#12-code-examples)

---

## 1. Overview - The Big Picture

### 1.1 What Problem Does This Solve?

**Without Real-Time (Polling):**
```
Browser: "Any news?"     → Server: "No"
Browser: "Any news?"     → Server: "No"
Browser: "Any news?"     → Server: "Yes!"
Browser: "Any news?"     → Server: "No"
...
= Many wasted requests, high server load, delayed updates
```

**With Real-Time (Push via Redis):**
```
Browser: "I'm listening..."
                              *Message arrives*
                   Server → Browser: "New message!"
                              *Status changes*
                   Server → Browser: "Status: delivered!"
= Instant updates, minimal server load
```

### 1.2 The Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE DATA FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 1: Event Happens                                                  │
│  ─────────────────────                                                  │
│                                                                         │
│   ┌──────────────────┐                                                  │
│   │  SimpleX Client  │  ← Message received via Tor                      │
│   │    Container     │                                                  │
│   │  (Port 3031)     │                                                  │
│   └────────┬─────────┘                                                  │
│            │                                                            │
│            │ WebSocket Event (JSON)                                     │
│            ▼                                                            │
│                                                                         │
│  STEP 2: Event Bridge Catches It                                        │
│  ───────────────────────────────                                        │
│                                                                         │
│   ┌──────────────────┐                                                  │
│   │   Event Bridge   │  ← Listens to ALL running containers             │
│   │    (Python)      │  ← Processes: newChatItems, statusUpdated        │
│   │                  │  ← Updates database                              │
│   └────────┬─────────┘                                                  │
│            │                                                            │
│            │ channel_layer.group_send()                                 │
│            ▼                                                            │
│                                                                         │
│  STEP 3: Redis Distributes                                              │
│  ─────────────────────────                                              │
│                                                                         │
│   ┌──────────────────┐                                                  │
│   │      Redis       │  ← Pub/Sub message broker                        │
│   │   (Port 6379)    │  ← Delivers to all subscribers                   │
│   └────────┬─────────┘                                                  │
│            │                                                            │
│            │ Channel Layer                                              │
│            ▼                                                            │
│                                                                         │
│  STEP 4: Django Consumer Receives                                       │
│  ────────────────────────────────                                       │
│                                                                         │
│   ┌──────────────────┐                                                  │
│   │ Django Consumer  │  ← Receives from Redis                           │
│   │  (Channels)      │  ← Formats for browser                           │
│   └────────┬─────────┘                                                  │
│            │                                                            │
│            │ WebSocket /ws/clients/{slug}/                              │
│            ▼                                                            │
│                                                                         │
│  STEP 5: Browser Updates UI                                             │
│  ──────────────────────────                                             │
│                                                                         │
│   ┌──────────────────┐                                                  │
│   │  React Browser   │  ← useClientData hook receives                   │
│   │ (useClientData)  │  ← Direct state update (no DB query!)            │
│   │                  │  ← UI renders new data                           │
│   └──────────────────┘                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Component Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| **SimpleX Containers** | Docker (ports 3031-3080) | Chat clients that send/receive messages |
| **Event Bridge** | `clients/services/event_bridge.py` | Listens to containers, pushes to Redis |
| **Redis** | Docker (port 6379) | Message broker, distributes events |
| **Django Channels** | `clients/consumers.py` | WebSocket handlers for browsers |
| **React Hook** | `frontend/src/hooks/useClientData.ts` | State management with batching |

---

## 2. Architecture Deep Dive

### 2.1 Why Redis?

Redis serves as the **Channel Layer** - the glue between Django processes:

```
┌─────────────────────────────────────────────────────────────┐
│                    WHY WE NEED REDIS                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  WITHOUT REDIS:                                             │
│  ──────────────                                             │
│                                                             │
│   Event Bridge ──X──► Django Consumer                       │
│                                                             │
│   Problem: They're different processes!                     │
│   Event Bridge can't directly call Consumer methods.        │
│                                                             │
│                                                             │
│  WITH REDIS:                                                │
│  ───────────                                                │
│                                                             │
│   Event Bridge ────► Redis ────► Django Consumer            │
│                                                             │
│   Redis acts as message broker between processes.           │
│   Any process can publish, any process can subscribe.       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Groups and Channels

Django Channels uses **groups** to organize WebSocket connections:

```
┌─────────────────────────────────────────────────────────────┐
│                    GROUPS CONCEPT                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   GROUP: "clients_all"                                      │
│   ─────────────────────                                     │
│   All browsers watching any client                          │
│                                                             │
│      Browser 1 ─┐                                           │
│      Browser 2 ─┼──► GROUP "clients_all"                    │
│      Browser 3 ─┘                                           │
│                                                             │
│   When Event Bridge sends to "clients_all",                 │
│   ALL connected browsers receive it.                        │
│                                                             │
│                                                             │
│   GROUP: "client_{slug}"                                    │
│   ──────────────────────                                    │
│   Only browsers watching specific client                    │
│                                                             │
│      Browser viewing "alice" ──► GROUP "client_alice"       │
│      Browser viewing "bob"   ──► GROUP "client_bob"         │
│                                                             │
│   More targeted = less unnecessary traffic                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 File Locations

```
Backend (Django):
├── clients/
│   ├── consumers.py          # WebSocket handlers
│   ├── routing.py            # WebSocket URL routing
│   └── services/
│       └── event_bridge.py   # Container listener
├── config/
│   ├── settings.py           # CHANNEL_LAYERS config
│   └── asgi.py               # ASGI application

Frontend (React):
├── frontend/src/
│   └── hooks/
│       ├── useClientData.ts  # Combined hook (REST + WS + Batching)
│       └── useWebSocket.ts   # Base WebSocket hook
```

---

## 3. Redis Fundamentals

### 3.1 Configuration in Django

**File: `config/settings.py`**
```python
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [(os.environ.get("REDIS_HOST", "localhost"), 6379)],
            # Optional: Set capacity limits
            "capacity": 1500,          # Max messages in channel
            "expiry": 10,              # Message expiry in seconds
        },
    },
}
```

### 3.2 How Channel Layer Works

```python
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

channel_layer = get_channel_layer()

# PUBLISH to a group (all subscribers receive)
async_to_sync(channel_layer.group_send)(
    "clients_all",           # Group name
    {
        "type": "new_message",    # Method to call on consumer
        "client_slug": "alice",
        "content": "Hello!",
    }
)

# The "type" field is CRITICAL:
# - Django converts "new_message" to method "new_message"
# - Consumer must have a method with that exact name
```

### 3.3 Redis Commands for Debugging

```bash
# Connect to Redis CLI
docker exec -it simplex-monitor-redis redis-cli

# Check Redis is running
PING
# Expected: PONG

# Monitor all Redis commands in real-time
MONITOR
# Shows all pub/sub activity - useful for debugging!

# List all keys (channel layer uses these)
KEYS *

# Check memory usage
INFO memory
```

---

## 4. Django Channels (Backend)

### 4.1 ASGI Configuration

**File: `config/asgi.py`**
```python
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Import routing after Django setup
django_asgi_app = get_asgi_application()

from clients.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
```

### 4.2 WebSocket Routing

**File: `clients/routing.py`**
```python
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Overview page - all clients
    re_path(r'ws/clients/$', consumers.ClientUpdateConsumer.as_asgi()),
    
    # Detail page - specific client
    re_path(r'ws/clients/(?P<slug>[\w-]+)/$', consumers.ClientDetailConsumer.as_asgi()),
]
```

### 4.3 Consumer Implementation

**File: `clients/consumers.py`**
```python
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ClientDetailConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for client detail page.
    
    Lifecycle:
    1. connect() - Browser opens connection
    2. receive() - Browser sends message (ping, etc.)
    3. Various event handlers - Redis messages arrive
    4. disconnect() - Browser closes connection
    """
    
    async def connect(self):
        """Called when browser connects"""
        self.slug = self.scope['url_route']['kwargs']['slug']
        self.group_name = f"client_{self.slug}"
        
        # Join group for this specific client
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        # Also join the "all clients" group
        await self.channel_layer.group_add(
            "clients_all",
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        """Called when browser disconnects"""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        await self.channel_layer.group_discard(
            "clients_all",
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Called when browser sends a message"""
        data = json.loads(text_data)
        
        if data.get('action') == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}))
    
    # =========================================================================
    # EVENT HANDLERS - Called by Redis via channel_layer.group_send()
    # =========================================================================
    # 
    # IMPORTANT: Method name MUST match the "type" field in group_send!
    # "type": "new_message" → async def new_message(self, event)
    # "type": "client_stats" → async def client_stats(self, event)
    # =========================================================================
    
    async def new_message(self, event):
        """
        Handle new message event from Event Bridge.
        
        Event structure:
        {
            "type": "new_message",
            "client_slug": "alice",
            "sender": "bob",
            "content": "Hello!",
            "timestamp": "2026-01-17T10:30:00Z"
        }
        """
        await self.send(text_data=json.dumps(event))
    
    async def message_status(self, event):
        """Handle message status update (sent → delivered)"""
        await self.send(text_data=json.dumps(event))
    
    async def client_stats(self, event):
        """Handle client statistics update"""
        await self.send(text_data=json.dumps(event))
    
    async def bridge_status(self, event):
        """Handle Event Bridge status update"""
        await self.send(text_data=json.dumps(event))
    
    async def connection_created(self, event):
        """Handle new connection between clients"""
        await self.send(text_data=json.dumps(event))
    
    async def connection_deleted(self, event):
        """Handle deleted connection"""
        await self.send(text_data=json.dumps(event))
```

### 4.4 Key Points

1. **Method names matter**: `"type": "new_message"` calls `async def new_message()`
2. **Groups for targeting**: Use specific groups to avoid broadcasting everything
3. **Always call `await self.send()`**: This sends to the browser
4. **JSON encoding**: Always `json.dumps()` before sending

---

## 5. Event Bridge (Container Listener)

### 5.1 What Event Bridge Does

```
┌─────────────────────────────────────────────────────────────┐
│                    EVENT BRIDGE ROLE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. DISCOVERS running SimpleX containers                   │
│   2. CONNECTS to each via WebSocket (port 3031, 3032...)    │
│   3. LISTENS for events from SimpleX CLI                    │
│   4. PROCESSES events (update database)                     │
│   5. BROADCASTS to browsers via Redis                       │
│                                                             │
│   Running containers:                                       │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐                    │
│   │ alice   │  │  bob    │  │ charlie │                    │
│   │ :3031   │  │ :3032   │  │ :3033   │                    │
│   └────┬────┘  └────┬────┘  └────┬────┘                    │
│        │            │            │                          │
│        └────────────┼────────────┘                          │
│                     │                                       │
│                     ▼                                       │
│              ┌─────────────┐                                │
│              │ Event Bridge│                                │
│              │  (1 process)│                                │
│              └─────────────┘                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Core Implementation

**File: `clients/services/event_bridge.py`**
```python
class SimplexEventBridge:
    """
    Bridge between SimpleX CLI containers and Django Channels.
    
    Uses persistent WebSocket connections to each running container
    to receive real-time events for message delivery tracking.
    """
    
    def __init__(self):
        self.channel_layer = None
        self.running = False
        self.client_listeners: Dict[str, asyncio.Task] = {}
        self.connected_clients: Set[str] = set()
    
    async def start(self):
        """Main entry point. Runs indefinitely."""
        self.channel_layer = get_channel_layer()
        self.running = True
        
        while self.running:
            await self._manage_client_listeners()
            await self._broadcast_bridge_status()
            await asyncio.sleep(5)  # Check for new clients every 5s
    
    async def _listen_to_client(self, client: dict):
        """Persistent WebSocket listener for a single client."""
        async with websockets.connect(client['websocket_url']) as ws:
            async for message in ws:
                data = json.loads(message)
                await self._process_event(client, data)
    
    async def _process_event(self, client: dict, data: dict):
        """Route incoming SimpleX events to appropriate handlers."""
        resp = data.get('resp', {})
        resp_type = resp.get('type', '')
        
        if resp_type == 'newChatItems':
            await self._handle_new_chat_items(client, resp)
        elif resp_type == 'chatItemsStatusesUpdated':
            await self._handle_status_update(client, resp)
```

### 5.3 Pushing Events to Redis

```python
async def _push_new_message_event(self, recipient_slug: str, sender: str, content: str):
    """Push new message notification to all browsers."""
    if not self.channel_layer:
        return
    
    await self.channel_layer.group_send(
        "clients_all",  # Group name
        {
            "type": "new_message",  # Consumer method to call
            "client_slug": recipient_slug,
            "sender": sender,
            "content": content[:100],  # Truncate for preview
            "timestamp": timezone.now().isoformat(),
        }
    )

async def _push_message_status_event(self, tracking_id: str, status: str, latency_ms: int):
    """Push message status update to browsers."""
    await self.channel_layer.group_send(
        "clients_all",
        {
            "type": "message_status",
            "message_id": tracking_id,
            "status": status,
            "latency_ms": latency_ms,
        }
    )

async def _push_stats_update(self, slug: str):
    """Push updated statistics to browsers."""
    stats = await self._get_client_stats(slug)
    
    await self.channel_layer.group_send(
        "clients_all",
        {
            "type": "client_stats",
            "client_slug": slug,
            "messages_sent": stats['messages_sent'],
            "messages_received": stats['messages_received'],
        }
    )
```

---

## 6. Frontend Hooks (React)

### 6.1 The Combined Hook Approach

**Old approach (BAD):**
```typescript
// Multiple separate hooks
const { data: client } = useApi('/clients/1');
const { connectionState } = useWebSocket('/ws/clients/1');
const [messages, setMessages] = useState([]);

// WebSocket triggers DB refetch = SLOW!
onNewMessage: () => fetchMessages()  // ❌ 100 DB queries/sec at high volume
```

**New approach (GOOD):**
```typescript
// One combined hook
const {
  client,
  sentMessages,
  receivedMessages,
  connectionState,
  actions
} = useClientData(clientId);

// Direct state updates = FAST!
onNewMessage: (event) => addToState(event)  // ✅ No DB query
```

### 6.2 Hook Structure

**File: `frontend/src/hooks/useClientData.ts`**
```typescript
export function useClientData(clientId: string | undefined): UseClientDataReturn {
  
  // =========================================================================
  // STATE
  // =========================================================================
  
  const [client, setClient] = useState<SimplexClient | null>(null);
  const [sentMessages, setSentMessages] = useState<LiveMessage[]>([]);
  const [receivedMessages, setReceivedMessages] = useState<LiveMessage[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  
  // =========================================================================
  // WEBSOCKET CONNECTION
  // =========================================================================
  
  useEffect(() => {
    if (!client?.slug) return;
    
    const ws = new WebSocket(getWsUrl(client.slug));
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'new_message':
          // DIRECT STATE UPDATE - no DB query!
          handleNewMessage(data);
          break;
          
        case 'message_status':
          // DIRECT STATE UPDATE - no DB query!
          handleStatusUpdate(data);
          break;
          
        case 'client_stats':
          // Update client stats directly
          setClient(prev => ({...prev, ...data}));
          break;
      }
    };
    
    return () => ws.close();
  }, [client?.slug]);
  
  // =========================================================================
  // DIRECT STATE UPDATE HANDLERS
  // =========================================================================
  
  const handleNewMessage = (event: NewMessageEvent) => {
    const message: LiveMessage = {
      id: crypto.randomUUID(),
      direction: 'received',
      sender_name: event.sender,
      content: event.content,
      delivery_status: 'delivered',
      created_at: event.timestamp,
    };
    
    // Add to state directly - NO database query!
    setReceivedMessages(prev => [message, ...prev].slice(0, 500));
    
    // Update counter
    setClient(prev => prev ? {
      ...prev,
      messages_received: prev.messages_received + 1,
    } : prev);
  };
  
  const handleStatusUpdate = (event: MessageStatusEvent) => {
    // Update message status in state directly
    setSentMessages(prev => prev.map(msg => 
      msg.tracking_id === event.message_id
        ? { ...msg, delivery_status: event.status, total_latency_ms: event.latency_ms }
        : msg
    ));
  };
  
  return {
    client,
    sentMessages,
    receivedMessages,
    connectionState,
    // ...actions
  };
}
```

### 6.3 WebSocket URL Construction

```typescript
function getWsUrl(clientSlug: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  
  // In development, Vite runs on 5173 but Django/WebSocket on 8000
  const port = import.meta.env.DEV ? '8000' : window.location.port;
  
  return `${protocol}//${host}:${port}/ws/clients/${clientSlug}/`;
}
```

---

## 7. Batching for High-Frequency Updates

### 7.1 The Problem

At 100+ messages per second:
```
Message 1 → setState() → React render
Message 2 → setState() → React render
Message 3 → setState() → React render
...
= 100 renders per second = Browser freezes!
```

### 7.2 The Solution: Batching

```
Message 1 ─┐
Message 2 ─┼─► Collect for 50ms ─► Single setState() ─► 1 render
Message 3 ─┘

= 20 renders per second with ~5 messages each = Smooth!
```

### 7.3 Implementation

```typescript
// Batch configuration
const BATCH_INTERVAL_MS = 50;     // Collect for 50ms
const MAX_PENDING_BATCH = 100;    // Force flush if too many pending

// Pending batches (refs, not state - no re-renders!)
const pendingReceived = useRef<LiveMessage[]>([]);
const pendingStatusUpdates = useRef<Map<string, StatusUpdate>>(new Map());
const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

// Schedule batch flush
const scheduleBatch = useCallback(() => {
  // Force flush if too many pending
  if (pendingReceived.current.length >= MAX_PENDING_BATCH) {
    flushBatch();
    return;
  }
  
  // Schedule if not already scheduled
  if (!batchTimer.current) {
    batchTimer.current = setTimeout(flushBatch, BATCH_INTERVAL_MS);
  }
}, []);

// Flush all pending updates in one render
const flushBatch = useCallback(() => {
  batchTimer.current = null;
  
  const newReceived = pendingReceived.current;
  const statusUpdates = pendingStatusUpdates.current;
  
  // Clear pending
  pendingReceived.current = [];
  pendingStatusUpdates.current = new Map();
  
  // Apply all at once - single render!
  if (newReceived.length > 0) {
    setReceivedMessages(prev => [...newReceived, ...prev].slice(0, 500));
  }
  
  if (statusUpdates.size > 0) {
    setSentMessages(prev => prev.map(msg => {
      const update = statusUpdates.get(msg.tracking_id);
      return update ? { ...msg, ...update } : msg;
    }));
  }
}, []);

// Event handler adds to batch, doesn't trigger render
const handleNewMessage = (event: NewMessageEvent) => {
  pendingReceived.current.push({...});
  scheduleBatch();  // Will render in max 50ms
};
```

### 7.4 Batching Visualization

```
TIME ──────────────────────────────────────────────────────────────→

     0ms    10ms   20ms   30ms   40ms   50ms   60ms   70ms
      │      │      │      │      │      │      │      │
      │      │      │      │      │      │      │      │
   msg1   msg2   msg3   msg4   msg5      │   msg6   msg7
      │      │      │      │      │      │      │      │
      └──────┴──────┴──────┴──────┴──────┤      └──────┴───→
                                         │
                                    FLUSH BATCH
                                    [msg1, msg2, msg3, msg4, msg5]
                                    → Single Render


WITHOUT BATCHING:  5 messages = 5 renders in 50ms = 100 renders/sec
WITH BATCHING:     5 messages = 1 render  in 50ms =  20 renders/sec
```

---

## 8. Step-by-Step: Adding a New Event

### 8.1 Example: Adding "client_started" Event

**Goal:** Notify browsers when a client container starts.

### Step 1: Event Bridge - Push the Event

**File: `clients/services/event_bridge.py`**
```python
async def _on_client_connected(self, client: dict):
    """Called when Event Bridge connects to a client container."""
    self.connected_clients.add(client['slug'])
    
    # NEW: Push event to browsers
    await self.channel_layer.group_send(
        "clients_all",
        {
            "type": "client_started",  # Must match consumer method!
            "client_slug": client['slug'],
            "client_name": client['name'],
            "timestamp": timezone.now().isoformat(),
        }
    )
```

### Step 2: Consumer - Handle the Event

**File: `clients/consumers.py`**
```python
class ClientDetailConsumer(AsyncWebsocketConsumer):
    # ... existing code ...
    
    # NEW: Add handler method
    async def client_started(self, event):
        """Handle client started event."""
        await self.send(text_data=json.dumps(event))
```

### Step 3: TypeScript - Define the Type

**File: `frontend/src/hooks/useClientData.ts`**
```typescript
// Add to event types
export interface ClientStartedEvent {
  type: 'client_started';
  client_slug: string;
  client_name: string;
  timestamp: string;
}

// Add to union type
export type WebSocketEvent = 
  | NewMessageEvent 
  | MessageStatusEvent 
  | ClientStatsEvent
  | ClientStartedEvent;  // NEW
```

### Step 4: Hook - Handle the Event

**File: `frontend/src/hooks/useClientData.ts`**
```typescript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    // ... existing cases ...
    
    case 'client_started':
      // Update client status
      if (data.client_slug === client?.slug) {
        setClient(prev => prev ? {
          ...prev,
          status: 'running',
        } : prev);
      }
      // Optional: Show toast notification
      showToast(`${data.client_name} started`);
      break;
  }
};
```

### 8.2 Checklist for New Events

- [ ] Define event structure (what data to send)
- [ ] Event Bridge: Add `group_send()` call
- [ ] Consumer: Add handler method (name matches `type`)
- [ ] TypeScript: Add interface for event
- [ ] Hook: Add `case` in switch statement
- [ ] Test: Verify event flows end-to-end

---

## 9. Debugging & Troubleshooting

### 9.1 Check Redis Connection

```bash
# Is Redis running?
docker exec simplex-monitor-redis redis-cli PING
# Expected: PONG

# Monitor all Redis traffic
docker exec -it simplex-monitor-redis redis-cli MONITOR
# You'll see all pub/sub messages in real-time
```

### 9.2 Check WebSocket Connection

```javascript
// In browser console
const ws = new WebSocket('ws://localhost:8000/ws/clients/alice/');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Message:', JSON.parse(e.data));
ws.onerror = (e) => console.error('Error:', e);
```

### 9.3 Check Event Bridge

```bash
# View Event Bridge logs
docker compose logs app | grep -i "event\|bridge\|websocket"

# Check if bridge is connected to clients
docker compose logs app | grep "📡 Listening"
```

### 9.4 Common Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| WebSocket won't connect | Wrong URL | Check port (8000 in dev) |
| Events not arriving | Consumer method name wrong | Must match `type` field exactly |
| Events arriving but no UI update | Not calling setState | Add state update in handler |
| Slow at high volume | Not using batching | Implement 50ms batching |
| Memory leak | Not closing WebSocket | Add cleanup in useEffect return |

### 9.5 Debug Logging

**Backend (Event Bridge):**
```python
import logging
logger = logging.getLogger(__name__)

async def _push_new_message_event(self, ...):
    logger.info(f"📤 Pushing new_message event: {recipient_slug}")
    await self.channel_layer.group_send(...)
```

**Frontend (Hook):**
```typescript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('📥 WebSocket event:', data.type, data);
  // ... handle event
};
```

---

## 10. Performance Best Practices

### 10.1 DO's ✅

```typescript
// ✅ Use refs for pending batches (no re-renders)
const pendingMessages = useRef<Message[]>([]);

// ✅ Batch updates
scheduleBatch();  // Collects for 50ms, then single render

// ✅ Limit array sizes
setMessages(prev => [...newMsgs, ...prev].slice(0, 500));

// ✅ Use specific groups
group_send("client_alice", ...)  // Only browsers viewing Alice

// ✅ Clean up WebSocket
useEffect(() => {
  const ws = new WebSocket(url);
  return () => ws.close();  // Cleanup!
}, []);
```

### 10.2 DON'Ts ❌

```typescript
// ❌ Don't fetch on every event
onNewMessage: () => fetchMessages()  // 100 DB queries/sec!

// ❌ Don't store pending in state
const [pending, setPending] = useState([]);  // Causes re-renders!

// ❌ Don't broadcast everything
group_send("clients_all", ...)  // When only one client cares

// ❌ Don't forget cleanup
useEffect(() => {
  const ws = new WebSocket(url);
  // Missing return () => ws.close()  // Memory leak!
}, []);

// ❌ Don't keep unlimited messages
setMessages(prev => [...prev, newMsg]);  // Grows forever!
```

### 10.3 Performance Comparison

```
Scenario: 100 messages/second

BAD (DB refetch per event):
───────────────────────────
100 WebSocket events
× 1 DB query each
× ~10ms per query
= 1000ms of DB queries/second
= Server overload, UI lag

GOOD (Direct state + batching):
───────────────────────────────
100 WebSocket events
÷ 50ms batches
= 20 batches/second
× 1 render each
= 20 renders/second
= Smooth UI, minimal server load
```

---

## 11. Event Reference

### 11.1 All Event Types

| Event Type | Source | Purpose | Data Fields |
|------------|--------|---------|-------------|
| `bridge_status` | Event Bridge | Bridge health | `connected_clients` |
| `client_stats` | Event Bridge | Message counters | `client_slug`, `messages_sent`, `messages_received` |
| `new_message` | Event Bridge | Message received | `client_slug`, `sender`, `content`, `timestamp` |
| `message_status` | Event Bridge | Delivery status | `message_id`, `status`, `latency_ms` |
| `connection_created` | API | New client connection | `client_a_slug`, `client_b_slug`, ... |
| `connection_deleted` | API | Connection removed | `connection_id`, `client_a_slug` |

### 11.2 Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EVENT FLOW BY TYPE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  new_message:                                                           │
│  ────────────                                                           │
│  Container receives message                                             │
│       ↓                                                                 │
│  Event Bridge: _handle_new_chat_items()                                 │
│       ↓                                                                 │
│  Database: increment messages_received                                  │
│       ↓                                                                 │
│  Redis: group_send("clients_all", {type: "new_message", ...})           │
│       ↓                                                                 │
│  Consumer: new_message() → send to browser                              │
│       ↓                                                                 │
│  Hook: handleNewMessage() → add to state                                │
│       ↓                                                                 │
│  UI: New message appears                                                │
│                                                                         │
│                                                                         │
│  message_status:                                                        │
│  ───────────────                                                        │
│  Container receives delivery confirmation                               │
│       ↓                                                                 │
│  Event Bridge: _handle_status_update()                                  │
│       ↓                                                                 │
│  Database: mark message as delivered, record latency                    │
│       ↓                                                                 │
│  Redis: group_send("clients_all", {type: "message_status", ...})        │
│       ↓                                                                 │
│  Consumer: message_status() → send to browser                           │
│       ↓                                                                 │
│  Hook: handleStatusUpdate() → update message in state                   │
│       ↓                                                                 │
│  UI: ✓ changes to ✓✓                                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Code Examples

### 12.1 Complete Consumer

```python
# clients/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ClientDetailConsumer(AsyncWebsocketConsumer):
    
    async def connect(self):
        self.slug = self.scope['url_route']['kwargs']['slug']
        
        await self.channel_layer.group_add(f"client_{self.slug}", self.channel_name)
        await self.channel_layer.group_add("clients_all", self.channel_name)
        
        await self.accept()
        await self.send(text_data=json.dumps({
            'type': 'connected',
            'message': f'Connected to {self.slug}'
        }))
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(f"client_{self.slug}", self.channel_name)
        await self.channel_layer.group_discard("clients_all", self.channel_name)
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get('action') == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}))
    
    # Event handlers - name MUST match "type" field
    async def new_message(self, event):
        await self.send(text_data=json.dumps(event))
    
    async def message_status(self, event):
        await self.send(text_data=json.dumps(event))
    
    async def client_stats(self, event):
        await self.send(text_data=json.dumps(event))
    
    async def bridge_status(self, event):
        await self.send(text_data=json.dumps(event))
    
    async def connection_created(self, event):
        await self.send(text_data=json.dumps(event))
    
    async def connection_deleted(self, event):
        await self.send(text_data=json.dumps(event))
```

### 12.2 Push Event from Anywhere in Django

```python
# Can be used in views, management commands, signals, etc.
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

def notify_browsers_of_something():
    channel_layer = get_channel_layer()
    
    async_to_sync(channel_layer.group_send)(
        "clients_all",
        {
            "type": "custom_event",
            "data": "whatever you want",
        }
    )
```

### 12.3 Complete Hook with Batching

```typescript
// frontend/src/hooks/useClientData.ts
import { useState, useEffect, useCallback, useRef } from 'react';

const BATCH_INTERVAL_MS = 50;
const MAX_MESSAGES = 500;

export function useClientData(clientId: string | undefined) {
  // State
  const [client, setClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [connectionState, setConnectionState] = useState('disconnected');
  
  // Batching refs (not state!)
  const pendingMessages = useRef([]);
  const batchTimer = useRef(null);
  
  // Flush batch
  const flushBatch = useCallback(() => {
    batchTimer.current = null;
    const pending = pendingMessages.current;
    pendingMessages.current = [];
    
    if (pending.length > 0) {
      setMessages(prev => [...pending, ...prev].slice(0, MAX_MESSAGES));
    }
  }, []);
  
  // Schedule batch
  const scheduleBatch = useCallback(() => {
    if (!batchTimer.current) {
      batchTimer.current = setTimeout(flushBatch, BATCH_INTERVAL_MS);
    }
  }, [flushBatch]);
  
  // WebSocket connection
  useEffect(() => {
    if (!clientId) return;
    
    const ws = new WebSocket(`ws://localhost:8000/ws/clients/${clientId}/`);
    
    ws.onopen = () => setConnectionState('connected');
    ws.onclose = () => setConnectionState('disconnected');
    ws.onerror = () => setConnectionState('error');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'new_message':
          // Add to batch, not directly to state
          pendingMessages.current.push({
            id: crypto.randomUUID(),
            content: data.content,
            sender: data.sender,
            timestamp: data.timestamp,
          });
          scheduleBatch();
          break;
          
        case 'client_stats':
          setClient(prev => prev ? { ...prev, ...data } : prev);
          break;
      }
    };
    
    // Cleanup!
    return () => {
      ws.close();
      if (batchTimer.current) clearTimeout(batchTimer.current);
    };
  }, [clientId, scheduleBatch]);
  
  return { client, messages, connectionState };
}
```

---

## Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         KEY TAKEAWAYS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. REDIS is the message broker between processes                       │
│                                                                         │
│  2. EVENT BRIDGE listens to containers, pushes to Redis                 │
│                                                                         │
│  3. CONSUMERS receive from Redis, send to browsers                      │
│                                                                         │
│  4. "type" field MUST match consumer method name                        │
│                                                                         │
│  5. HOOKS update state directly (no DB queries!)                        │
│                                                                         │
│  6. BATCHING prevents UI freeze at high volume (50ms window)            │
│                                                                         │
│  7. Always CLEANUP WebSocket connections in useEffect return            │
│                                                                         │
│  8. Use SPECIFIC GROUPS to reduce unnecessary traffic                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

*Document Version: 1.0*  
*Last Updated: January 17, 2026*  
*Author: cannatoshi*

**🔬 SimpleX SMP Monitor - Redis & Real-Time Guide**