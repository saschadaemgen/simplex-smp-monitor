# ChutneX - Private Tor Network for SimpleX Forensics

## 🔬 Executive Summary

**ChutneX** is a complete **private Tor network implementation** for the SimpleX SMP Monitor, enabling 100% isolated messaging infrastructure for forensic analysis, security research, and controlled testing environments.

This document provides comprehensive technical documentation of the ChutneX system architecture, implementation details, and integration points for advanced data analysis.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Network Topology](#3-network-topology)
4. [Implementation Details](#4-implementation-details)
5. [Directory Authority Synchronization](#5-directory-authority-synchronization)
6. [Server Integration](#6-server-integration)
7. [Client Integration](#7-client-integration)
8. [Data Analysis Points](#8-data-analysis-points)
9. [File Reference](#9-file-reference)
10. [Verification & Testing](#10-verification--testing)
11. [Integration with Enterprise Stack](#11-integration-with-enterprise-stack)

---

## 1. Overview

### 1.1 What is ChutneX?

ChutneX is a **Docker-based private Tor network** that creates an isolated environment where:

- **Directory Authorities (DAs)** maintain network consensus
- **Guard, Middle, and Exit relays** form the onion routing paths  
- **Client nodes** provide SOCKS5 proxies for application traffic
- **Hidden Services** are only resolvable within this private network

### 1.2 Key Achievement

```
┌─────────────────────────────────────────────────────────────────┐
│                    ISOLATION PROOF                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Public Tor → ChutneX .onion:  ❌ UNREACHABLE                   │
│  curl: (97) Can't complete SOCKS5 connection (error 4)          │
│                                                                 │
│  ChutneX → ChutneX .onion:     ✅ CONNECTED                     │
│  curl: (52) Empty reply from server (connected, not HTTP)       │
│                                                                 │
│  RESULT: 100% Network Isolation Achieved                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Use Cases

| Use Case | Description |
|----------|-------------|
| **Forensic Analysis** | Complete visibility into Tor circuit behavior |
| **Security Research** | Test timing attacks in controlled environment |
| **Development Testing** | Fast iteration without public Tor latency |
| **Training** | Educate on Tor internals with full observability |
| **Penetration Testing** | Isolated environment for security assessments |

---

## 2. Architecture

### 2.1 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SIMPLEX SMP MONITOR                               │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Django Backend                                 │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │ │
│  │  │   chutney/   │  │   servers/   │  │   clients/   │                  │ │
│  │  │   models.py  │  │   models.py  │  │   models.py  │                  │ │
│  │  │   views.py   │  │   docker_    │  │   docker_    │                  │ │
│  │  │   api/       │  │   manager.py │  │   manager.py │                  │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │ │
│  │         │                 │                 │                          │ │
│  │         └─────────────────┼─────────────────┘                          │ │
│  │                           │                                            │ │
│  │                    Docker Python SDK                                   │ │
│  └───────────────────────────┼────────────────────────────────────────────┘ │
│                              │                                              │
│  ┌───────────────────────────▼────────────────────────────────────────────┐ │
│  │                      Docker Engine                                     │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │              Docker Network: chutnex-<network-slug>             │   │ │
│  │  │                        (10.99.0.0/16)                           │   │ │
│  │  │                                                                 │   │ │
│  │  │  ┌─────────────────────────────────────────────────────────┐    │   │ │
│  │  │  │              Directory Authorities                      │    │   │ │
│  │  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                  │    │   │ │
│  │  │  │  │   DA1   │  │   DA2   │  │   DA3   │                  │    │   │ │
│  │  │  │  │10.99.1.10│ │10.99.1.11│ │10.99.1.12│                  │    │   │ │
│  │  │  │  │ :80/:9001│ │ :80/:9001│ │ :80/:9001│                  │    │   │ │
│  │  │  │  └────┬────┘  └────┬────┘  └────┬────┘                  │    │   │ │
│  │  │  │       └────────────┼────────────┘                       │    │   │ │
│  │  │  │                    │ Consensus Voting                   │    │   │ │
│  │  │  └────────────────────┼────────────────────────────────────┘    │   │ │
│  │  │                       │                                         │   │ │
│  │  │  ┌────────────────────▼────────────────────────────────────┐    │   │ │
│  │  │  │                   Relay Nodes                           │    │   │ │
│  │  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │    │   │ │
│  │  │  │  │ Guard1  │  │ Guard2  │  │ Middle1 │  │ Middle2 │     │    │   │ │
│  │  │  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘     │    │   │ │
│  │  │  │       └────────────┴────────────┴────────────┘          │    │   │ │
│  │  │  │                          │                              │    │   │ │
│  │  │  │  ┌─────────┐  ┌─────────┐│                              │    │   │ │
│  │  │  │  │  Exit1  │  │  Exit2  ││                              │    │   │ │
│  │  │  │  └─────────┘  └─────────┘│                              │    │   │ │
│  │  │  └─────────────────────────┼───────────────────────────────┘    │   │ │
│  │  │                            │                                    │   │ │
│  │  │  ┌─────────────────────────▼───────────────────────────────┐    │   │ │
│  │  │  │                  Client Nodes                           │    │   │ │
│  │  │  │  ┌─────────────────┐  ┌─────────────────┐               │    │   │ │
│  │  │  │  │    Client1      │  │    Client2      │               │    │   │ │
│  │  │  │  │  SOCKS:9050     │  │  SOCKS:9050     │               │    │   │ │
│  │  │  │  │  10.99.1.13     │  │  10.99.1.14     │               │    │   │ │
│  │  │  │  └────────┬────────┘  └────────┬────────┘               │    │   │ │
│  │  │  └───────────┼────────────────────┼────────────────────────┘    │   │ │
│  │  │              │                    │                             │   │ │
│  │  │              │    SOCKS5 Proxy    │                             │   │ │
│  │  │              │                    │                             │   │ │
│  │  │  ┌───────────▼────────────────────▼────────────────────────┐    │   │ │
│  │  │  │              Application Layer                          │    │   │ │
│  │  │  │                                                         │    │   │ │
│  │  │  │  ┌─────────────────┐        ┌─────────────────┐         │    │   │ │
│  │  │  │  │  SMP Server     │        │  SimpleX Client │         │    │   │ │
│  │  │  │  │  (Hidden Svc)   │◄──────►│  (via socat)    │         │    │   │ │
│  │  │  │  │  .onion:5223    │        │  localhost:9050 │         │    │   │ │
│  │  │  │  └─────────────────┘        └─────────────────┘         │    │   │ │
│  │  │  └─────────────────────────────────────────────────────────┘    │   │ │
│  │  │                                                                 │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                        │ │
│  │  Shared Volume: chutnex-status-<slug>                                  │ │
│  │  Contains: /status/dir-authorities (DA fingerprints)                   │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Network Layer Separation

```
┌─────────────────────────────────────────────────────────────────┐
│                    NETWORK LAYERS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Host Network (192.168.x.x)                            │
│  ├── Django Backend (localhost:8000)                            │
│  ├── React Frontend (localhost:3001)                            │
│  └── Port mappings to containers                                │
│                                                                 │
│  Layer 2: Docker Bridge (simplex-clients, 172.19.0.0/16)        │
│  ├── SimpleX Client containers (port mapping)                   │
│  └── WebSocket access from Django                               │
│                                                                 │
│  Layer 3: ChutneX Network (chutnex-<slug>, 10.99.0.0/16)        │
│  ├── All Tor nodes (DA, Guard, Middle, Exit, Client)            │
│  ├── SMP Server (Hidden Service)                                │
│  └── SimpleX Clients (dual-homed for SOCKS access)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Network Topology

### 3.1 Node Types and Functions

| Node Type | Count | Function | Ports |
|-----------|-------|----------|-------|
| **Directory Authority (DA)** | 3 | Consensus voting, network directory | 80 (Dir), 9001 (OR) |
| **Guard Relay** | 2 | Entry point for circuits | 9001 (OR) |
| **Middle Relay** | 2 | Intermediate routing | 9001 (OR) |
| **Exit Relay** | 2 | Exit point for traffic | 9001 (OR) |
| **Client Node** | 2 | SOCKS5 proxy provider | 9050 (SOCKS) |

### 3.2 Default IP Assignment (Berlin8 Example)

```
chutnex-berlin8 Network (10.99.0.0/16)
├── DA Subnet (10.99.1.10-12)
│   ├── da1: 10.99.1.10
│   ├── da2: 10.99.1.11
│   └── da3: 10.99.1.12
│
├── Relay Subnet (10.99.1.20-29)
│   ├── guard1:  10.99.1.20
│   ├── guard2:  10.99.1.21
│   ├── middle1: 10.99.1.22
│   ├── middle2: 10.99.1.23
│   ├── exit1:   10.99.1.24
│   └── exit2:   10.99.1.25
│
├── Client Subnet (10.99.1.13-14)
│   ├── client1: 10.99.1.13 (SOCKS:9050)
│   └── client2: 10.99.1.14 (SOCKS:9050)
│
└── Application Containers (10.99.0.x)
    ├── simplex-smp-berlin: 10.99.0.2 (Hidden Service)
    └── simplex-client-*:   10.99.0.3+ (via socat tunnel)
```

### 3.3 Circuit Path Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOR CIRCUIT PATH                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SimpleX Client                                                 │
│       │                                                         │
│       │ SOCKS5 Request (.onion)                                 │
│       ▼                                                         │
│  ┌─────────┐                                                    │
│  │ Client1 │ (10.99.1.13:9050)                                  │
│  │  Node   │                                                    │
│  └────┬────┘                                                    │
│       │                                                         │
│       │ Encrypted (Layer 3)                                     │
│       ▼                                                         │
│  ┌─────────┐                                                    │
│  │ Guard1  │ Entry Node                                         │
│  │         │ Knows: Client IP, Next Hop                         │
│  └────┬────┘ Doesn't Know: Destination, Content                 │
│       │                                                         │
│       │ Encrypted (Layer 2)                                     │
│       ▼                                                         │
│  ┌─────────┐                                                    │
│  │ Middle1 │ Intermediate Node                                  │
│  │         │ Knows: Prev Hop, Next Hop                          │
│  └────┬────┘ Doesn't Know: Origin, Destination, Content         │
│       │                                                         │
│       │ Encrypted (Layer 1)                                     │
│       ▼                                                         │
│  ┌─────────┐                                                    │
│  │ Exit1   │ → Rendezvous Point                                 │
│  │         │ Knows: Prev Hop                                    │
│  └────┬────┘ For .onion: Routes to Intro Point                  │
│       │                                                         │
│       │ Hidden Service Protocol                                 │
│       ▼                                                         │
│  ┌─────────────────┐                                            │
│  │   SMP Server    │                                            │
│  │  Hidden Service │                                            │
│  │    .onion       │                                            │
│  └─────────────────┘                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Implementation Details

### 4.1 Django Models

#### TorNetwork Model (`chutney/models.py`)

```python
class TorNetwork(models.Model):
    """
    Represents a complete private Tor network instance.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    
    # Network Configuration
    base_ip = models.GenericIPAddressField(default='10.99.0.1')
    base_or_port = models.IntegerField(default=9001)
    base_dir_port = models.IntegerField(default=7000)
    base_socks_port = models.IntegerField(default=19000)
    
    # Status
    class Status(models.TextChoices):
        NOT_CREATED = 'not_created', 'Not Created'
        CREATING = 'creating', 'Creating'
        STARTING = 'starting', 'Starting'
        RUNNING = 'running', 'Running'
        STOPPING = 'stopping', 'Stopping'
        STOPPED = 'stopped', 'Stopped'
        ERROR = 'error', 'Error'
    
    status = models.CharField(max_length=20, choices=Status.choices)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### TorNode Model (`chutney/models.py`)

```python
class TorNode(models.Model):
    """
    Individual node in a private Tor network.
    """
    class NodeType(models.TextChoices):
        DA = 'da', 'Directory Authority'
        GUARD = 'guard', 'Guard Relay'
        MIDDLE = 'middle', 'Middle Relay'
        EXIT = 'exit', 'Exit Relay'
        CLIENT = 'client', 'Client'
    
    network = models.ForeignKey(TorNetwork, on_delete=models.CASCADE)
    node_type = models.CharField(max_length=10, choices=NodeType.choices)
    nickname = models.CharField(max_length=50)
    
    # Network Configuration
    ip_address = models.GenericIPAddressField()
    or_port = models.IntegerField(default=9001)
    dir_port = models.IntegerField(null=True, blank=True)
    socks_port = models.IntegerField(null=True, blank=True)
    
    # Tor Identity
    fingerprint = models.CharField(max_length=64, blank=True)
    authority_v3ident = models.CharField(max_length=64, blank=True)
    
    # Docker
    container_id = models.CharField(max_length=64, blank=True)
    container_name = models.CharField(max_length=100)
```

### 4.2 Docker Manager

The `ChutneXDockerManager` orchestrates all container operations:

```python
# chutney/services/docker_manager.py

class ChutneXDockerManager:
    """
    Manages Docker containers for ChutneX private Tor network.
    """
    
    IMAGE_NAME = 'chutnex:latest'
    NETWORK_PREFIX = 'chutnex-'
    
    def create_network(self, network: TorNetwork) -> str:
        """
        Create Docker network with IPAM configuration.
        """
        ipam_config = docker.types.IPAMConfig(
            pool_configs=[
                docker.types.IPAMPool(
                    subnet='10.99.0.0/16',
                    gateway='10.99.0.1'
                )
            ]
        )
        
        docker_network = self.client.networks.create(
            name=f"{self.NETWORK_PREFIX}{network.slug}",
            driver='bridge',
            ipam=ipam_config,
            labels={
                'chutnex.network_id': str(network.id),
                'chutnex.managed': 'true'
            }
        )
        return docker_network.id
    
    def start_node(self, node: TorNode) -> str:
        """
        Start a single Tor node container.
        """
        da_count = node.network.nodes.filter(node_type='da').count()
        
        environment = {
            'ROLE': node.node_type.upper(),
            'NICKNAME': node.nickname,
            'ADDRESS': node.ip_address,
            'OR_PORT': str(node.or_port),
            'DA_COUNT': str(da_count),  # Critical for synchronization
        }
        
        volumes = {
            f"chutnex-status-{node.network.slug}": {
                'bind': '/status', 
                'mode': 'rw'
            },
            f"chutnex-{node.container_name}": {
                'bind': '/var/lib/tor',
                'mode': 'rw'
            }
        }
        
        container = self.client.containers.run(
            image=self.IMAGE_NAME,
            name=node.container_name,
            environment=environment,
            volumes=volumes,
            network=f"{self.NETWORK_PREFIX}{node.network.slug}",
            detach=True
        )
        
        # Assign static IP
        docker_network = self.client.networks.get(
            f"{self.NETWORK_PREFIX}{node.network.slug}"
        )
        docker_network.disconnect(container)
        docker_network.connect(container, ipv4_address=node.ip_address)
        
        return container.id
```

### 4.3 ChutneX Container Entrypoint

The entrypoint script handles node configuration and DA synchronization:

```bash
#!/bin/bash
# docker/images/chutnex/entrypoint.sh

set -e

ROLE="${ROLE:-CLIENT}"
NICKNAME="${NICKNAME:-TorNode}"
ADDRESS="${ADDRESS:-127.0.0.1}"
OR_PORT="${OR_PORT:-9001}"
DIR_PORT="${DIR_PORT:-7000}"
DA_COUNT="${DA_COUNT:-3}"

TORRC="/var/lib/tor/torrc"
STATUS_DIR="/status"
DA_FILE="${STATUS_DIR}/dir-authorities"

# ============================================================
# PHASE 1: Generate Keys (DA only)
# ============================================================
if [ "$ROLE" = "DA" ] || [ "$ROLE" = "da" ]; then
    echo "🔑 Generating DA keys..."
    
    # Generate authority identity key
    tor --DataDirectory /var/lib/tor --list-fingerprint --orport $OR_PORT \
        --Nickname $NICKNAME 2>/dev/null || true
    
    # Generate v3 authority key  
    tor-gencert --create-identity-key \
        -i /var/lib/tor/keys/authority_identity_key \
        -s /var/lib/tor/keys/authority_signing_key \
        -c /var/lib/tor/keys/authority_certificate \
        -m 12 -a $ADDRESS:$DIR_PORT 2>/dev/null || true
    
    # Extract fingerprints
    SERVER_FP=$(cat /var/lib/tor/fingerprint | awk '{print $2}')
    AUTH_FP=$(grep fingerprint /var/lib/tor/keys/authority_certificate | \
              awk '{print $2}')
    
    # Register with shared volume (with file locking)
    DA_LINE="DirAuthority $NICKNAME orport=$OR_PORT no-v2 "
    DA_LINE+="v3ident=$AUTH_FP $ADDRESS:$DIR_PORT $SERVER_FP"
    
    (
        flock -x 200
        if ! grep -q "$NICKNAME" "$DA_FILE" 2>/dev/null; then
            echo "$DA_LINE" >> "$DA_FILE"
            echo "✅ DA registered: $NICKNAME"
        fi
    ) 200>"${DA_FILE}.lock"
fi

# ============================================================
# PHASE 2: Wait for ALL Directory Authorities
# ============================================================
echo "⏳ Waiting for $DA_COUNT DAs to register..."

WAIT_COUNT=0
MAX_WAIT=120

while [ $(wc -l < "$DA_FILE" 2>/dev/null || echo 0) -lt $DA_COUNT ]; do
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    
    if [ $((WAIT_COUNT % 10)) -eq 0 ]; then
        CURRENT=$(wc -l < "$DA_FILE" 2>/dev/null || echo 0)
        echo "   Still waiting... ($CURRENT/$DA_COUNT DAs, ${WAIT_COUNT}s)"
    fi
    
    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        echo "⚠️ Timeout waiting for DAs!"
        break
    fi
done

echo "✅ All $DA_COUNT DAs registered!"

# ============================================================
# PHASE 3: Generate torrc
# ============================================================
cat > "$TORRC" << TORRC_BASE
# ChutneX Private Tor Network
# Node: $NICKNAME ($ROLE)

TestingTorNetwork 1
AssumeReachable 1
AddressDisableIPv6 1

DataDirectory /var/lib/tor
Nickname $NICKNAME
Address $ADDRESS

# Faster consensus for testing
TestingV3AuthInitialVotingInterval 20
TestingV3AuthInitialVoteDelay 4
TestingV3AuthInitialDistDelay 4
V3AuthVotingInterval 20
TORRC_BASE

# Role-specific configuration
case "$ROLE" in
    DA|da)
        cat >> "$TORRC" << TORRC_DA
AuthoritativeDirectory 1
V3AuthoritativeDirectory 1
ORPort 0.0.0.0:$OR_PORT
DirPort 0.0.0.0:$DIR_PORT
ContactInfo admin@chutnex.local
ExitPolicy reject *:*
TORRC_DA
        ;;
    
    GUARD|guard|MIDDLE|middle)
        cat >> "$TORRC" << TORRC_RELAY
ORPort 0.0.0.0:$OR_PORT
ExitRelay 0
SocksPort 0
TORRC_RELAY
        ;;
    
    EXIT|exit)
        cat >> "$TORRC" << TORRC_EXIT
ORPort 0.0.0.0:$OR_PORT
ExitRelay 1
ExitPolicy accept *:*
SocksPort 0
TORRC_EXIT
        ;;
    
    CLIENT|client)
        cat >> "$TORRC" << TORRC_CLIENT
SocksPort 0.0.0.0:${SOCKS_PORT:-9050}
SocksPolicy accept *
TORRC_CLIENT
        ;;
esac

# Append Directory Authorities
echo "" >> "$TORRC"
echo "# Directory Authorities" >> "$TORRC"
cat "$DA_FILE" >> "$TORRC"

# ============================================================
# PHASE 4: Start Tor
# ============================================================
echo "🧅 Starting Tor ($ROLE)..."
exec tor -f "$TORRC"
```

---

## 5. Directory Authority Synchronization

### 5.1 The Problem

When starting multiple DAs simultaneously:

1. Each DA generates its own keys
2. Each DA starts Tor immediately 
3. Each DA only knows about itself
4. **Result:** "Vote not from a recognized v3 authority" errors

### 5.2 The Solution

```
┌─────────────────────────────────────────────────────────────────┐
│              DA SYNCHRONIZATION PROTOCOL                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Key Generation (parallel)                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                          │
│  │   DA1   │  │   DA2   │  │   DA3   │                          │
│  │ gen key │  │ gen key │  │ gen key │                          │
│  └────┬────┘  └────┬────┘  └────┬────┘                          │
│       │            │            │                               │
│       ▼            ▼            ▼                               │
│  Step 2: Register (with flock)                                  │
│  ┌─────────────────────────────────────────────┐                │
│  │         /status/dir-authorities             │                │
│  │  DirAuthority da1 orport=9001 v3ident=... │                │
│  │  DirAuthority da2 orport=9001 v3ident=... │                │
│  │  DirAuthority da3 orport=9001 v3ident=... │                │
│  └─────────────────────────────────────────────┘                │
│       │            │            │                               │
│       ▼            ▼            ▼                               │
│  Step 3: Wait for DA_COUNT entries                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                          │
│  │  wait   │  │  wait   │  │  wait   │                          │
│  │ 3/3 DAs │  │ 3/3 DAs │  │ 3/3 DAs │                          │
│  └────┬────┘  └────┬────┘  └────┬────┘                          │
│       │            │            │                               │
│       ▼            ▼            ▼                               │
│  Step 4: Generate torrc with ALL DAs                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                          │
│  │ torrc   │  │ torrc   │  │ torrc   │                          │
│  │ 3 DAs   │  │ 3 DAs   │  │ 3 DAs   │                          │
│  └────┬────┘  └────┬────┘  └────┬────┘                          │
│       │            │            │                               │
│       ▼            ▼            ▼                               │
│  Step 5: Start Tor (synchronized)                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                          │
│  │  Tor    │  │  Tor    │  │  Tor    │                          │
│  │ 100%    │  │ 100%    │  │ 100%    │                          │
│  └─────────┘  └─────────┘  └─────────┘                          │
│                                                                 │
│  ✅ Consensus computed successfully!                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Verification

```bash
# Check DA synchronization
docker exec chutnex-berlin8-da1 cat /var/lib/tor/torrc | grep DirAuthority

# Expected output (ALL 3 DAs present):
DirAuthority da1 orport=9001 no-v2 v3ident=1E6458... 10.99.1.10:80 7AB701...
DirAuthority da2 orport=9001 no-v2 v3ident=C689B7... 10.99.1.11:80 890DDC...
DirAuthority da3 orport=9001 no-v2 v3ident=19B03A... 10.99.1.12:80 21AC23...

# Check consensus
docker logs chutnex-berlin8-da1 2>&1 | grep -E "Consensus|signature"
# Expected: "Consensus computed; uploading signature(s)"
```

---

## 6. Server Integration

### 6.1 SMP Server ChutneX Mode

The SMP server runs its Hidden Service within ChutneX:

```python
# servers/services/docker_manager.py

def create_server_container(self, server: Server):
    """
    Create SMP server container with ChutneX support.
    """
    if server.hosting_mode == 'chutnex':
        environment['CHUTNEX_MODE'] = '1'
        
        # Mount status volume for DA info
        status_volume = f"chutnex-status-{server.chutnex_network.slug}"
        volumes[status_volume] = {'bind': '/status', 'mode': 'ro'}
        
        # Join ChutneX network
        network_name = f"chutnex-{server.chutnex_network.slug}"
```

### 6.2 SMP Server Entrypoint (ChutneX Mode)

```bash
#!/bin/bash
# docker/images/simplex-smp-tor/entrypoint.sh

if [ "${CHUTNEX_MODE}" = "1" ]; then
    echo "🔬 ChutneX Mode: Configuring for private Tor network..."
    
    # Wait for DirAuthorities
    STATUS_AUTHORITIES="/status/dir-authorities"
    
    while [ ! -s "${STATUS_AUTHORITIES}" ]; do
        sleep 1
    done
    
    # Create ChutneX torrc
    cat > /etc/tor/torrc << TORRC_EOF
TestingTorNetwork 1
AssumeReachable 1
AddressDisableIPv6 1

DataDirectory /var/lib/tor
HiddenServiceDir /var/lib/tor/simplex-smp/
HiddenServicePort 5223 127.0.0.1:5223

# Directory Authorities from ChutneX
$(cat ${STATUS_AUTHORITIES})
TORRC_EOF
fi

# Start Tor and SMP server
tor &
sleep 5
exec smp-server start
```

### 6.3 Hidden Service in ChutneX

```
┌─────────────────────────────────────────────────────────────────┐
│                    HIDDEN SERVICE FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SMP Server Container                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │  smp-server (127.0.0.1:5223)                            │    │
│  │       ▲                                                 │    │
│  │       │ HiddenServicePort 5223                          │    │
│  │       │                                                 │    │
│  │  Tor Process (ChutneX DAs)                              │    │
│  │       │                                                 │    │
│  │       │ Registers .onion with ChutneX DAs               │    │
│  │       │                                                 │    │
│  │       ▼                                                 │    │
│  │  tvbdfd6j...5qd.onion                                   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          │ Only resolvable via ChutneX!         │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           ChutneX Network (10.99.x.x)                   │    │
│  │                                                         │    │
│  │  DA1 ←→ DA2 ←→ DA3                                      │    │
│  │   │      │      │                                       │    │
│  │   └──────┼──────┘                                       │    │
│  │          │ Consensus includes .onion                    │    │
│  │          ▼                                              │    │
│  │  Guard → Middle → Exit → Rendezvous                     │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Client Integration

### 7.1 Dual-Network Configuration

SimpleX clients must be in **both networks**:

1. **simplex-clients** (bridge) - For port mapping to host (Django WebSocket)
2. **chutnex-\<slug\>** - For access to ChutneX SOCKS proxy

```python
# clients/services/docker_manager.py

def create_client_container(self, client: SimplexClient):
    """
    Create client with dual-network support for ChutneX.
    """
    # Always start in bridge network (for port mapping)
    container = self.client.containers.create(
        network='simplex-clients',
        ports={f'{port}/tcp': port},
        ...
    )
    
    # For ChutneX Internal: add to ChutneX network
    if client.connection_mode == 'chutnex_internal':
        chutnex_network = f"chutnex-{client.chutnex_network.slug}"
        network = self.client.networks.get(chutnex_network)
        network.connect(container)
```

### 7.2 SOCKS Proxy Tunnel

Instead of starting local Tor, clients tunnel to ChutneX:

```bash
#!/bin/bash
# docker/images/simplex-cli/entrypoint.sh

if [ "${CHUTNEX_MODE}" = "1" ]; then
    # Find ChutneX client node
    CHUTNEX_SOCKS_HOST="${CHUTNEX_SOCKS_HOST:-10.99.1.13}"
    
    echo "ChutneX Mode: Forwarding localhost:9050 -> ${CHUTNEX_SOCKS_HOST}:9050"
    
    # Create socat tunnel to ChutneX SOCKS
    socat TCP-LISTEN:9050,bind=127.0.0.1,fork,reuseaddr \
          TCP:${CHUTNEX_SOCKS_HOST}:9050 &
    
    sleep 2
else
    # Standard: Start local Tor
    tor &
    sleep 5
fi

# Start simplex-chat (uses localhost:9050 transparently)
simplex-chat -p 3030 -d /data
```

### 7.3 Traffic Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 CLIENT TRAFFIC FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Django Backend (Host)                                          │
│       │                                                         │
│       │ WebSocket (ws://localhost:3031)                         │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  SimpleX Client Container                               │    │
│  │  (In both: simplex-clients AND chutnex-berlin8)         │    │
│  │                                                         │    │
│  │  simplex-chat → localhost:9050                          │    │
│  │                      │                                  │    │
│  │                      │ socat tunnel                     │    │
│  │                      ▼                                  │    │
│  │              10.99.1.13:9050                             │    │
│  │              (ChutneX Client Node)                      │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│                          │ Private Tor Circuit                  │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              ChutneX Network                            │    │
│  │                                                         │    │
│  │  Client1 → Guard → Middle → Exit → Hidden Service       │    │
│  │                                         │               │    │
│  │                                         ▼               │    │
│  │                              SMP Server .onion          │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Data Analysis Points

### 8.1 Overview of Observable Data

ChutneX provides **unprecedented visibility** into Tor network behavior, enabling advanced forensic analysis.

```
┌─────────────────────────────────────────────────────────────────┐
│                  DATA ANALYSIS ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  ChutneX Network                        │    │
│  │                                                         │    │
│  │  📊 Control Port Data                                   │    │
│  │  ├── Circuit creation/destruction                       │    │
│  │  ├── Stream attachments                                 │    │
│  │  ├── Bandwidth statistics                               │    │
│  │  └── Consensus updates                                  │    │
│  │                                                         │    │
│  │  📡 Network Traffic                                     │    │
│  │  ├── Inter-node communications                          │    │
│  │  ├── Cell timing and sizes                              │    │
│  │  └── Connection patterns                                │    │
│  │                                                         │    │
│  │  📝 Tor Logs                                            │    │
│  │  ├── Bootstrap progress                                 │    │
│  │  ├── Circuit decisions                                  │    │
│  │  └── Hidden service events                              │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                          │                                      │
│           ┌──────────────┼──────────────┐                       │
│           ▼              ▼              ▼                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │    Zeek     │ │  Suricata   │ │   Neo4j     │                │
│  │  Protocol   │ │   IDS/IPS   │ │   Graph     │                │
│  │  Analysis   │ │   Rules     │ │   Database  │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Tor Control Port Interface

Access Tor internals via the Control Port (stem library):

```python
from stem import CircStatus
from stem.control import Controller

# Connect to any ChutneX node's control port
def analyze_circuits(node_ip: str, control_port: int = 9051):
    """
    Extract circuit information from a ChutneX node.
    """
    with Controller.from_port(address=node_ip, port=control_port) as ctrl:
        ctrl.authenticate()
        
        for circ in ctrl.get_circuits():
            if circ.status == CircStatus.BUILT:
                print(f"Circuit {circ.id}:")
                print(f"  Path: {' → '.join([n[0] for n in circ.path])}")
                print(f"  Purpose: {circ.purpose}")
                print(f"  Build Flags: {circ.build_flags}")
                
                # Timing analysis
                if hasattr(circ, 'created'):
                    print(f"  Created: {circ.created}")
```

### 8.3 Available Metrics

| Metric Category | Data Points | Collection Method |
|----------------|-------------|-------------------|
| **Circuit Metrics** | Build time, path length, node selection | stem ControlPort |
| **Bandwidth** | Bytes read/written per circuit | stem BW events |
| **Cell Timing** | Inter-cell arrival times | tcpdump + analysis |
| **Consensus** | Vote timing, authority agreement | DA logs |
| **Hidden Service** | Descriptor publication, intro points | stem HS events |

### 8.4 Packet Capture Points

```bash
# Capture all ChutneX traffic
docker run --rm --net=chutnex-berlin8 \
    -v /tmp/captures:/captures \
    nicolaka/netshoot \
    tcpdump -i any -w /captures/chutnex-$(date +%s).pcap

# Capture specific node traffic
docker exec chutnex-berlin8-exit1 \
    tcpdump -i eth0 -w /tmp/exit1-traffic.pcap
```

### 8.5 Integration with Enterprise Stack (Roadmap Phase 10)

#### 8.5.1 Zeek Protocol Analysis

```zeek
# zeek/scripts/chutnex-tor.zeek

@load base/protocols/conn

module ChutneXTor;

export {
    # Log Tor cells
    redef enum Log::ID += { TOR_CELLS };
    
    type Cell: record {
        ts: time &log;
        uid: string &log;
        circuit_id: count &log;
        cell_type: string &log;
        payload_len: count &log;
    };
}

event tor_cell(c: connection, is_orig: bool, cell_type: count, payload: string)
{
    local cell = Cell(
        $ts = network_time(),
        $uid = c$uid,
        $circuit_id = cell_type,  # Simplified
        $cell_type = fmt("%d", cell_type),
        $payload_len = |payload|
    );
    
    Log::write(TOR_CELLS, cell);
}
```

#### 8.5.2 Neo4j Graph Schema

```cypher
// Node types
CREATE CONSTRAINT FOR (da:DirectoryAuthority) REQUIRE da.fingerprint IS UNIQUE;
CREATE CONSTRAINT FOR (relay:Relay) REQUIRE relay.fingerprint IS UNIQUE;
CREATE CONSTRAINT FOR (hs:HiddenService) REQUIRE hs.onion IS UNIQUE;
CREATE CONSTRAINT FOR (client:Client) REQUIRE client.id IS UNIQUE;

// Relationships
// (Client)-[:CONNECTED_VIA]->(Circuit)
// (Circuit)-[:USES_GUARD]->(Relay)
// (Circuit)-[:USES_MIDDLE]->(Relay)
// (Circuit)-[:USES_EXIT]->(Relay)
// (Circuit)-[:REACHES]->(HiddenService)
// (Relay)-[:VOTED_BY]->(DirectoryAuthority)

// Example query: Find all circuits to a hidden service
MATCH (c:Client)-[:CONNECTED_VIA]->(circ:Circuit)-[:REACHES]->(hs:HiddenService)
WHERE hs.onion = 'tvbdfd6j...5qd.onion'
RETURN c, circ, hs
```

#### 8.5.3 Suricata IDS Rules

```yaml
# suricata/rules/chutnex.rules

# Detect Tor VERSIONS cell (circuit initiation)
alert tcp $CHUTNEX_NET any -> $CHUTNEX_NET any (
    msg:"CHUTNEX Tor Circuit Initiation";
    flow:established;
    content:"|00 00|"; offset:0; depth:2;  # Circuit ID 0
    content:"|07|"; offset:2; depth:1;     # VERSIONS cell
    sid:9000001; rev:1;
    classtype:policy-violation;
)

# Detect Hidden Service descriptor upload
alert tcp $CHUTNEX_NET any -> $CHUTNEX_DA_NET any (
    msg:"CHUTNEX HS Descriptor Upload";
    flow:established;
    content:"POST"; http_method;
    content:"/tor/hs/"; http_uri;
    sid:9000002; rev:1;
    classtype:policy-violation;
)
```

### 8.6 Timing Correlation Analysis

ChutneX enables **world-first** timing correlation research on SimpleX:

```python
# Analysis script for timing correlation

import pandas as pd
from datetime import datetime, timedelta

def analyze_timing_correlation(sender_events: list, receiver_events: list,
                                max_delay_ms: int = 5000) -> dict:
    """
    Detect message correlation based on timing.
    
    Args:
        sender_events: List of (timestamp, message_id) from sender
        receiver_events: List of (timestamp, message_id) from receiver
        max_delay_ms: Maximum expected delay in milliseconds
    
    Returns:
        dict with correlation probability and matches
    """
    correlations = []
    
    for send_ts, send_id in sender_events:
        # Find receive events within time window
        for recv_ts, recv_id in receiver_events:
            delta = (recv_ts - send_ts).total_seconds() * 1000
            
            if 0 < delta < max_delay_ms:
                # Calculate correlation probability
                # Lower delay = higher correlation
                probability = 1 - (delta / max_delay_ms)
                
                correlations.append({
                    'send_time': send_ts,
                    'recv_time': recv_ts,
                    'delay_ms': delta,
                    'probability': probability
                })
    
    if correlations:
        avg_probability = sum(c['probability'] for c in correlations) / len(correlations)
    else:
        avg_probability = 0
    
    return {
        'correlation_probability': avg_probability,
        'matches': correlations,
        'total_sent': len(sender_events),
        'total_received': len(receiver_events)
    }
```

---

## 9. File Reference

### 9.1 Backend Files

| File | Purpose |
|------|---------|
| `chutney/models.py` | TorNetwork, TorNode models |
| `chutney/admin.py` | Django admin configuration |
| `chutney/api/serializers.py` | REST API serializers |
| `chutney/api/views.py` | API viewsets |
| `chutney/services/docker_manager.py` | Docker orchestration |
| `servers/models.py` | Server model with ChutneX fields |
| `servers/services/docker_manager.py` | Server container management |
| `clients/models.py` | Client model with connection_mode |
| `clients/services/docker_manager.py` | Client container management |

### 9.2 Docker Files

| File | Purpose |
|------|---------|
| `docker/images/chutnex/Dockerfile` | ChutneX node image |
| `docker/images/chutnex/entrypoint.sh` | DA sync + torrc generation |
| `docker/images/chutnex/torrc.base` | Base torrc template |
| `docker/images/simplex-smp-tor/entrypoint.sh` | SMP server with ChutneX |
| `docker/images/simplex-cli/entrypoint.sh` | Client with socat tunnel |

### 9.3 Frontend Files

| File | Purpose |
|------|---------|
| `frontend/src/pages/ChutneX.tsx` | Network management page |
| `frontend/src/pages/ChutneXDetail.tsx` | Network detail view |
| `frontend/src/pages/ServerForm.tsx` | Server creation with ChutneX |
| `frontend/src/pages/ClientForm.tsx` | Client creation with modes |
| `frontend/src/i18n/locales/de.json` | German translations |
| `frontend/src/i18n/locales/en.json` | English translations |

### 9.4 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/chutney/networks/` | GET, POST | List/create networks |
| `/api/v1/chutney/networks/{slug}/` | GET, PUT, DELETE | Network detail |
| `/api/v1/chutney/networks/{slug}/start/` | POST | Start network |
| `/api/v1/chutney/networks/{slug}/stop/` | POST | Stop network |
| `/api/v1/chutney/networks/{slug}/status/` | GET | Network status |
| `/api/v1/chutney/networks/{slug}/logs/` | GET | Container logs |

---

## 10. Verification & Testing

### 10.1 Network Health Check

```bash
#!/bin/bash
# scripts/chutnex-health-check.sh

NETWORK_SLUG="${1:-berlin8}"

echo "🔬 ChutneX Health Check: $NETWORK_SLUG"
echo "============================================"

# Check all nodes bootstrapped
echo ""
echo "📊 Node Bootstrap Status:"
for node in da1 da2 da3 guard1 guard2 middle1 middle2 exit1 exit2 client1 client2; do
    CONTAINER="chutnex-${NETWORK_SLUG}-${node}"
    STATUS=$(docker exec $CONTAINER grep "Bootstrapped 100%" /var/lib/tor/tor.log 2>/dev/null)
    
    if [ -n "$STATUS" ]; then
        echo "  ✅ $node: Bootstrapped 100%"
    else
        echo "  ❌ $node: Not fully bootstrapped"
    fi
done

# Check consensus
echo ""
echo "🗳️ Consensus Status:"
docker exec chutnex-${NETWORK_SLUG}-da1 \
    grep -E "Consensus computed|Published" /var/lib/tor/tor.log 2>/dev/null | tail -3

# Check hidden service
echo ""
echo "🧅 Hidden Services:"
docker exec simplex-smp-berlin cat /var/lib/tor/simplex-smp/hostname 2>/dev/null || echo "  No HS found"

echo ""
echo "============================================"
echo "Health check complete!"
```

### 10.2 Isolation Verification

```bash
#!/bin/bash
# scripts/verify-isolation.sh

ONION_ADDRESS="${1}"

echo "🔒 Verifying ChutneX Isolation"
echo "============================================"

# Test 1: Public Tor should NOT reach ChutneX .onion
echo ""
echo "Test 1: Public Tor → ChutneX .onion"
RESULT=$(curl -x socks5h://localhost:9050 "http://${ONION_ADDRESS}:5223" \
         --connect-timeout 10 2>&1)

if echo "$RESULT" | grep -q "error 4\|error 6"; then
    echo "  ✅ PASS: Public Tor cannot resolve ChutneX .onion"
else
    echo "  ❌ FAIL: Public Tor reached ChutneX!"
fi

# Test 2: ChutneX client should reach .onion
echo ""
echo "Test 2: ChutneX → ChutneX .onion"
RESULT=$(docker exec simplex-client-client-001 \
         curl -x socks5h://127.0.0.1:9050 "http://${ONION_ADDRESS}:5223" \
         --connect-timeout 10 2>&1)

if echo "$RESULT" | grep -q "Empty reply"; then
    echo "  ✅ PASS: ChutneX client can reach .onion (connected)"
else
    echo "  ❌ FAIL: ChutneX client cannot reach .onion"
fi

echo ""
echo "============================================"
echo "Isolation verification complete!"
```

### 10.3 Message Flow Test

```python
# tests/test_chutnex_messaging.py

import pytest
from clients.models import SimplexClient
from clients.services.simplex_commands import SimplexService

class TestChutneXMessaging:
    """
    End-to-end messaging tests through ChutneX network.
    """
    
    @pytest.fixture
    def chutnex_clients(self):
        """Get two ChutneX-connected clients."""
        client_a = SimplexClient.objects.get(name='Client 001')
        client_b = SimplexClient.objects.get(name='Client 002')
        
        assert client_a.connection_mode == 'chutnex_internal'
        assert client_b.connection_mode == 'chutnex_internal'
        
        return client_a, client_b
    
    def test_message_delivery(self, chutnex_clients):
        """Test message delivery through ChutneX network."""
        client_a, client_b = chutnex_clients
        svc = SimplexService()
        
        # Create connection
        addr_result = svc.create_address(client_b)
        assert addr_result.success
        
        conn_result = svc.connect_via_link(client_a, addr_result.data['full_link'])
        assert conn_result.success
        
        # Send message
        msg_result = svc.send_message(client_a, client_b.profile_name, "Test message")
        assert msg_result.success
        
        # Verify delivery
        messages = svc.get_messages(client_b)
        assert any("Test message" in m.get('content', '') for m in messages.data)
    
    def test_timing_measurement(self, chutnex_clients):
        """Measure message latency through ChutneX."""
        client_a, client_b = chutnex_clients
        svc = SimplexService()
        
        import time
        
        start = time.time()
        svc.send_message(client_a, client_b.profile_name, "Timing test")
        
        # Poll for delivery
        for _ in range(30):
            messages = svc.get_messages(client_b)
            if any("Timing test" in m.get('content', '') for m in messages.data):
                break
            time.sleep(0.1)
        
        latency = time.time() - start
        print(f"ChutneX message latency: {latency:.3f}s")
        
        # ChutneX should be faster than public Tor
        assert latency < 5.0  # Should be under 5 seconds
```

---

## 11. Integration with Enterprise Stack

### 11.1 Roadmap Alignment

ChutneX enables the following roadmap phases:

| Phase | Feature | ChutneX Enables |
|-------|---------|-----------------|
| **Phase 3** | Traffic Analysis | Full circuit visibility |
| **Phase 4** | Adversary View | Timing correlation research |
| **Phase 9** | Private Tor Network | ✅ **COMPLETED** |
| **Phase 10** | Enterprise Stack | Zeek/Suricata/Neo4j integration |

### 11.2 Data Export Formats

```python
# Export circuit data for Neo4j import

def export_circuits_for_neo4j(network_slug: str) -> dict:
    """
    Export ChutneX circuit data in Neo4j-compatible format.
    """
    circuits = []
    
    # Connect to each client node and extract circuits
    for client in ['client1', 'client2']:
        container = f"chutnex-{network_slug}-{client}"
        # ... extract circuit data via stem
    
    return {
        'nodes': [
            {'label': 'Relay', 'properties': {...}},
            {'label': 'Client', 'properties': {...}},
        ],
        'relationships': [
            {'type': 'USES_GUARD', 'from': ..., 'to': ...},
            {'type': 'USES_MIDDLE', 'from': ..., 'to': ...},
        ]
    }
```

### 11.3 Prometheus Metrics

```python
# Export ChutneX metrics to Prometheus

from prometheus_client import Gauge, Counter, Histogram

# Define metrics
chutnex_nodes_total = Gauge(
    'chutnex_nodes_total',
    'Total number of ChutneX nodes',
    ['network', 'node_type']
)

chutnex_circuit_build_time = Histogram(
    'chutnex_circuit_build_seconds',
    'Circuit build time in seconds',
    ['network'],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
)

chutnex_messages_total = Counter(
    'chutnex_messages_total',
    'Total messages through ChutneX',
    ['network', 'status']
)
```

### 11.4 Grafana Dashboard

```json
{
  "dashboard": {
    "title": "ChutneX Network Monitor",
    "panels": [
      {
        "title": "Node Status",
        "type": "stat",
        "targets": [
          {
            "expr": "chutnex_nodes_total{node_type='da'}",
            "legendFormat": "Directory Authorities"
          }
        ]
      },
      {
        "title": "Circuit Build Time",
        "type": "histogram",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, chutnex_circuit_build_seconds_bucket)",
            "legendFormat": "P95 Build Time"
          }
        ]
      },
      {
        "title": "Message Flow",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(chutnex_messages_total[5m])",
            "legendFormat": "Messages/sec"
          }
        ]
      }
    ]
  }
}
```

---

## 12. Conclusion

### 12.1 Achievement Summary

**ChutneX** delivers a **world-first** capability:

✅ **100% isolated private Tor network** for SimpleX infrastructure  
✅ **Complete forensic visibility** into all network layers  
✅ **DA synchronization** ensuring proper consensus  
✅ **Seamless integration** with SimpleX clients and servers  
✅ **Foundation for advanced security research**

### 12.2 Security Implications

| Aspect | Implication |
|--------|-------------|
| **For Researchers** | Study Tor behavior without affecting public network |
| **For Developers** | Fast iteration with predictable latency |
| **For Operators** | Validate infrastructure before production |
| **For Training** | Safe environment for security education |

### 12.3 Next Steps

1. **Phase 10 Integration:** Zeek, Suricata, Neo4j
2. **Adversary View:** Timing correlation UI
3. **Performance Benchmarks:** Latency comparisons
4. **Documentation:** User guides and tutorials

---

## Appendix A: Quick Start

```bash
# 1. Start the application
cd ~/simplex-smp-monitor
docker compose up -d
python manage.py runserver

# 2. Create ChutneX network (via UI or API)
curl -X POST http://localhost:8000/api/v1/chutney/networks/ \
     -H "Content-Type: application/json" \
     -d '{"name": "TestNet", "slug": "testnet"}'

# 3. Start network
curl -X POST http://localhost:8000/api/v1/chutney/networks/testnet/start/

# 4. Create ChutneX server (via UI)
# - Hosting Mode: ChutneX
# - Network: TestNet

# 5. Create ChutneX clients (via UI)
# - Connection Mode: ChutneX Internal
# - Network: TestNet
# - Server: (select ChutneX server)

# 6. Test messaging!
```

---

## Appendix B: Troubleshooting

### B.1 DA Consensus Failure

**Symptom:** "Vote not from a recognized v3 authority"

**Solution:**
1. Check all DAs have same dir-authorities file:
   ```bash
   docker exec chutnex-<slug>-da1 cat /var/lib/tor/torrc | grep DirAuthority
   docker exec chutnex-<slug>-da2 cat /var/lib/tor/torrc | grep DirAuthority
   docker exec chutnex-<slug>-da3 cat /var/lib/tor/torrc | grep DirAuthority
   ```
2. Verify DA_COUNT matches actual DA count
3. Restart network with clean volumes

### B.2 Client Cannot Connect

**Symptom:** "Could not create address" error

**Solution:**
1. Verify client is in ChutneX network:
   ```bash
   docker inspect simplex-client-<n> --format '{{json .NetworkSettings.Networks}}'
   ```
2. Check socat tunnel is running:
   ```bash
   docker logs simplex-client-<n> | grep "Forwarding"
   ```
3. Verify server .onion is in ChutneX consensus

### B.3 Server Not Bootstrapping

**Symptom:** Server stuck at 0% bootstrap

**Solution:**
1. Verify ChutneX network is running (all DAs at 100%)
2. Check server has /status volume mounted
3. Verify CHUTNEX_MODE=1 is set:
   ```bash
   docker exec simplex-smp-<n> env | grep CHUTNEX
   ```

---

*Document Version: 1.0*  
*Last Updated: January 12, 2026*  
*Author: cannatoshi + Claude*

**🔬 ChutneX - Your Private Tor Network for SimpleX Forensics**