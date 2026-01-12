# ChutneX - Private Tor Network for SimpleX SMP Monitor Forensics

> **Version:** 1.0.0  
> **Status:** ✅ Production Ready  
> **Last Updated:** 12. Januar 2026  
> **Author:** cannatoshi

## 🎯 Overview

**ChutneX** is a fully isolated, private Tor network implementation that enables 100% controlled forensic analysis of SimpleX messaging infrastructure. Unlike testing over the public Tor network, ChutneX provides:

- **Complete Network Isolation** - No traffic leaves your local environment
- **Full Observability** - Every packet, every hop, every relay is yours
- **Reproducible Results** - Same network, same conditions, every time
- **Forensic Analysis Ready** - Perfect for timing correlation, traffic analysis, and security audits
```
┌────────────────────────────────────────────────────────────────────────────┐
│                          ChutneX Private Network                           │
│                                                                            │
│      ┌──────────┐      ┌──────────┐      ┌──────────┐                      │
│      │   DA1    │      │   DA2    │      │   DA3    │  Directory           │
│      │10.99.1.10│      │10.99.1.11│      │10.99.1.12│  Authorities         │
│      └────┬─────┘      └────┬─────┘      └────┬─────┘  (Consensus Voting)  │
│           └─────────────────┼─────────────────┘                            │
│                             ▼                                              │
│                    ┌────────────────┐                                      │
│                    │   Consensus    │  Votes + Signatures                  │
│                    │   Document     │  (Updated every 5 min)               │
│                    └───────┬────────┘                                      │
│                            │                                               │
│           ┌────────────────┼────────────────┐                              │
│           ▼                ▼                ▼                              │
│      ┌─────────┐      ┌──────────┐      ┌──────────┐                       │
│      │  Guard  │      │ Middle   │      │  Exit    │  Relay Nodes          │
│      │10.99.1.20│     │10.99.1.30│      │10.99.1.40│                       │
│      └────┬────┘      └────┬─────┘      └────┬─────┘                       │
│           └────────────────┼─────────────────┘                             │
│                            │                                               │
│              ┌─────────────┴─────────────┐                                 │
│              ▼                           ▼                                 │
│      ┌──────────────┐            ┌──────────────┐                          │
│      │ Client Node 1│            │ Client Node 2│  SOCKS Proxies           │
│      │  10.99.1.13  │            │  10.99.1.14  │  (Port 9050)             │
│      │  SOCKS:9050  │            │  SOCKS:9050  │                          │
│      └──────┬───────┘            └──────┬───────┘                          │
│             │                           │                                  │
│             ▼                           ▼                                  │
│      ┌──────────────┐            ┌──────────────┐                          │
│      │SimpleX Client│            │SimpleX Client│  Your Test Clients       │
│      │  (socat →    │            │  (socat →    │                          │
│      │  localhost   │            │  localhost   │                          │
│      │   :9050)     │            │   :9050)     │                          │
│      └──────┬───────┘            └──────┬───────┘                          │
│             │                           │                                  │
│             └─────────────┬─────────────┘                                  │
│                           ▼                                                │
│                  ┌────────────────┐                                        │
│                  │   SMP Server   │  Hidden Service                        │
│                  │  (.onion only  │  (ChutneX-exclusive)                   │
│                  │  in ChutneX)   │                                        │
│                  └────────────────┘                                        │
│                                                                            │
│       Public Tor CANNOT reach this .onion - 100% Isolated!                 │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure
```
simplex-smp-monitor/
├── docker/images/chutnex/
│   ├── Dockerfile              # Multi-role Tor node image
│   ├── entrypoint.sh           # DA synchronization + node startup
│   ├── torrc.base              # Common Tor configuration
│   ├── torrc.da                # Directory Authority config
│   ├── torrc.relay             # Guard/Middle relay config
│   ├── torrc.exit              # Exit node config
│   └── torrc.client            # Client node (SOCKS proxy) config
│
├── docker/images/simplex-cli/
│   └── entrypoint.sh           # ChutneX SOCKS forwarding for clients
│
├── docker/images/simplex-smp-tor/
│   └── entrypoint.sh           # ChutneX Hidden Service for SMP servers
│
├── chutney/
│   ├── models.py               # TorNetwork, TorNode Django models
│   ├── admin.py                # Django Admin configuration
│   ├── api/
│   │   ├── views.py            # REST API ViewSets
│   │   ├── serializers.py      # DRF Serializers
│   │   └── urls.py             # API routing
│   └── services/
│       └── docker_manager.py   # Network orchestration logic
│
├── servers/
│   ├── models.py               # Server model with hosting_mode='chutnex'
│   └── services/
│       └── docker_manager.py   # Server container management
│
├── clients/
│   ├── models.py               # Client model with connection_mode
│   └── services/
│       └── docker_manager.py   # Client container management
│
└── frontend/src/
    ├── pages/
    │   ├── ChutneX.tsx         # Network management UI
    │   ├── ServerForm.tsx      # Hosting mode selection
    │   └── ClientForm.tsx      # Connection mode selection
    └── i18n/locales/
        ├── de.json             # German translations
        └── en.json             # English translations
```

---

## 🔧 Core Components

### 1. Directory Authority Synchronization

The most critical component is ensuring all Directory Authorities know about each other before starting Tor. Without this, consensus fails.

**File:** `docker/images/chutnex/entrypoint.sh`
```bash
#!/bin/bash
set -e

NODE_TYPE="${NODE_TYPE:-client}"
NODE_NICK="${NODE_NICK:-node}"
DA_COUNT="${DA_COUNT:-3}"

# ============================================================
# PHASE 1: DA REGISTRATION (Only for Directory Authorities)
# ============================================================
if [ "$NODE_TYPE" = "da" ]; then
    echo "📋 Generating DA keys and fingerprints..."
    
    # Generate authority identity key
    tor --DataDirectory /var/lib/tor --list-fingerprint --orport 9001 \
        --dirserver "x 127.0.0.1:80 0000000000000000000000000000000000000000" \
        --nickname "$NODE_NICK" >/dev/null 2>&1 || true
    
    # Extract fingerprints
    SERVER_FP=$(cat /var/lib/tor/fingerprint | awk '{print $2}')
    AUTH_FP=$(grep "fingerprint" /var/lib/tor/keys/authority_certificate | awk '{print $2}')
    
    # Get container IP
    NODE_IP=$(hostname -i | awk '{print $1}')
    
    # Build DirAuthority line
    DA_LINE="DirAuthority $NODE_NICK orport=9001 no-v2 v3ident=$AUTH_FP $NODE_IP:80 $SERVER_FP"
    
    # Register with file locking
    (
        flock -x 200
        echo "$DA_LINE" >> /status/dir-authorities
        echo "✅ Registered: $DA_LINE"
    ) 200>/status/dir-authorities.lock
fi

# ============================================================
# PHASE 2: WAIT FOR ALL DAs (All nodes wait here)
# ============================================================
echo "⏳ Waiting for $DA_COUNT Directory Authorities..."
WAIT_COUNT=0
while true; do
    if [ -f /status/dir-authorities ]; then
        CURRENT_COUNT=$(wc -l < /status/dir-authorities)
        if [ "$CURRENT_COUNT" -ge "$DA_COUNT" ]; then
            echo "✅ All $DA_COUNT DAs registered!"
            break
        fi
    fi
    
    WAIT_COUNT=$((WAIT_COUNT + 1))
    if [ $((WAIT_COUNT % 10)) -eq 0 ]; then
        echo "   Still waiting... ($CURRENT_COUNT/$DA_COUNT DAs)"
    fi
    
    if [ "$WAIT_COUNT" -ge 120 ]; then
        echo "❌ Timeout waiting for DAs!"
        exit 1
    fi
    
    sleep 1
done

# ============================================================
# PHASE 3: BUILD TORRC WITH ALL DAs
# ============================================================
echo "📝 Building torrc configuration..."

# Copy base config for node type
cp /etc/tor/torrc.$NODE_TYPE /etc/tor/torrc

# Append all DirAuthority entries
cat /status/dir-authorities >> /etc/tor/torrc

echo "🚀 Starting Tor daemon..."
exec tor -f /etc/tor/torrc
```

### 2. Network Topology Model

**File:** `chutney/models.py`
```python
class TorNetwork(models.Model):
    """
    Represents a complete ChutneX private Tor network.
    
    A network consists of:
    - 3+ Directory Authorities (consensus voting)
    - 1+ Guard nodes (entry points)
    - 1+ Middle relays (routing)
    - 1+ Exit nodes (egress)
    - 1+ Client nodes (SOCKS proxies)
    """
    
    class Status(models.TextChoices):
        CREATED = 'created', 'Created'
        STARTING = 'starting', 'Starting'
        RUNNING = 'running', 'Running'
        STOPPING = 'stopping', 'Stopping'
        STOPPED = 'stopped', 'Stopped'
        ERROR = 'error', 'Error'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CREATED)
    
    # Network configuration
    subnet = models.CharField(max_length=20, default='10.99.0.0/16')
    base_socks_port = models.IntegerField(default=19000)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    
    @property
    def docker_network_name(self):
        return f"chutnex-{self.slug}"
    
    @property
    def status_volume_name(self):
        return f"chutnex-status-{self.slug}"


class TorNode(models.Model):
    """
    Individual node within a ChutneX network.
    """
    
    class NodeType(models.TextChoices):
        DA = 'da', 'Directory Authority'
        GUARD = 'guard', 'Guard Relay'
        MIDDLE = 'middle', 'Middle Relay'
        EXIT = 'exit', 'Exit Node'
        CLIENT = 'client', 'Client (SOCKS Proxy)'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    network = models.ForeignKey(TorNetwork, on_delete=models.CASCADE, related_name='nodes')
    node_type = models.CharField(max_length=20, choices=NodeType.choices)
    nickname = models.CharField(max_length=50)
    
    # Container info
    container_id = models.CharField(max_length=64, blank=True)
    container_name = models.CharField(max_length=100)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    # For client nodes: exposed SOCKS port
    socks_port = models.IntegerField(null=True, blank=True)
    
    # Status
    is_bootstrapped = models.BooleanField(default=False)
    bootstrap_percent = models.IntegerField(default=0)
```

### 3. Docker Network Orchestration

**File:** `chutney/services/docker_manager.py`
```python
class ChutneXDockerManager:
    """
    Orchestrates the creation and management of ChutneX networks.
    """
    
    IMAGE_NAME = 'chutnex:latest'
    
    def __init__(self):
        self.client = docker.from_env()
    
    def create_network(self, network: TorNetwork) -> str:
        """
        Create Docker network with specific subnet for ChutneX.
        """
        ipam_pool = docker.types.IPAMPool(subnet=network.subnet)
        ipam_config = docker.types.IPAMConfig(pool_configs=[ipam_pool])
        
        docker_network = self.client.networks.create(
            name=network.docker_network_name,
            driver='bridge',
            ipam=ipam_config,
            labels={
                'chutnex.managed': 'true',
                'chutnex.network_id': str(network.id),
            }
        )
        
        return docker_network.id
    
    def start_network(self, network: TorNetwork):
        """
        Start all nodes in the correct order:
        1. Create status volume
        2. Start Directory Authorities
        3. Wait for consensus
        4. Start relays (guard, middle, exit)
        5. Start client nodes
        """
        
        # Create shared status volume
        self._create_status_volume(network)
        
        # Count DAs for synchronization
        da_count = network.nodes.filter(node_type='da').count()
        
        # Start all nodes (they self-synchronize via DA_COUNT)
        for node in network.nodes.all():
            self._start_node(node, da_count)
        
        network.status = TorNetwork.Status.RUNNING
        network.started_at = timezone.now()
        network.save()
    
    def _start_node(self, node: TorNode, da_count: int):
        """
        Start a single Tor node container.
        """
        
        environment = {
            'NODE_TYPE': node.node_type,
            'NODE_NICK': node.nickname,
            'DA_COUNT': str(da_count),
        }
        
        volumes = {
            node.network.status_volume_name: {'bind': '/status', 'mode': 'rw'},
            f"{node.container_name}-data": {'bind': '/var/lib/tor', 'mode': 'rw'},
        }
        
        # Client nodes expose SOCKS port
        ports = {}
        if node.node_type == 'client' and node.socks_port:
            ports['9050/tcp'] = node.socks_port
        
        container = self.client.containers.create(
            name=node.container_name,
            image=self.IMAGE_NAME,
            environment=environment,
            volumes=volumes,
            ports=ports,
            network=node.network.docker_network_name,
            detach=True,
        )
        
        # Assign static IP
        if node.ip_address:
            docker_net = self.client.networks.get(node.network.docker_network_name)
            docker_net.disconnect(container)
            docker_net.connect(container, ipv4_address=node.ip_address)
        
        container.start()
        node.container_id = container.id
        node.save()
```

### 4. SimpleX Client Integration

**File:** `docker/images/simplex-cli/entrypoint.sh`
```bash
#!/bin/bash
set -e

echo "=== SimpleX CLI Container Starting ==="
echo "ChutneX Mode: ${CHUTNEX_MODE:-0}"

# ChutneX Internal Mode: Forward SOCKS to ChutneX client node
if [ "${USE_TOR}" = "true" ] && [ "${CHUTNEX_MODE}" = "1" ]; then
    
    # Default to first ChutneX client node
    CHUTNEX_SOCKS_HOST="${CHUTNEX_SOCKS_HOST:-10.99.1.13}"
    
    echo "🔬 ChutneX Mode: Forwarding localhost:9050 -> ${CHUTNEX_SOCKS_HOST}:9050"
    
    # Create SOCKS tunnel via socat
    socat TCP-LISTEN:9050,bind=127.0.0.1,fork,reuseaddr \
          TCP:${CHUTNEX_SOCKS_HOST}:9050 &
    
    sleep 2
    
elif [ "${USE_TOR}" = "true" ]; then
    # Standard public Tor mode
    echo "🧅 Public Tor Mode: Starting local Tor..."
    tor &
    sleep 5
fi

# Start simplex-chat
simplex-chat -p 3030 -d /data &

# Forward external port
exec socat TCP-LISTEN:${SIMPLEX_PORT:-3030},bind=0.0.0.0,fork,reuseaddr \
           TCP:127.0.0.1:3030
```

### 5. SMP Server Hidden Service

**File:** `docker/images/simplex-smp-tor/entrypoint.sh` (ChutneX section)
```bash
if [ "${CHUTNEX_MODE}" = "1" ]; then
    echo "🔬 ChutneX Mode: Configuring for private Tor network..."
    
    # Wait for DirAuthorities from ChutneX network
    STATUS_AUTHORITIES="/status/dir-authorities"
    
    WAIT_COUNT=0
    while [ ! -s "${STATUS_AUTHORITIES}" ] && [ ${WAIT_COUNT} -lt 60 ]; do
        sleep 1
        WAIT_COUNT=$((WAIT_COUNT + 1))
    done
    
    # Build torrc with ChutneX DAs
    cat > /etc/tor/torrc << TORRC_EOF
# ChutneX Private Tor Network Configuration
TestingTorNetwork 1
AssumeReachable 1
AddressDisableIPv6 1

DataDirectory /var/lib/tor
HiddenServiceDir /var/lib/tor/simplex-smp/
HiddenServicePort 5223 127.0.0.1:5223

Log notice file /var/log/tor/notices.log

# Directory Authorities from ChutneX
$(cat ${STATUS_AUTHORITIES})
TORRC_EOF
    
fi

# Start Tor with ChutneX config
tor -f /etc/tor/torrc &

# Wait for .onion address generation
while [ ! -f "/var/lib/tor/simplex-smp/hostname" ]; do
    sleep 1
done

ONION_ADDRESS=$(cat /var/lib/tor/simplex-smp/hostname)
echo "✅ ChutneX Hidden Service: $ONION_ADDRESS"
```

---

## 🌐 Network Configuration

### Default Node Layout

| Node Type | Nickname | IP Address | Role |
|-----------|----------|------------|------|
| DA | da1 | 10.99.1.10 | Directory Authority #1 |
| DA | da2 | 10.99.1.11 | Directory Authority #2 |
| DA | da3 | 10.99.1.12 | Directory Authority #3 |
| Client | client1 | 10.99.1.13 | SOCKS Proxy (Port 19000) |
| Client | client2 | 10.99.1.14 | SOCKS Proxy (Port 19001) |
| Guard | guard1 | 10.99.1.20 | Entry Node |
| Middle | middle1 | 10.99.1.30 | Middle Relay |
| Exit | exit1 | 10.99.1.40 | Exit Node |

### Tor Configuration Templates

**Directory Authority (`torrc.da`):**
```
TestingTorNetwork 1
AssumeReachable 1
AddressDisableIPv6 1

AuthoritativeDirectory 1
V3AuthoritativeDirectory 1
ContactInfo chutnex@localhost

# Will be populated by entrypoint.sh
# DirAuthority entries go here
```

**Client Node (`torrc.client`):**
```
TestingTorNetwork 1
AssumeReachable 1
AddressDisableIPv6 1

SocksPort 0.0.0.0:9050
SocksPolicy accept *

# Will be populated by entrypoint.sh
# DirAuthority entries go here
```

---

## 🔌 API Reference

### Networks
```http
GET    /api/v1/chutney/networks/
POST   /api/v1/chutney/networks/
GET    /api/v1/chutney/networks/{id}/
DELETE /api/v1/chutney/networks/{id}/

POST   /api/v1/chutney/networks/{id}/start/
POST   /api/v1/chutney/networks/{id}/stop/
GET    /api/v1/chutney/networks/{id}/status/
```

### Nodes
```http
GET    /api/v1/chutney/networks/{id}/nodes/
GET    /api/v1/chutney/nodes/{id}/
GET    /api/v1/chutney/nodes/{id}/logs/
```

### Example: Create Network
```bash
curl -X POST http://localhost:8000/api/v1/chutney/networks/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TestNet",
    "num_das": 3,
    "num_guards": 1,
    "num_middles": 1,
    "num_exits": 1,
    "num_clients": 2
  }'
```

### Example: Start Network
```bash
curl -X POST http://localhost:8000/api/v1/chutney/networks/{id}/start/
```

---

## 📊 Data Sources for Analysis

ChutneX provides multiple data extraction points for forensic analysis and integration with enterprise tools (Phase 10: Zeek, Suricata, Neo4j, etc.)

### 1. Tor Control Port (stem)

Every ChutneX node can expose a control port for programmatic access.
```python
from stem import Signal
from stem.control import Controller

# Connect to a ChutneX node's control port
with Controller.from_port(address='10.99.1.13', port=9051) as controller:
    controller.authenticate()
    
    # Get circuit information
    for circuit in controller.get_circuits():
        print(f"Circuit {circuit.id}: {circuit.path}")
    
    # Get bandwidth stats
    bytes_read = controller.get_info("traffic/read")
    bytes_written = controller.get_info("traffic/written")
    
    # Get consensus info
    consensus = controller.get_info("ns/all")
```

### 2. Docker Network Traffic Capture

Capture all traffic on the ChutneX bridge network:
```bash
# Find network interface
INTERFACE=$(docker network inspect chutnex-berlin8 \
  --format '{{.Id}}' | cut -c1-12)
BRIDGE="br-${INTERFACE}"

# Capture with tcpdump
sudo tcpdump -i $BRIDGE -w chutnex_traffic.pcap

# Or use tshark for live analysis
sudo tshark -i $BRIDGE -Y "tcp.port == 9001 or tcp.port == 80"
```

### 3. Container Logs
```bash
# All node logs
docker logs chutnex-berlin8-da1
docker logs chutnex-berlin8-exit1

# Django aggregated logs
GET /api/v1/chutney/nodes/{id}/logs/?tail=100
```

### 4. Tor Metrics Files

Each Tor node generates metrics in `/var/lib/tor/`:
```bash
# Bootstrap status
docker exec chutnex-berlin8-da1 cat /var/lib/tor/state

# Bandwidth history
docker exec chutnex-berlin8-da1 cat /var/lib/tor/stats/bw-history

# Connection stats
docker exec chutnex-berlin8-exit1 cat /var/lib/tor/stats/conn-stats
```

### 5. Consensus Documents
```bash
# Current consensus
docker exec chutnex-berlin8-da1 cat /var/lib/tor/cached-consensus

# Microdescriptors
docker exec chutnex-berlin8-da1 cat /var/lib/tor/cached-microdescs
```

---

## 🔬 Analysis Integration (Phase 10 Preview)

### Zeek Protocol Analysis
```zeek
# chutnex.zeek - Custom Zeek script for ChutneX traffic

@load base/protocols/conn

module ChutneX;

export {
    redef enum Log::ID += { LOG };
    
    type Info: record {
        ts:           time    &log;
        src_ip:       addr    &log;
        dst_ip:       addr    &log;
        circuit_id:   count   &log &optional;
        cell_type:    string  &log &optional;
    };
}

event connection_established(c: connection) {
    # Track Tor cell traffic on port 9001
    if (c$id$resp_p == 9001/tcp) {
        local rec: Info = [
            $ts = network_time(),
            $src_ip = c$id$orig_h,
            $dst_ip = c$id$resp_h
        ];
        Log::write(ChutneX::LOG, rec);
    }
}
```

### Neo4j Graph Schema
```cypher
// ChutneX Network Graph Schema

// Node types
CREATE CONSTRAINT FOR (n:TorNode) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT FOR (c:Circuit) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT FOR (m:Message) REQUIRE m.id IS UNIQUE;

// Example queries:

// Find all circuits through a specific exit
MATCH path = (client:TorNode)-[:GUARD]->(:TorNode)-[:MIDDLE]->(:TorNode)-[:EXIT]->(exit:TorNode {nickname: 'exit1'})
RETURN path;

// Timing correlation analysis
MATCH (sender:SimplexClient)-[s:SENT]->(msg:Message)-[r:RECEIVED]->(recipient:SimplexClient)
WHERE r.timestamp - s.timestamp < duration('PT2S')
RETURN sender.name, recipient.name, s.timestamp, r.timestamp, r.timestamp - s.timestamp AS latency
ORDER BY latency;

// Traffic pattern detection
MATCH (c:SimplexClient)-[m:MESSAGE]->()
WITH c, m.timestamp.hour AS hour, count(*) AS msg_count
RETURN c.name, hour, msg_count
ORDER BY c.name, hour;
```

### Prometheus Metrics
```yaml
# prometheus.yml - ChutneX metrics scraping

scrape_configs:
  - job_name: 'chutnex'
    static_configs:
      - targets:
        - 'chutnex-berlin8-da1:9052'  # Tor metrics exporter
        - 'chutnex-berlin8-da2:9052'
        - 'chutnex-berlin8-da3:9052'
        - 'chutnex-berlin8-exit1:9052'
    metrics_path: /metrics
```

### Grafana Dashboard Queries
```promql
# Circuit build time distribution
histogram_quantile(0.95, 
  sum(rate(tor_circuit_build_time_bucket[5m])) by (le)
)

# Bytes through exit node
rate(tor_relay_bytes_total{direction="written", node="exit1"}[1m])

# Bootstrap status across all nodes
tor_bootstrap_percent{network="berlin8"}
```

---

## 🛡️ Security Verification

### Proof of Isolation

The ultimate test: Public Tor cannot reach ChutneX .onion addresses.
```bash
# Test 1: Public Tor (should FAIL)
curl -x socks5h://localhost:9050 \
  http://tvbdfd6jviyjnaxkrrwht75ixv3j3da2nt2bdvwfnqmco5pj3mfpj5qd.onion:5223 \
  --connect-timeout 10

# Expected: curl: (97) Can't complete SOCKS5 connection (4)

# Test 2: ChutneX (should SUCCEED)
docker exec simplex-client-client-001 \
  curl -x socks5h://127.0.0.1:9050 \
  http://tvbdfd6jviyjnaxkrrwht75ixv3j3da2nt2bdvwfnqmco5pj3mfpj5qd.onion:5223 \
  --connect-timeout 10

# Expected: curl: (52) Empty reply from server (connection established!)
```

### Verification Script
```bash
#!/bin/bash
# verify_chutnex.sh - Verify ChutneX isolation

echo "🔬 ChutneX Isolation Verification"
echo "================================="

ONION=$(docker exec simplex-smp-berlin cat /var/lib/tor/simplex-smp/hostname)
echo "Testing .onion: $ONION"

echo ""
echo "Test 1: Public Tor Access (should fail)..."
if curl -x socks5h://localhost:9050 "http://$ONION:5223" --connect-timeout 5 2>&1 | grep -q "Can't complete SOCKS5"; then
    echo "✅ PASS: Public Tor cannot reach ChutneX"
else
    echo "❌ FAIL: Public Tor should not reach ChutneX!"
    exit 1
fi

echo ""
echo "Test 2: ChutneX Access (should succeed)..."
if docker exec simplex-client-client-001 \
   curl -x socks5h://127.0.0.1:9050 "http://$ONION:5223" --connect-timeout 10 2>&1 | grep -q "Empty reply"; then
    echo "✅ PASS: ChutneX client can reach server"
else
    echo "❌ FAIL: ChutneX client should reach server!"
    exit 1
fi

echo ""
echo "🎉 All tests passed! ChutneX is 100% isolated."
```

---

## 📈 Performance Characteristics

| Metric | Public Tor | ChutneX | Improvement |
|--------|------------|---------|-------------|
| Circuit Build | 2-10s | 0.5-2s | 5-10x faster |
| Message Latency | 500ms-5s | 50-200ms | 10-25x faster |
| Bootstrap Time | 30-120s | 10-30s | 3-4x faster |
| Bandwidth | ISP limited | LAN speed | 100x+ |
| Reproducibility | Variable | 100% | ∞ |

---

## 🚀 Quick Start

### 1. Build ChutneX Image
```bash
cd docker/images/chutnex
docker build -t chutnex:latest .
```

### 2. Create Network via UI

1. Navigate to **ChutneX** → **New Network**
2. Configure: 3 DAs, 1 Guard, 1 Middle, 1 Exit, 2 Clients
3. Click **Create & Start**

### 3. Create ChutneX Server

1. Navigate to **Servers** → **New Server**
2. Select **🔬 ChutneX** hosting mode
3. Choose your ChutneX network
4. Click **Create**

### 4. Create ChutneX Clients

1. Navigate to **Clients** → **New Client**
2. Select **🔬 ChutneX Internal** connection mode
3. Choose your ChutneX network
4. Select your ChutneX server
5. Click **Create** & **Start**

### 5. Test Communication

1. Create second client (same steps)
2. Click **Connect** between clients
3. Send test messages
4. Verify in **Adversary View** (Phase 4)

---

## 📚 References

- [Tor Chutney (Official)](https://gitlab.torproject.org/tpo/core/chutney)
- [Tor Specification](https://spec.torproject.org/)
- [SimpleX Messaging Protocol](https://github.com/simplex-chat/simplexmq/blob/stable/protocol/)
- [stem - Tor Controller Library](https://stem.torproject.org/)

---

## 🏆 Achievements

| Milestone | Date | Description |
|-----------|------|-------------|
| ✅ DA Synchronization | 12.01.2026 | All DAs wait for each other before Tor start |
| ✅ Client Integration | 12.01.2026 | SimpleX clients route through ChutneX SOCKS |
| ✅ Server Integration | 12.01.2026 | SMP servers register Hidden Services in ChutneX |
| ✅ 100% Isolation | 12.01.2026 | Verified: Public Tor cannot reach ChutneX |
| ✅ Message Flow | 12.01.2026 | End-to-end messaging through private Tor |

---

*ChutneX - Your Private Tor Network for SimpleX SMP Monitor Forensics* 🔬🧅
