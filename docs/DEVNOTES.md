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
10. [Docker Manager Module](#10-docker-manager-module)

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
┌─────────────────────────────────────────────────────────────┐
│                    DJANGO APP                               │
│                                                             │
│   SimplexCommandService                                     │
│   └── websocket_url property                                │
│       ├── Development: ws://localhost:{port}                │
│       └── Docker:      ws://simplex-client-{slug}:{port}    │
│                                                             │
│   SimplexEventBridge (Auto-start)                           │
│   └── Connects to ALL running client containers             │
│   └── Processes: newChatItems, chatItemsStatusesUpdated     │
│   └── Broadcasts to browsers via Redis Channel Layer        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
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

## 10. Docker Manager Module

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
│                                                             │
│   Docker.tsx                                                │
│   ├── Table/Card Views                                      │
│   ├── Real-time Stats Display                               │
│   ├── Tor/ChutneX Detection (isTorContainer)                │
│   └── Bulk Operations UI                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ REST API (5s stats / 15s list)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Django)                        │
│                                                             │
│   docker_manager/                                           │
│   ├── api/views.py          # DRF ViewSets                  │
│   ├── api/urls.py           # API routes                    │
│   └── services/             #                               │
│       └── docker_service.py # Docker SDK wrapper            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Docker SDK (socket)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   DOCKER DAEMON                             │
│                                                             │
│   /var/run/docker.sock                                      │
│   └── All containers on host                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `docker_manager/services/docker_service.py` | Docker SDK operations with ThreadPoolExecutor |
| `docker_manager/api/views.py` | REST API endpoints |
| `docker_manager/api/urls.py` | URL routing |
| `frontend/src/pages/Docker.tsx` | React component (900+ lines) |
| `frontend/src/api/docker.ts` | TypeScript API client |

### Critical Implementation: Non-Blocking Stats

**Problem (v0.1.14):** Docker SDK `container.stats(stream=True)` blocks the entire Django process, causing all requests to hang for 20-30 seconds.

**Solution (v0.1.12-alpha):** Two-sample approach with immediate stream close:

```python
# docker_manager/services/docker_service.py

def get_container_stats(self, container_id: str) -> dict:
    container = self.client.containers.get(container_id)
    stats_stream = container.stats(stream=True, decode=True)
    
    # Read exactly 2 samples for delta calculation
    first_sample = next(stats_stream)
    time.sleep(0.1)  # 100ms between samples
    second_sample = next(stats_stream)
    
    # CRITICAL: Close stream immediately
    stats_stream.close()
    
    # Calculate CPU from deltas
    cpu_delta = second_sample['cpu_stats']['cpu_usage']['total_usage'] - \
                first_sample['cpu_stats']['cpu_usage']['total_usage']
    system_delta = second_sample['cpu_stats']['system_cpu_usage'] - \
                   first_sample['cpu_stats']['system_cpu_usage']
    
    cpu_percent = (cpu_delta / system_delta) * num_cpus * 100
    
    return {...}
```

**Why 2 samples?** Docker stats with `stream=False` returns a single snapshot with zero deltas. CPU calculation requires the difference between two measurements.

### Critical Implementation: Parallel Stats Collection

**Problem:** Fetching stats for 20 containers sequentially = 20 × 200ms = 4 seconds blocking.

**Solution:** ThreadPoolExecutor for parallel collection:

```python
def get_all_stats(self) -> list:
    running = [c for c in self.client.containers.list() if c.status == 'running']
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {
            executor.submit(self._get_single_stats, c.id): c.id 
            for c in running
        }
        
        results = []
        for future in as_completed(futures, timeout=5):
            try:
                results.append(future.result())
            except Exception:
                pass
                
    return results
```

### Tor/ChutneX Container Detection

**Frontend logic in `Docker.tsx`:**

```typescript
function isTorContainer(container: {
  name: string;
  networks?: Record<string, any>;
  image?: string;
}): boolean {
  const name = container.name.toLowerCase();
  const image = (container.image || '').toLowerCase();
  const networks = Object.keys(container.networks || {}).map(n => n.toLowerCase());
  
  // Check name, image, or network for tor/chutnex keywords
  const keywords = ['tor', 'chutnex', 'chutney'];
  
  return keywords.some(kw => 
    name.includes(kw) || 
    image.includes(kw) || 
    networks.some(n => n.includes(kw))
  );
}
```

**Visual differentiation:**
- Status dots: Purple (`#7D4698`) vs Cyan (`#4A9BA0`)
- 🧅 emoji badge on container name
- Network badges in purple in expanded details

### API Endpoints Reference

```
GET  /api/docker/info/                    → Docker host info
GET  /api/docker/containers/              → List containers
GET  /api/docker/containers/?all=true     → Include stopped
POST /api/docker/containers/{id}/action/  → {action: "start|stop|restart|pause|unpause"}
DELETE /api/docker/containers/{id}/       → Remove container
DELETE /api/docker/containers/{id}/?force=true → Force remove
GET  /api/docker/containers/{id}/stats/   → Single container stats
GET  /api/docker/containers/{id}/logs/    → Container logs
GET  /api/docker/containers/{id}/logs/?lines=500 → Custom line count
GET  /api/docker/stats/all/               → All running containers stats
POST /api/docker/bulk/                    → {container_ids: [...], action: "..."}
POST /api/docker/prune/                   → System prune
```

### Frontend Polling Strategy

```typescript
// Stats: 5 second interval (CPU/Memory change frequently)
useEffect(() => {
  const statsInterval = setInterval(fetchStats, 5000);
  return () => clearInterval(statsInterval);
}, []);

// Container list: 15 second interval (containers don't change often)
useEffect(() => {
  const listInterval = setInterval(fetchContainers, 15000);
  return () => clearInterval(listInterval);
}, []);
```

### Known Limitations

1. **No WebSocket** - Currently polling-based, not real-time push
2. **No container creation** - Can only manage existing containers
3. **No image management** - Cannot pull/build/delete images
4. **No exec/shell** - Cannot execute commands in containers
5. **Stats delay** - 100ms delay per container for accurate CPU calculation

### Future Improvements

| Feature | Priority | Complexity |
|---------|----------|------------|
| WebSocket real-time stats | High | Medium |
| Container terminal/shell | Medium | High |
| Image management | Medium | Medium |
| Network management | Low | Medium |
| Volume management | Low | Medium |
| Docker Compose support | Low | High |

### Changelog

**v0.1.12-alpha (2026-01-12)**
- Initial Docker Manager module
- Non-blocking stats with 2-sample approach
- Parallel stats collection with ThreadPoolExecutor
- Tor/ChutneX visual detection
- Table and card views
- Bulk operations
- Container logs modal

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

*Last updated: 12.01.2026*