# Developer Notes

> **Internal technical documentation for developers**  
> Contains implementation details, architecture decisions, and troubleshooting guides.  
> Last Updated: January 17, 2026

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Docker Architecture](#2-docker-architecture)
3. [Network Configuration](#3-network-configuration)
4. [WebSocket & Real-Time Communication](#4-websocket--real-time-communication)
5. [ChutneX Private Tor Network](#5-chutnex-private-tor-network)
6. [ChutneX Analytics Frontend](#6-chutnex-analytics-frontend)
7. [Environment Detection](#7-environment-detection)
8. [Known Issues & Solutions](#8-known-issues--solutions)
9. [Verification Tests](#9-verification-tests)
10. [Implementation Changelog](#10-implementation-changelog)
11. [Docker Manager Module](#11-docker-manager-module)
12. [Quick Reference](#12-quick-reference)

---

## 1. Project Structure

### 1.1 Docker Images Location

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

### 1.2 Documentation Structure
```
docs/
├── CHUTNEX.md              # ChutneX Technical Documentation
├── CHUTNEX_ANALYTICS.md    # Analytics Frontend Development Guide
├── REDIS.md                # Redis & Real-Time Guide (NEW)
└── DEVNOTES.md             # This file - Developer Notes
```

### 1.3 Frontend Structure
```
frontend/src/
├── api/                      # API Client Functions
│   ├── chutney_analytics.ts  # Analytics API
│   ├── docker.ts             # Docker Manager API
│   └── ...
├── components/
│   ├── chutneX/              # ChutneX Reusable Components
│   │   ├── circuits/         # Circuit components
│   │   ├── forensics/        # Forensics components
│   │   ├── integration/      # Integration components
│   │   ├── nodes/            # Node components
│   │   ├── overview/         # Overview components
│   │   ├── reports/          # Report components
│   │   ├── traffic/          # Traffic components
│   │   ├── visualization/    # Visualization components
│   │   ├── index.ts          # Component exports
│   │   └── types.ts          # Shared types
│   ├── layout/
│   │   └── Layout.tsx        # Main layout with navigation
│   └── navigation/
│       └── ChutneXMegaMenu.tsx  # 120-feature navigation
├── hooks/                    # React Hooks
│   ├── useClientData.ts      # Combined Client Hook (REST + WS + Batching)
│   ├── useApi.ts             # Generic REST API hook
│   ├── useWebSocket.ts       # Base WebSocket hook
│   ├── useChutney.ts         # Tor Network REST hook
│   └── useTorWebSocket.ts    # Tor Analytics WebSocket hook
├── pages/
│   ├── chutney/              # ChutneX Analytics Pages
│   │   ├── analytics/        # Analytics section (3 pages)
│   │   ├── circuits/         # Circuits section (6 pages)
│   │   ├── forensics/        # Forensics section (4 pages)
│   │   ├── integration/      # Integration section (3 pages)
│   │   ├── nodes/            # Nodes section (6 pages)
│   │   ├── overview/         # Overview section (4 pages)
│   │   ├── reports/          # Reports section (1 page)
│   │   ├── traffic/          # Traffic section (7 pages)
│   │   └── viz/              # Visualization section (3 pages)
│   ├── ChutneXAnalytics.tsx  # Main analytics entry
│   └── ...
├── i18n/
│   ├── index.ts              # i18n configuration
│   └── locales/
│       ├── de.json           # German translations
│       └── en.json           # English translations
└── App.tsx                   # Router configuration
```

### 1.4 Why This Structure?

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

### 2.1 Images Overview

| Image | Base | Purpose | Build Command |
|-------|------|---------|---------------|
| `simplex-smp-monitor-app` | python:3.12-slim | Django + React | `docker compose build app` |
| `simplex-cli` | debian:bookworm-slim | SimpleX Chat Client | `docker build -t simplex-cli docker/images/simplex-cli/` |
| `simplex-smp` | debian:bookworm-slim | SMP Server (IP) | `docker build -t simplex-smp docker/images/simplex-smp/` |
| `simplex-smp-tor` | debian:bookworm-slim | SMP Server (Tor) | `docker build -t simplex-smp-tor docker/images/simplex-smp-tor/` |
| `simplex-xftp` | debian:bookworm-slim | XFTP Server | `docker build -t simplex-xftp docker/images/simplex-xftp/` |
| `simplex-ntf` | debian:bookworm-slim | Notification Server | `docker build -t simplex-ntf docker/images/simplex-ntf/` |
| `chutnex` | debian:bookworm-slim | Tor Node (DA/Guard/Middle/Exit/Client) | `docker build -t chutnex docker/images/chutnex/` |

### 2.2 Build All Images
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

### 2.3 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Backend** | Django | 6.x |
| **Backend** | Django REST Framework | 3.x |
| **Backend** | Django Channels | 4.x |
| **Backend** | stem (Tor Controller) | 1.8.x |
| **Frontend** | React | 18.x |
| **Frontend** | TypeScript | 5.x |
| **Frontend** | Vite | 7.x |
| **Frontend** | Tailwind CSS | 3.x |
| **Frontend** | Recharts | 2.x |
| **Database** | PostgreSQL | 15.x |
| **Cache/Broker** | Redis | 7.x |
| **Container** | Docker | 24.x |

---

## 3. Network Configuration

### 3.1 Docker Networks

| Network | Purpose | Subnet | Created By |
|---------|---------|--------|------------|
| `simplex-monitor-network` | Main stack (Django, Redis, Postgres) | Auto | docker-compose |
| `simplex-clients` | SimpleX Client containers | Auto | ClientDockerManager |
| `simplex-servers` | SimpleX Server containers | Auto | ServerDockerManager |
| `chutnex-{slug}` | ChutneX private Tor networks | `10.99.0.0/16` | ChutneXDockerManager |

### 3.2 Container-to-Container Communication

**Problem solved in v0.1.12:**

Django app runs in `simplex-monitor-network`, but SimpleX clients run in `simplex-clients` network. They couldn't communicate.

**Solution:**

The app must be connected to the `simplex-clients` network:
```bash
docker network connect simplex-clients simplex-monitor-app
```

**Automatic connection:** The ClientDockerManager connects the app automatically when creating clients.

### 3.3 ChutneX Dual Network for Clients

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

## 4. WebSocket & Real-Time Communication

> **📚 Complete Documentation:** See `docs/REDIS.md`
> 
> The REDIS.md guide contains comprehensive documentation for:
> - Redis Channel Layer configuration and debugging
> - Django Channels consumers (implementation details)
> - Event Bridge (container listener)
> - Frontend hooks with 50ms batching
> - Step-by-step guide for adding new events
> - Performance best practices
> - Complete event reference

### 4.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    REAL-TIME DATA FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   SimpleX Container  ──WebSocket──►  Event Bridge           │
│        (Docker)                        (Python)             │
│                                           │                 │
│                                           │ group_send()    │
│                                           ▼                 │
│                                        Redis                │
│                                      (Pub/Sub)              │
│                                           │                 │
│                                           │ Channel Layer   │
│                                           ▼                 │
│                                    Django Consumer          │
│                                     (Channels)              │
│                                           │                 │
│                                           │ WebSocket       │
│                                           ▼                 │
│                                     React Browser           │
│                                    (useClientData)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Key Components

| Component | File | Purpose |
|-----------|------|---------|
| Event Bridge | `clients/services/event_bridge.py` | Listens to containers, pushes to Redis |
| Consumer | `clients/consumers.py` | WebSocket handler for browsers |
| Routing | `clients/routing.py` | WebSocket URL patterns |
| Hook | `frontend/src/hooks/useClientData.ts` | Combined REST + WS + Batching |

### 4.3 WebSocket URL Detection

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

### 4.4 Performance: Direct State Updates

**Old approach (slow):**
```typescript
// WebSocket event triggers database refetch
onNewMessage: () => fetchMessages()  // ❌ 100 DB queries/sec!
```

**New approach (fast):**
```typescript
// WebSocket event updates state directly
onNewMessage: (event) => {
  setMessages(prev => [event, ...prev]);  // ✅ No DB query!
}
```

### 4.5 Performance: 50ms Batching

At high message rates (100+ msg/s), individual state updates cause UI freezes.
Solution: Collect events for 50ms, then apply in single render.

```
WITHOUT BATCHING:  100 messages = 100 renders/sec = frozen UI
WITH BATCHING:     100 messages =  20 renders/sec = smooth UI
```

See `docs/REDIS.md` Section 7 for implementation details.

### 4.6 Hook Hierarchy

```
useClientData.ts     ← Client Detail Page (REST + WS + Batching)
├── Initial REST fetch
├── WebSocket connection
├── 50ms batching
└── All actions (send, connect, delete)

useApi.ts            ← Generic REST (other pages)
useWebSocket.ts      ← ClientsPage list view
useChutney.ts        ← Tor Network REST
useTorWebSocket.ts   ← Tor Analytics WebSocket
```

---

## 5. ChutneX Private Tor Network

### 5.1 DA Synchronization Problem

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

### 5.2 SimpleX Client ChutneX Integration

**File:** `docker/images/simplex-cli/entrypoint.sh`
```bash
if [ "${CHUTNEX_MODE}" = "1" ]; then
    # Forward localhost:9050 to ChutneX client node's SOCKS
    socat TCP-LISTEN:9050,bind=127.0.0.1,fork,reuseaddr \
          TCP:10.99.1.13:9050 &
fi
```

### 5.3 SMP Server ChutneX Integration

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

### 5.4 Volume Mount for ChutneX Servers

**File:** `servers/services/docker_manager.py`
```python
if hosting_mode == 'chutnex' and server.chutnex_network:
    status_volume = f"chutnex-status-{server.chutnex_network.slug}"
    volumes[status_volume] = {'bind': '/status', 'mode': 'ro'}
```

---

## 6. ChutneX Analytics Frontend

> **Detailed Documentation:** See `docs/CHUTNEX_ANALYTICS.md`

### 6.1 Overview

ChutneX Analytics is the forensics and analysis suite for private Tor networks:
- **120 Features** across 12 categories
- React + TypeScript + Recharts
- i18n Support (EN/DE)
- Neon Blue Design (#88CED0)

### 6.2 Development Strategy (Updated January 15, 2026)
```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT PHASES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PHASE 1: Frontend Placeholders (COMPLETED)                     │
│  ├── All 120 menu items created                                 │
│  ├── Navigation and routing complete                            │
│  ├── Simple placeholder pages for all sections                  │
│  └── TypeScript compilation: PASSING                            │
│                                                                 │
│  PHASE 2: Incremental Full Development (CURRENT)                │
│  ├── Develop each page fully (frontend + backend)               │
│  ├── Test thoroughly before moving to next page                 │
│  ├── Real data integration per page                             │
│  └── Documentation updated per feature                          │
│                                                                 │
│  PHASE 3: Additional Software Integration                       │
│  ├── tcpdump/tshark for Packet Capture                          │
│  ├── Zeek for Protocol Analysis                                 │
│  ├── Suricata for IDS/Alerts                                    │
│  └── Neo4j for Graph Database                                   │
│                                                                 │
│  PHASE 4: Enterprise Features                                   │
│  ├── ML-based Anomaly Detection                                 │
│  ├── Automated Reports                                          │
│  ├── Prometheus/Grafana Integration                             │
│  └── Multi-Network Comparisons                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Current Page Status (January 15, 2026)

| Page | Route | Status |
|------|-------|--------|
| CircuitsListPage | `/tor-networks/:id/analytics/circuits` | ✅ FULLY IMPLEMENTED |
| All other pages | Various | 📋 Placeholder (awaiting development) |

**Strategy Change:** Previously we tried to build all UI first with mock data. Now we develop each page completely (frontend + backend + tests) before moving to the next.

### 6.4 What stem Can Do (Already Installed)
```python
# Python Tor Controller library
from stem.control import Controller, EventType

# Available event listeners:
controller.add_event_listener(callback, EventType.CIRC)      # Circuit Events
controller.add_event_listener(callback, EventType.STREAM)    # Stream Events  
controller.add_event_listener(callback, EventType.BW)        # Bandwidth
controller.add_event_listener(callback, EventType.CELL_STATS) # Cell Stats
```

**Possible without additional software:**

| Feature | Possible? | How? |
|---------|-----------|------|
| Timing Correlation | ✅ YES | Compare circuit create/close timestamps |
| Circuit Event Log | ✅ YES | Store all CIRC events |
| Basic Anomaly Detection | ✅ YES | Statistical analysis (stddev, outliers) |
| Path Analysis | ✅ YES | Track which nodes are used how often |
| Bandwidth per Circuit | ✅ YES | Track STREAM events |

### 6.5 Additional Software (Phase 3)

| Tool | Purpose | Priority | Installation |
|------|---------|----------|--------------|
| **tcpdump** | Raw Packet Capture | HIGH | `apt install tcpdump` |
| **tshark** | Wireshark CLI | HIGH | `apt install tshark` |
| **Zeek** | Protocol Analysis | MEDIUM | See CHUTNEX_ANALYTICS.md |
| **Suricata** | IDS/IPS Alerts | MEDIUM | `apt install suricata` |
| **Neo4j** | Graph Database | LOW | Debian repo |

### 6.6 Common Analytics Issues

**Import duplicates in App.tsx:**
```bash
# Check for duplicates
grep -n "ComponentName" frontend/src/App.tsx

# Remove duplicate (N = line number)
sed -i 'Nd' frontend/src/App.tsx
```

**Route structure broken:**
```bash
# Show lines around error
sed -n '190,210p' frontend/src/App.tsx

# Replace broken line
sed -i '193c\<Route path="..." element={...} />' frontend/src/App.tsx
```

**Chart not rendering:**
```tsx
// WRONG:
<ResponsiveContainer><LineChart /></ResponsiveContainer>

// CORRECT:
<div className="h-[300px]">
  <ResponsiveContainer width="100%" height="100%">
    <LineChart />
  </ResponsiveContainer>
</div>
```

### 6.7 Workflow for New Pages
```bash
# 1. Create page file
cat > frontend/src/pages/chutney/{category}/{Name}Page.tsx

# 2. Add translations (de.json + en.json) if using i18n

# 3. Add route in App.tsx
# const NewPage = lazy(() => import('./pages/chutney/...'));
# <Route path="..." element={<NewPage />} />

# 4. Update MegaMenu badge (SOON → ALPHA)
sed -i "s/badge: 'SOON', disabled: true/badge: 'ALPHA'/" \
  frontend/src/components/navigation/ChutneXMegaMenu.tsx

# 5. Update documentation!
# docs/CHUTNEX_ANALYTICS.md - To-Do List
# docs/DEVNOTES.md - Changelog
```

---

## 7. Environment Detection

### 7.1 Development vs Docker

| Environment | Django runs on | WebSocket URL | Redis Host |
|-------------|----------------|---------------|------------|
| Development | Host machine | `ws://localhost:{port}` | `127.0.0.1` |
| Docker | Container | `ws://simplex-client-{slug}:{port}` | `redis` |

### 7.2 Detection Method
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

## 8. Known Issues & Solutions

### 8.1 App Can't Reach SimpleX Clients

**Symptom:** WebSocket error: Connect call failed ('127.0.0.1', 3031)

**Cause:** App and clients in different Docker networks.

**Solution:**
```bash
docker network connect simplex-clients simplex-monitor-app
```

### 8.2 ChutneX Network Already Exists

**Symptom:** 403 Forbidden - Pool overlaps with other one

**Solution:**
```bash
docker network rm chutnex-{slug}
docker network prune -f
```

### 8.3 Container Name Conflict

**Symptom:** 409 Conflict - container name already in use

**Solution:**
```bash
# Find and remove conflicting container
docker ps -a --format "{{.ID}} {{.Names}}" | grep simplex-client
docker rm -f {container_id}
```

### 8.4 Frontend Not Updating in Docker

**Symptom:** Old UI after code changes

**Solution:**
```bash
cd frontend && npm run build
docker compose build app --no-cache
docker compose up -d
```

### 8.5 App.tsx Import/Route Duplicates

**Symptom:** Build error due to duplicate definitions

**Cause:** `sed -i` commands inserted multiple times

**Solution:**
```bash
# Find duplicates
grep -n "PageName" frontend/src/App.tsx

# Delete duplicate line (N = line number)
sed -i 'Nd' frontend/src/App.tsx
```

### 8.6 Chart Not Rendering

**Symptom:** ResponsiveContainer shows nothing

**Cause:** Parent has no fixed height

**Solution:**
```tsx
// Parent needs fixed height!
<div className="h-[300px]">
  <ResponsiveContainer width="100%" height="100%">
    <LineChart />
  </ResponsiveContainer>
</div>
```

### 8.7 TypeScript Errors in Analytics Pages

**Common errors and fixes:**

| Error | Solution |
|-------|----------|
| `'X' is declared but never used` | Prefix with underscore: `_X` |
| `Type 'null' is not assignable` | Add null coalescing: `value ?? defaultValue` |
| `cloneElement type error` | Cast as `React.ReactElement<any>` |
| `useState destructuring syntax` | Ensure comma: `const [a, setA] = useState()` |

### 8.8 Recharts Circular Dependency Warning

**Symptom:** Vite shows circular dependency warning during build

**Solution:** This is a known Recharts issue. The warning is non-blocking and doesn't affect functionality. Can be safely ignored.

### 8.9 Redis Connection Issues

**Symptom:** Events not reaching browser

**Solution:**
```bash
# Check Redis is running
docker exec simplex-monitor-redis redis-cli PING
# Expected: PONG

# Monitor Redis traffic
docker exec -it simplex-monitor-redis redis-cli MONITOR
```

See `docs/REDIS.md` Section 9 for complete troubleshooting guide.

---

## 9. Verification Tests

### 9.1 ChutneX Isolation Test

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

### 9.2 Network Connectivity Test
```bash
# Test from Django container to SimpleX client
docker exec simplex-monitor-app nc -zv simplex-client-client-001 3031

# Expected: Connection to simplex-client-client-001 3031 port [tcp/*] succeeded!
```

### 9.3 WebSocket URL Test
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

### 9.4 Redis Connection Test
```bash
docker exec simplex-monitor-redis redis-cli ping
# Expected: PONG
```

### 9.5 Analytics Frontend Test
```bash
# Start dev server
cd ~/simplex-smp-monitor/frontend
npm run dev

# Open in browser:
# http://localhost:5173/tor-networks/{network-id}/analytics

# Verify:
# - MegaMenu opens
# - Network dropdown works
# - Charts load (on implemented pages)
# - Language switch EN/DE works
```

### 9.6 TypeScript Compilation Test
```bash
cd ~/simplex-smp-monitor/frontend

# Check for TypeScript errors
npx tsc --noEmit

# Expected: No errors
```

---

## 10. Implementation Changelog

### 2026-01-17: Redis Documentation & WebSocket Optimization

**New Documentation:**
- `docs/REDIS.md` created - comprehensive Redis & Real-Time guide
- Covers: Redis Channel Layer, Django Channels, Event Bridge, React hooks, batching

**Architecture Improvements:**
- Replaced polling-based updates with direct state updates
- Added 50ms batching for high-frequency WebSocket events
- Created unified `useClientData` hook (REST + WS + Batching + Actions)

**Performance Impact:**
- Before: 100 DB queries/second at 100 msg/s
- After: 0 DB queries, 20 renders/second
- Result: Smooth UI even under high load

**Files Changed:**
- `frontend/src/hooks/useClientData.ts` (NEW)
- `frontend/src/pages/ClientDetail.tsx` (simplified)
- `docs/DEVNOTES.md` (Section 4 expanded)
- `docs/REDIS.md` (NEW)

### 2026-01-15: TypeScript Fixes & Strategy Change

**Major Refactoring:**
- Converted 40+ complex placeholder pages to simple stubs
- Changed development strategy: develop each page fully before moving to next
- Fixed all TypeScript compilation errors

**TypeScript Fixes Applied:**
- React.cloneElement type casting with `<any>`
- Null coalescing for optional props (`?? false`, `?? ''`)
- Unused variable prefixing with underscore (`_networkId`, `_circuits`)
- Fixed useState destructuring syntax errors
- Removed unused imports across all files

**Files Changed:** 57
- 17 ChutneX components
- 37 Page files
- 1 Layout component
- 1 Main analytics page
- 1 README.md (Django version 5.x → 6.x)

**Build Status:**
- ✅ TypeScript compilation: PASS
- ✅ Vite build: SUCCESS
- ⚠️ Recharts circular dependency warning (known issue, non-blocking)

### 2026-01-14: ChutneX Analytics Forensics + Documentation

**New Pages:**
- ForensicsOverviewPage with Timing Charts, Radar, Scatter Plot
- BandwidthChartPage with 4 chart types and Brush zoom

**Fixes:**
- App.tsx route duplicates removed
- MegaMenu i18n complete (DE/EN)

**Documentation:**
- `docs/CHUTNEX_ANALYTICS.md` created (Frontend Development Guide)
- `docs/DEVNOTES.md` extended with Analytics section (Section 6)
- `docs/CHUTNEX.md` updated

**Known Issues:**
- ForensicsOverviewPage uses mock data (Math.random())
- Backend endpoints for forensics not yet implemented

### 2026-01-13: Traffic & Circuits Pages

**New Pages:**
- TrafficOverviewPage
- CircuitsListPage, CircuitDetailPage
- CircuitPathPage, CircuitStatsPage
- CircuitFiltersPage, CircuitEventsPage

**Features:**
- i18n system with react-i18next
- Language Switcher in Header
- Auto-refresh for all pages

### 2026-01-12: ChutneX Analytics Initial

**New Features:**
- ChutneXMegaMenu with 120 features in 12 categories
- AnalyticsDashboard main page
- NodeGridPage, NodeBandwidthPage
- API Client (chutney_analytics.ts)

**Architecture:**
- Neon Blue Design System (#88CED0)
- Recharts for visualizations
- React Router for navigation

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

## 11. Docker Manager Module

### 11.1 Architecture Overview
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

### 11.2 Key Files

| File | Purpose |
|------|---------|
| `docker_manager/services/docker_service.py` | Docker SDK operations with ThreadPoolExecutor |
| `docker_manager/api/views.py` | REST API endpoints |
| `docker_manager/api/urls.py` | URL routing |
| `frontend/src/pages/Docker.tsx` | React component (900+ lines) |
| `frontend/src/api/docker.ts` | TypeScript API client |

### 11.3 Critical Implementation: Non-Blocking Stats

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

### 11.4 Critical Implementation: Parallel Stats Collection

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

### 11.5 Tor/ChutneX Container Detection

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

### 11.6 API Endpoints Reference
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

### 11.7 Frontend Polling Strategy
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

### 11.8 Known Limitations

1. **No WebSocket** - Currently polling-based, not real-time push
2. **No container creation** - Can only manage existing containers
3. **No image management** - Cannot pull/build/delete images
4. **No exec/shell** - Cannot execute commands in containers
5. **Stats delay** - 100ms delay per container for accurate CPU calculation

### 11.9 Future Improvements

| Feature | Priority | Complexity |
|---------|----------|------------|
| WebSocket real-time stats | High | Medium |
| Container terminal/shell | Medium | High |
| Image management | Medium | Medium |
| Network management | Low | Medium |
| Volume management | Low | Medium |
| Docker Compose support | Low | High |

---

## 12. Quick Reference

### 12.1 Build Commands
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

### 12.2 Debug Commands
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

# Redis monitoring
docker exec -it simplex-monitor-redis redis-cli MONITOR
```

### 12.3 Frontend Development
```bash
# Dev server
cd ~/simplex-smp-monitor/frontend
npm run dev

# Build for production
npm run build

# Check TypeScript errors
npx tsc --noEmit

# Test specific page
# http://localhost:5173/tor-networks/{network-id}/analytics
```

### 12.4 Clean Up Commands
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

### 12.5 Common Git Commands
```bash
# Feature commit
git commit -m "feat(analytics): add ForensicsOverviewPage with timing charts"

# Fix commit
git commit -m "fix(circuits): resolve TypeScript errors in CircuitsListPage"

# Docs commit
git commit -m "docs: add REDIS.md real-time architecture guide"

# Style commit
git commit -m "style(components): apply Neon Blue theme to all cards"
```

---

*Document Version: 1.2*  
*Last Updated: January 17, 2026*  
*Author: cannatoshi*

**🔬 SimpleX SMP Monitor - Developer Documentation**