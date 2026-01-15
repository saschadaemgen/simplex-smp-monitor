# ChutneX User Guide

> **Private Tor Network for SimpleX Forensics**  
> Version: 0.1.12-alpha | Last Updated: 2026-01-15

---

## Table of Contents

1. [What is ChutneX?](#1-what-is-chutnex)
2. [Quick Start](#2-quick-start)
3. [Network Components](#3-network-components)
4. [Creating a Network](#4-creating-a-network)
5. [Connecting Servers](#5-connecting-servers)
6. [Connecting Clients](#6-connecting-clients)
7. [Analytics Dashboard](#7-analytics-dashboard)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. What is ChutneX?

ChutneX is a **Docker-based private Tor network** that creates an isolated environment where:

- **Directory Authorities (DAs)** maintain network consensus
- **Guard, Middle, and Exit relays** form the onion routing paths
- **Client nodes** provide SOCKS5 proxies for application traffic
- **Hidden Services** are only resolvable within this private network

### 1.1 Key Achievement
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

### 1.2 Use Cases

| Use Case | Description |
|----------|-------------|
| **Forensic Analysis** | Complete visibility into Tor circuit behavior |
| **Security Research** | Test timing attacks in controlled environment |
| **Development Testing** | Fast iteration without public Tor latency |
| **Training** | Educate on Tor internals with full observability |
| **Penetration Testing** | Isolated environment for security assessments |

---

## 2. Quick Start

### 2.1 Prerequisites

- Docker & Docker Compose installed
- SimpleX SMP Monitor running
- At least 4GB RAM available

### 2.2 Start Application
```bash
cd ~/simplex-smp-monitor
docker compose up -d
python manage.py runserver
```

### 2.3 Create Network via UI or API
```bash
# Create network
curl -X POST http://localhost:8000/api/v1/chutney/networks/ \
     -H "Content-Type: application/json" \
     -d '{"name": "TestNet", "slug": "testnet"}'

# Start network
curl -X POST http://localhost:8000/api/v1/chutney/networks/testnet/start/
```

### 2.4 Create Server and Clients

1. **Create ChutneX server** (via UI)
   - Hosting Mode: ChutneX
   - Network: TestNet

2. **Create ChutneX clients** (via UI)
   - Connection Mode: ChutneX Internal
   - Network: TestNet
   - Server: (select ChutneX server)

3. **Test messaging!**

---

## 3. Network Components

### 3.1 Node Types

| Node Type | Count | Function | Ports |
|-----------|-------|----------|-------|
| **Directory Authority (DA)** | 3 | Consensus voting, network directory | 80 (Dir), 9001 (OR) |
| **Guard Relay** | 2 | Entry point for circuits | 9001 (OR) |
| **Middle Relay** | 2 | Intermediate routing | 9001 (OR) |
| **Exit Relay** | 2 | Exit point for traffic | 9001 (OR) |
| **Client Node** | 2 | SOCKS5 proxy provider | 9050 (SOCKS) |

### 3.2 Network Architecture
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

### 3.3 Default IP Assignment
```
chutnex-<slug> Network (10.99.0.0/16)
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
    ├── simplex-smp-<name>: 10.99.0.2 (Hidden Service)
    └── simplex-client-*:   10.99.0.3+ (via socat tunnel)
```

---

## 4. Creating a Network

### 4.1 Via Web UI

1. Navigate to **ChutneX** in top menu
2. Click **New Network**
3. Enter name and slug
4. Click **Create**
5. Click **Start Network**

### 4.2 Via API
```bash
# Create
curl -X POST http://localhost:8000/api/v1/chutney/networks/ \
     -H "Content-Type: application/json" \
     -d '{"name": "Research Net", "slug": "research-net"}'

# Start
curl -X POST http://localhost:8000/api/v1/chutney/networks/research-net/start/

# Check status
curl http://localhost:8000/api/v1/chutney/networks/research-net/status/
```

---

## 5. Connecting Servers

### 5.1 Server Hosting Modes

| Mode | Description |
|------|-------------|
| **Standard** | Direct connection, no Tor |
| **Public Tor** | Hidden Service on public Tor network |
| **ChutneX** | Hidden Service in private ChutneX network |

### 5.2 Create ChutneX Server

1. Navigate to **Servers** → **New Server**
2. Select **Hosting Mode**: ChutneX
3. Select **Network**: (your ChutneX network)
4. Click **Create**

The server will automatically:
- Join the ChutneX Docker network
- Configure Tor with ChutneX DAs
- Generate a .onion address
- Start the SMP server

---

## 6. Connecting Clients

### 6.1 Client Connection Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **ChutneX Internal** | Client runs inside ChutneX network | Full isolation testing |
| **ChutneX External** | Client connects via SOCKS port | Testing from outside |
| **Standard Tor** | Uses public Tor network | Production mode |

### 6.2 Create ChutneX Client

1. Navigate to **Clients** → **New Client**
2. Select **Connection Mode**: ChutneX Internal
3. Select **Network**: (your ChutneX network)
4. Select **Server**: (your ChutneX server)
5. Click **Create**

---

## 7. Analytics Dashboard

### 7.1 Access

Navigate to **ChutneX** → Select Network → **Analytics**

### 7.2 Available Sections

| Section | Description |
|---------|-------------|
| **Overview** | Network stats, node counts, consensus status |
| **Nodes** | Grid view of all nodes with bandwidth |
| **Circuits** | Active circuits with path visualization |
| **Traffic** | Bandwidth charts and statistics |
| **Forensics** | Timing correlation and analysis (planned) |

---

## 8. Troubleshooting

### 8.1 DA Consensus Failure

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

### 8.2 Client Cannot Connect

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

### 8.3 Server Not Bootstrapping

**Symptom:** Server stuck at 0% bootstrap

**Solution:**
1. Verify ChutneX network is running (all DAs at 100%)
2. Check server has /status volume mounted
3. Verify CHUTNEX_MODE=1 is set:
```bash
   docker exec simplex-smp-<n> env | grep CHUTNEX
```

### 8.4 Network Health Check
```bash
# Check all nodes bootstrapped
NETWORK_SLUG="your-slug"
for node in da1 da2 da3 guard1 guard2 middle1 middle2 exit1 exit2 client1 client2; do
    CONTAINER="chutnex-${NETWORK_SLUG}-${node}"
    STATUS=$(docker exec $CONTAINER grep "Bootstrapped 100%" /var/lib/tor/tor.log 2>/dev/null)
    if [ -n "$STATUS" ]; then
        echo "✅ $node: OK"
    else
        echo "❌ $node: Not bootstrapped"
    fi
done
```

---

*For technical details, see [02_DEVELOPER_GUIDE.md](./02_DEVELOPER_GUIDE.md)*
