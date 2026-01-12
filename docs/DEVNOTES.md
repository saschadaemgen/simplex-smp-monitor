# Developer Notes

> **Internal technical documentation for developers**  
> Contains implementation details, architecture decisions, and troubleshooting guides.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Docker Architecture](#2-docker-architecture)
3. [Network Configuration](#3-network-configuration)
4. [WebSocket Communication](#4-websocket-communication)
5. [ChutneX Private Tor Network](#5-chutnex-private-tor-network)
6. [Environment Detection](#6-environment-detection)
7. [Known Issues & Solutions](#7-known-issues--solutions)
8. [Verification Tests](#8-verification-tests)
9. [Implementation Changelog](#9-implementation-changelog)

---

## 1. Project Structure

### Docker Images Location

All custom Docker images are centralized in `docker/images/`:

```
docker/images/
├── chutnex/              # Private Tor Network Nodes
│   ├── Dockerfile
│   ├── entrypoint.sh     # DA synchronization logic
│   ├── torrc.base
│   ├── torrc.da
│   ├── torrc.relay
│   ├── torrc.exit
│   └── torrc.client
├── simplex-cli/          # SimpleX Chat Client
│   ├── Dockerfile
│   └── entrypoint.sh     # ChutneX SOCKS forwarding
├── simplex-smp/          # SMP Server (ClearNet)
│   ├── Dockerfile
│   └── entrypoint.sh
├── simplex-smp-tor/      # SMP Server (Tor Hidden Service)
│   ├── Dockerfile
│   └── entrypoint.sh     # ChutneX Hidden Service support
├── simplex-xftp/         # XFTP File Server
│   ├── Dockerfile
│   └── entrypoint.sh
└── simplex-ntf/          # Notification Server
    ├── Dockerfile
    └── entrypoint.sh
```

### Why This Structure?

**Migration from v0.1.11:** Docker files were originally scattered:
- `servers/docker/` → moved to `docker/images/simplex-smp/`
- `clients/docker/` → moved to `docker/images/simplex-cli/`
- `docker/tor/` → renamed to `docker/images/chutnex/`

**Benefits:**
- Unified build paths
- Easier maintenance
- Clear separation: Django apps vs Docker images

---

## 2. Docker Architecture

### Images Overview

| Image | Base | Purpose | Build Command |
|-------|------|---------|---------------|
| `simplex-smp-monitor-app` | python:3.12-slim | Django + React | `docker compose build app` |
| `simplex-cli` | debian:bookworm-slim | SimpleX Chat Client | `docker build -t simplex-cli docker/images/simplex-cli/` |
| `simplex-smp` | debian:bookworm-slim | SMP Server (IP) | `docker build -t simplex-smp docker/images/simplex-smp/` |
| `simplex-smp-tor` | debian:bookworm-slim | SMP Server (Tor) | `docker build -t simplex-smp-tor docker/images/simplex-smp-tor/` |
| `simplex-xftp` | debian:bookworm-slim | XFTP Server | `docker build -t simplex-xftp docker/images/simplex-xftp/` |
| `simplex-ntf` | debian:bookworm-slim | Notification Server | `docker build -t simplex-ntf docker/images/simplex-ntf/` |
| `chutnex` | debian:bookworm-slim | Tor Node (DA/Guard/Middle/Exit/Client) | `docker build -t chutnex docker/images/chutnex/` |

### Build All Images

```bash
cd ~/simplex-smp-monitor

# Build all custom images
for img in chutnex simplex-cli simplex-smp simplex-smp-tor simplex-xftp simplex-ntf; do
    echo "Building ${img}..."
    docker build -t ${img}:latest docker/images/${img}/
done

# Build main app (includes frontend)
docker compose build app --no-cache
```

---

## 3. Network Configuration

### Docker Networks

| Network | Purpose | Subnet | Created By |
|---------|---------|--------|------------|
| `simplex-monitor-network` | Main stack (Django, Redis, Postgres) | Auto | docker-compose |
| `simplex-clients` | SimpleX Client containers | Auto | ClientDockerManager |
| `simplex-servers` | SimpleX Server containers | Auto | ServerDockerManager |
| `chutnex-{slug}` | ChutneX private Tor networks | `10.99.0.0/16` | ChutneXDockerManager |

### Container-to-Container Communication

**Problem solved in v0.1.12:**

Django app runs in `simplex-monitor-network`, but SimpleX clients run in `simplex-clients` network. They couldn't communicate.

**Solution:**

The app must be connected to the `simplex-clients` network:

```bash
docker network connect simplex-clients simplex-monitor-app
```

**Automatic connection:** The ClientDockerManager should connect the app automatically when creating clients.

### ChutneX Dual Network for Clients

SimpleX clients in ChutneX mode need access to:
1. **Bridge network** - for host port mapping (WebSocket access from Django)
2. **ChutneX network** - for Tor routing through private network

**Implementation in `clients/services/docker_manager.py`:**

```python
# Create container in bridge network first (enables port mapping)
container = self.client.containers.create(
    network='simplex-clients',
    ports={'3030/tcp': client.websocket_port},
    ...
)

# Then connect to ChutneX network
if connection_mode == 'chutnex_internal':
    chutnex_network = self.client.networks.get(f"chutnex-{network.slug}")
    chutnex_network.connect(container)
```

---

## 4. WebSocket Communication

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DJANGO APP                           │
│                                                         │
│   SimplexCommandService                                 │
│   └── websocket_url property                            │
│       ├── Development: ws://localhost:{port}            │
│       └── Docker:      ws://simplex-client-{slug}:{port}│
│                                                         │
│   SimplexEventBridge (Auto-start)                       │
│   └── Connects to ALL running client containers         │
│   └── Processes: newChatItems, chatItemsStatusesUpdated │
│   └── Broadcasts to browsers via Redis Channel Layer    │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │                              │
         │ WebSocket                    │ Redis Pub/Sub
         ▼                              ▼
┌─────────────────┐          ┌─────────────────────┐
│ SimpleX Clients │          │ Browser WebSockets  │
│ :3031, :3032... │          │ /ws/clients/        │
└─────────────────┘          └─────────────────────┘
```

### WebSocket URL Detection

**File:** `clients/models.py`

```python
@property
def websocket_url(self):
    """WebSocket URL - container name when in Docker, localhost otherwise"""
    import os
    if os.environ.get('RUNNING_IN_DOCKER'):
        return f"ws://simplex-client-{self.slug}:{self.websocket_port}"
    return f"ws://localhost:{self.websocket_port}"
```

**Environment variable:** `RUNNING_IN_DOCKER=true` is set in:
- `docker-compose.yml` (line 39)
- `docker-compose.prod.yml` (line 71)

---

## 5. ChutneX Private Tor Network

### DA Synchronization Problem

**Original Issue:** Directory Authorities started simultaneously, each writing fingerprint to shared volume but starting Tor immediately. Result: Each DA only knew itself → consensus failure.

**Solution:** All nodes wait for ALL DAs to register before starting Tor.

**File:** `docker/images/chutnex/entrypoint.sh`

```bash
# Phase 1: DA Registration
if [ "$NODE_TYPE" = "da" ]; then
    # Generate keys, extract fingerprints
    # Write to /status/dir-authorities with file locking
fi

# Phase 2: ALL nodes wait for DA_COUNT DAs
while [ $(wc -l < /status/dir-authorities) -lt $DA_COUNT ]; do
    sleep 1
done

# Phase 3: Build torrc with all DAs
cat /status/dir-authorities >> /etc/tor/torrc

# Phase 4: Start Tor
exec tor -f /etc/tor/torrc
```

### SimpleX Client ChutneX Integration

**File:** `docker/images/simplex-cli/entrypoint.sh`

```bash
if [ "${CHUTNEX_MODE}" = "1" ]; then
    # Forward localhost:9050 to ChutneX client node's SOCKS
    socat TCP-LISTEN:9050,bind=127.0.0.1,fork,reuseaddr \
          TCP:10.99.1.13:9050 &
fi
```

### SMP Server ChutneX Integration

**File:** `docker/images/simplex-smp-tor/entrypoint.sh`

```bash
if [ "${CHUTNEX_MODE}" = "1" ]; then
    # Wait for DirAuthorities
    while [ ! -s /status/dir-authorities ]; do sleep 1; done
    
    # Build torrc with ChutneX DAs
    cat > /etc/tor/torrc << EOF
TestingTorNetwork 1
AssumeReachable 1
$(cat /status/dir-authorities)
HiddenServiceDir /var/lib/tor/simplex-smp/
HiddenServicePort 5223 127.0.0.1:5223
EOF
fi
```

### Volume Mount for ChutneX Servers

**File:** `servers/services/docker_manager.py`

```python
if hosting_mode == 'chutnex' and server.chutnex_network:
    status_volume = f"chutnex-status-{server.chutnex_network.slug}"
    volumes[status_volume] = {'bind': '/status', 'mode': 'ro'}
```

---

## 6. Environment Detection

### Development vs Docker

| Environment | Django runs on | WebSocket URL | Redis Host |
|-------------|----------------|---------------|------------|
| Development | Host machine | `ws://localhost:{port}` | `127.0.0.1` |
| Docker | Container | `ws://simplex-client-{slug}:{port}` | `redis` |

### Detection Method

```python
import os

# In Docker?
if os.environ.get('RUNNING_IN_DOCKER'):
    # Container-to-container communication
    ws_url = f"ws://simplex-client-{slug}:{port}"
else:
    # Host-to-container via port mapping
    ws_url = f"ws://localhost:{port}"
```

---

## 7. Known Issues & Solutions

### Issue: App can't reach SimpleX clients

**Symptom:** WebSocket error: Connect call failed ('127.0.0.1', 3031)

**Cause:** App and clients in different Docker networks.

**Solution:**
```bash
docker network connect simplex-clients simplex-monitor-app
```

### Issue: ChutneX network already exists

**Symptom:** 403 Forbidden - Pool overlaps with other one

**Solution:**
```bash
docker network rm chutnex-{slug}
docker network prune -f
```

### Issue: Container name conflict

**Symptom:** 409 Conflict - container name already in use

**Solution:**
```bash
# Find and remove conflicting container
docker ps -a --format "{{.ID}} {{.Names}}" | grep simplex-client
docker rm -f {container_id}
```

### Issue: Frontend not updating in Docker

**Symptom:** Old UI after code changes

**Solution:**
```bash
cd frontend && npm run build
docker compose build app --no-cache
docker compose up -d
```

---

## 8. Verification Tests

### ChutneX Isolation Test

Verifies that ChutneX .onion addresses are NOT reachable from public Tor.

```bash
#!/bin/bash
# verify_chutnex_isolation.sh

ONION="your-chutnex-server.onion"

echo "============================================================"
echo "🔬 ChutneX ISOLATION VERIFICATION"
echo "============================================================"
echo "Testing .onion: $ONION"
echo ""

echo "TEST 1: Public Tor Access (should FAIL)"
echo "----------------------------------------"
timeout 15 curl -x socks5h://localhost:9050 "http://$ONION:5223" \
    --connect-timeout 10 2>&1 || \
    echo "✅ PASS: Public Tor cannot reach ChutneX .onion"

echo ""
echo "TEST 2: ChutneX Client Access (should SUCCEED)"
echo "-----------------------------------------------"
docker exec simplex-client-client-001 \
    curl -x socks5h://127.0.0.1:9050 "http://$ONION:5223" \
    --connect-timeout 10 2>&1 || \
    echo "✅ Connection established (server doesn't speak HTTP)"
```

**Expected Results:**
- Test 1: `Connection timed out` or `Can't complete SOCKS5 connection` = ✅ PASS
- Test 2: `Empty reply from server` = ✅ PASS (connection works, SMP doesn't speak HTTP)

**Test Results (2026-01-12):**
```
============================================================
🔬 ChutneX ISOLATION VERIFICATION
============================================================
Testing .onion: kbxecaukami3lotmtrwez3mdgf65cprhyuwjs5fzlaaw35rqtpaor6yd.onion

TEST 1: Public Tor Access (should FAIL)
----------------------------------------
curl: (28) Connection timed out after 10001 milliseconds
✅ PASS: Public Tor cannot reach ChutneX .onion

TEST 2: ChutneX Client Access (should SUCCEED)
-----------------------------------------------
curl: (52) Empty reply from server
✅ Connection established (server doesn't speak HTTP)
```

### Network Connectivity Test

```bash
# Test from Django container to SimpleX client
docker exec simplex-monitor-app nc -zv simplex-client-client-001 3031

# Expected: Connection to simplex-client-client-001 3031 port [tcp/*] succeeded!
```

### WebSocket URL Test

```bash
# Verify WebSocket URL in Docker
docker compose exec app python manage.py shell -c "
from clients.models import SimplexClient
c = SimplexClient.objects.first()
if c:
    print(f'WebSocket URL: {c.websocket_url}')
"

# Expected in Docker: ws://simplex-client-{slug}:3031
# Expected in Dev:    ws://localhost:3031
```

### Redis Connection Test

```bash
docker exec simplex-monitor-redis redis-cli ping
# Expected: PONG
```

---

## 9. Implementation Changelog

### 2026-01-12: WebSocket URL Environment Detection

**Problem:** Django app in Docker used `localhost` for WebSocket URLs, but clients are in separate containers.

**Solution:** Added `RUNNING_IN_DOCKER` environment variable check in `websocket_url` property.

**Files changed:**
- `clients/models.py` - websocket_url property
- `docker-compose.yml` - RUNNING_IN_DOCKER=true
- `docker-compose.prod.yml` - RUNNING_IN_DOCKER=true

### 2026-01-12: ChutneX DA Synchronization Fix

**Problem:** DAs started simultaneously, each only knew itself → consensus voting failed.

**Solution:** All nodes wait for `DA_COUNT` DAs to register before starting Tor.

**Files changed:**
- `docker/images/chutnex/entrypoint.sh` - DA wait logic
- `chutney/services/docker_manager.py` - pass DA_COUNT env var

### 2026-01-12: ChutneX Server Integration

**Problem:** SMP servers in ChutneX mode connected to public Tor instead of private network.

**Solution:** Added ChutneX torrc generation with DA entries from shared volume.

**Files changed:**
- `docker/images/simplex-smp-tor/entrypoint.sh` - CHUTNEX_MODE handling
- `servers/services/docker_manager.py` - mount /status volume

### 2026-01-12: ChutneX Client Dual Network

**Problem:** Clients in ChutneX network couldn't expose WebSocket port to Django.

**Solution:** Connect clients to BOTH bridge (port mapping) and ChutneX (Tor routing) networks.

**Files changed:**
- `clients/services/docker_manager.py` - dual network connection
- `docker/images/simplex-cli/entrypoint.sh` - socat SOCKS forwarding

### 2026-01-11: Docker Structure Migration

**Problem:** Docker files scattered across multiple directories.

**Solution:** Centralized all Docker images in `docker/images/`.

**Migration map:**
- `servers/docker/` → `docker/images/simplex-smp/`, `simplex-smp-tor/`, etc.
- `clients/docker/` → `docker/images/simplex-cli/`
- `docker/tor/` → `docker/images/chutnex/`

---

## Quick Reference

### Build Commands

```bash
# All custom images
for img in chutnex simplex-cli simplex-smp simplex-smp-tor simplex-xftp simplex-ntf; do
    docker build -t ${img}:latest docker/images/${img}/
done

# Main app with frontend
cd frontend && npm run build && cd ..
docker compose build app --no-cache

# Rebuild and restart
docker compose up -d
```

### Debug Commands

```bash
# App logs
docker compose logs app --tail 50

# Check networks
docker network ls | grep -E "simplex|chutnex"

# Check app networks
docker inspect simplex-monitor-app --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'

# Enter app container
docker compose exec app bash

# Django shell
docker compose exec app python manage.py shell
```

### Clean Up Commands

```bash
# Remove all SimpleX containers
docker ps -a | grep simplex | awk '{print $1}' | xargs -r docker rm -f

# Remove ChutneX network
docker network rm chutnex-{slug}

# Prune unused networks
docker network prune -f

# Full reset (WARNING: deletes data!)
docker compose down -v
```

---

*Last updated: 2026-01-12*