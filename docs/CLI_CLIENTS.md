# SimpleX CLI Clients Guide

Complete guide for managing Docker-based SimpleX CLI clients for end-to-end message delivery testing.

---

## Overview

CLI Clients are Docker containers running the SimpleX Chat CLI application. They enable:

- End-to-end message delivery testing
- SMP server routing verification
- Delivery latency measurement
- Receipt tracking (server received, client received)

Each client runs in isolation with its own identity, contacts, and message history.

---

## Architecture
```
Your Infrastructure
│
├── Client 001 (Port 3031) ─┐
├── Client 002 (Port 3032) ─┼── SimplexEventBridge ── Redis ── Browser
├── Client 003 (Port 3033) ─┘
│
└── Messages via Tor/.onion ── Your SMP Servers
```

The SimplexEventBridge automatically connects to all running clients and streams events to browsers via Redis.

---

## Creating Clients

### Step 1: Navigate to Clients

Open the web interface and click **Clients** in the navigation.

### Step 2: Create New Client

Click **+ New Client**. The form auto-generates:

| Field | Auto-Generated Value |
|-------|---------------------|
| Name | Client 001, Client 002, etc. |
| Slug | client-001, client-002, etc. |
| Profile Name | Random (quinn, rosa, kate, etc.) |
| WebSocket Port | Sequential (3031, 3032, etc.) |

Enable **Tor** if your SMP servers use .onion addresses.

### Step 3: Start the Client

After creation, click the green **Start** button. Wait 10-30 seconds for initialization.

**Container startup process:**
1. Docker creates container from `simplex-cli:latest`
2. SimpleX CLI initializes with profile name
3. Tor daemon starts (if enabled)
4. Socat forwards WebSocket traffic
5. Health check verifies operation

---

## Connections

Clients must be connected before exchanging messages.

### Creating a Connection

1. Open Client 001 detail page
2. Find **Connections** section
3. Click **+ New Connection**
4. Select Client 002 from dropdown
5. Click **Connect**

**What happens:**
1. Client 002 creates invitation address
2. Client 002 enables Auto-Accept
3. Client 001 connects via invitation
4. Both clients exchange keys
5. Connection saved to database

**Result:**
- Client 001 sees contact "rosa" (Client 002's profile)
- Client 002 sees contact "quinn" (Client 001's profile)

---

## Messaging

### Sending Messages

1. On Client 001 detail page, find **Send Message** in sidebar
2. Select recipient (rosa)
3. Type message
4. Click **Send**

### Message Flow
```
Client 001 sends message
    ↓
SMP Server stores message, sends ✓ to sender
    ↓
Client 002 retrieves message
    ↓
Client 002 sends receipt
    ↓
SMP Server forwards ✓✓ to Client 001
    ↓
UI shows "Delivered" with latency
```

### Message Status

| Status | Icon | Meaning |
|--------|------|---------|
| pending | ⏳ | Message being sent |
| sent | ✓ | Server received |
| delivered | ✓✓ | Recipient received |
| failed | ✗ | Delivery failed |

---

## Message Tabs

The Messages section provides three views:

| Tab | Content |
|-----|---------|
| Sent | Outgoing messages with delivery status and latency |
| Received | Incoming messages with sender and timestamp |
| All | Combined chronological view |

---

## Client Management

### Container Controls

| Action | Effect |
|--------|--------|
| Start | Creates and starts container |
| Stop | Stops container, preserves data |
| Restart | Stops and starts container |
| Delete | Removes container and database entry |

### Statistics

Each client displays:

| Statistic | Description |
|-----------|-------------|
| Status | Running / Stopped / Created |
| Sent | Total messages sent |
| Received | Total messages received |
| Success Rate | Percentage delivered |

---

## Performance

### Raspberry Pi 5 (8GB RAM)

| Clients | RAM Usage | Status |
|---------|-----------|--------|
| 6 | ~400 MB | Stable |
| 10 | ~650 MB | Stable |
| 20 | ~1.2 GB | Stable |
| 50 | ~3 GB | Tested |

### Resource per Client

| Configuration | RAM |
|---------------|-----|
| Without Tor | ~50-60 MB |
| With Tor | ~70-80 MB |

---

## Troubleshooting

### Client Won't Start
```bash
# Check Docker logs
docker logs simplex-client-client-001

# Check port availability
ss -tlnp | grep 3031

# Check container status
docker ps -a | grep simplex-client
```

### Messages Stuck on ✓

Verify Event Bridge is running. Check Django console for:
```
INFO 📡 Listening: Client 001
```

### WebSocket Connection Failed
```bash
# Test WebSocket
websocat ws://localhost:3031

# Check container health
docker inspect simplex-client-client-001 | grep -A5 Health
```

### Container Keeps Restarting
```bash
# Check logs for errors
docker logs --tail 50 simplex-client-client-001

# Check disk space
df -h
```

---

## Best Practices

1. Start with 2-3 clients for initial testing
2. Enable Tor if servers use .onion addresses
3. Verify Redis is running for real-time updates
4. Monitor RAM when adding many clients
5. Delete unused clients to free resources

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/clients/` | GET | List all clients |
| `/api/v1/clients/` | POST | Create client |
| `/api/v1/clients/{slug}/` | GET | Client details |
| `/api/v1/clients/{slug}/start/` | POST | Start container |
| `/api/v1/clients/{slug}/stop/` | POST | Stop container |
| `/api/v1/clients/{slug}/restart/` | POST | Restart container |
| `/api/v1/messages/` | GET | List messages |
| `/api/v1/messages/?client={uuid}` | GET | Filter by client |

---

<p align="center">
  <sub>See also: <a href="DOCKER.md">Docker Guide</a> | <a href="DEVNOTES.md">Developer Notes</a></sub>
</p>
