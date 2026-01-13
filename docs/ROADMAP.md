# SimpleX SMP Monitor - Roadmap v4.0

> **Last Updated:** 2026-01-12  
> **Current Version:** v0.1.12-alpha ("The Forensic Lab Release")

---

## Executive Summary

**SimpleX SMP Monitor** is evolving from a server monitoring tool into the world's first comprehensive **forensic analysis platform** for SimpleX messaging infrastructure. This roadmap outlines the path from current capabilities to a full enterprise-grade security analysis suite.

### Mission Statement

> *"Enable infrastructure operators to see what adversaries see—and fix vulnerabilities before they're exploited."*

### Target Audience

| Audience | Primary Use Case |
|----------|-----------------|
| **Journalists & Whistleblowers** | Validate secure communication infrastructure |
| **Security Researchers** | Timing correlation analysis, traffic pattern research |
| **NGOs & Human Rights Organizations** | Infrastructure security audits |
| **Privacy Advocates** | Prove (or disprove) metadata protection claims |
| **Enterprise Security Teams** | Red team exercises, penetration testing |

---

## Competitive Analysis

| Capability | Other Tools | SimpleX SMP Monitor |
|------------|-------------|---------------------|
| Server Health Checks | ✅ Basic | ✅ Advanced with Tor |
| Message Delivery Testing | ❌ | ✅ Full E2E with Receipts |
| Private Tor Network Lab | ❌ | ✅ **ChutneX** (World's First) |
| Timing Correlation Analysis | ❌ | ✅ Planned (World's First) |
| Adversary View Simulation | ❌ | ✅ Planned (World's First) |
| Traffic Pattern Detection | ❌ | ✅ Built-in |
| Docker One-Click Deployment | ❌ | ✅ Complete |
| Real-Time Container Management | ❌ | ✅ Docker Manager |
| Deep Packet Inspection | ❌ | ✅ Zeek + Suricata (Planned) |
| Graph Visualization | ❌ | ✅ Neo4j + Cytoscape (Planned) |

---

## Phase Status Overview

| Phase | Name | Version | Status |
|-------|------|---------|--------|
| 1 | Foundation | v0.1.0-v0.1.7 | ✅ Complete |
| 2 | React Revolution | v0.1.8-v0.1.9 | ✅ Complete |
| 3 | Docker Ecosystem | v0.1.10-v0.1.11 | ✅ Complete |
| 4 | ChutneX Private Tor Lab | v0.1.12 | ✅ Complete |
| 5 | Docker Manager & Cache Forensics | v0.1.12 | ✅ Complete |
| 6 | Traffic Analysis Dashboard | v0.2.x | 📋 Next |
| 7 | Adversary View | v0.3.x | 📋 Planned |
| 8 | Advanced Test Panel | v0.3.5 | 📋 Planned |
| 9 | Enterprise Monitoring | v0.4.x | 📋 Planned |
| 10 | Enterprise Security Stack | v0.5.x | 📋 Planned |
| 11 | Multi-Network Support | v1.x | 📋 Future |

---

## Completed Phases

### Phase 1: Foundation (v0.1.0 - v0.1.7) ✅

**Timeline:** December 2025

The foundational phase established core infrastructure for server monitoring and client management.

#### Deliverables

| Component | Description | Status |
|-----------|-------------|--------|
| Django Backend | Async-capable backend with REST API | ✅ |
| Server Management | CRUD operations with Tor/.onion support | ✅ |
| CLI Client Management | Docker-based SimpleX clients | ✅ |
| WebSocket Commands | Real-time client communication | ✅ |
| Delivery Receipts | Message status tracking (⏳→✓→✓✓) | ✅ |
| Event Infrastructure | Redis + SimplexEventBridge | ✅ |
| i18n System | German/English with 25 languages prepared | ✅ |

---

### Phase 2: React Revolution (v0.1.8 - v0.1.9) ✅

**Timeline:** December 2025

Complete frontend transformation from Django Templates to modern React SPA.

#### Architecture Transformation

**Before (v0.1.7):**
- Django Templates + HTMX + Alpine.js
- Full page reloads
- Limited interactivity

**After (v0.1.9):**
- React 18 + TypeScript + Tailwind CSS
- Single Page Application
- Real-time updates via WebSocket

#### Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 |
| Language | TypeScript 5.x |
| Build Tool | Vite 5.x |
| Styling | Tailwind CSS 3.x |
| Routing | React Router v6 |
| i18n | react-i18next |
| Icons | Lucide React |

---

### Phase 3: Docker Ecosystem (v0.1.10 - v0.1.11) ✅

**Timeline:** January 2026

One-click deployment with pre-built SimpleX server images.

#### Deliverables

| Component | Description | Status |
|-----------|-------------|--------|
| Docker Compose Stack | Complete application deployment | ✅ |
| Three Install Methods | Clone, wget, GHCR | ✅ |
| SimpleX Server Images | SMP, XFTP, NTF (v6.4.4.1) | ✅ |
| Production Compose | Standalone deployment file | ✅ |
| Security Hardening | 25 vulnerabilities fixed | ✅ |
| Community Health | 10 GitHub community files | ✅ |

#### Docker Stack Components

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| nginx | simplex-smp-monitor-nginx | 8080 | Reverse proxy |
| app | simplex-smp-monitor-app | 8000 | Django + React |
| postgres | postgres:15-alpine | 5432 | Database |
| redis | redis:7-alpine | 6379 | Cache + Channels |
| influxdb | influxdb:2.7-alpine | 8086 | Metrics |
| grafana | grafana/grafana | 3002 | Dashboards |
| tor | dperson/torproxy | 9050 | SOCKS proxy |

---

### Phase 4: ChutneX Private Tor Lab (v0.1.12) ✅

**Timeline:** January 2026

**The flagship feature** - A fully isolated private Tor network for forensic analysis.

#### What is ChutneX?

ChutneX is a Docker-based implementation of private Tor networks, enabling:

- **100% Network Isolation** - Traffic never leaves your environment
- **Full Observability** - Every packet, every hop is yours to analyze
- **Reproducible Testing** - Same network, same conditions, every time
- **Forensic Analysis** - Deep inspection without external dependencies

#### Network Topology

| Node Type | Count | Purpose |
|-----------|-------|---------|
| Directory Authority | 3 | Consensus voting |
| Guard Relay | 2 | Entry points |
| Middle Relay | 2 | Traffic routing |
| Exit Relay | 2 | Exit points |
| Client | 2 | SOCKS proxy access |
| **Total** | **11** | Complete Tor network |

#### Integration Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **ChutneX Internal** | Clients route through private Tor | Traffic analysis |
| **ChutneX Hosting** | Servers run private Hidden Services | Server testing |

#### Verified Isolation
```
Public Tor → ChutneX .onion: Connection timeout ✅
ChutneX Client → ChutneX .onion: Connection success ✅
```

#### Technical Implementation

| Component | File/Location |
|-----------|---------------|
| Node Dockerfiles | `docker/images/chutnex/` |
| DA Synchronization | `entrypoint.sh` with file locking |
| Network Creation | `ChutneXDockerManager` |
| Status Volume | `chutnex-status-{slug}` |
| Network Subnet | `10.99.0.0/16` (Internal=true) |

---

### Phase 5: Docker Manager & Cache Forensics (v0.1.12) ✅

**Timeline:** January 2026

Real-time container management and forensic cache isolation.

#### Docker Manager

Full container lifecycle management directly in the web UI.

| Feature | Description |
|---------|-------------|
| Real-Time Stats | CPU/Memory with 2-sample delta calculation |
| Lifecycle Control | Start, Stop, Restart, Pause, Remove |
| Bulk Operations | Multi-select container actions |
| Log Viewer | Configurable line limits |
| Tor Detection | Special styling for Tor/ChutneX containers |
| Non-Blocking | ThreadPoolExecutor for parallel operations |

#### Technical Details

| Aspect | Implementation |
|--------|----------------|
| Backend | Django app with REST API |
| Stats Collection | 2-sample delta (100ms interval) |
| Parallelization | `ThreadPoolExecutor` |
| Frontend Polling | 5s stats, 15s container list |

#### Musicplayer Cache Forensics Dashboard

Prevents cached media from polluting traffic analysis.

| Feature | Description |
|---------|-------------|
| Cache Analytics | Hit/miss ratios, storage usage |
| Auto-Switch | LOCAL playback when cached |
| Live Updates | Real-time cache status |

---

## Current Development

### Phase 6: Traffic Analysis Dashboard (v0.2.x) 📋

**Target:** February 2026

Deep insights into message flow, timing patterns, and network behavior.

#### Planned Components

| Component | Description | Priority |
|-----------|-------------|----------|
| Live Traffic Monitor | Real-time bytes/sec visualization | High |
| Message Timeline | Per-client message activity dots | High |
| Latency Distribution | Delivery time histogram | High |
| Activity Heatmap | Time-of-day usage patterns | Medium |
| Packet Size Analysis | Size distribution for content inference | Medium |
| Flow Visualization | Client-to-client flow mapping | Medium |

#### Security Relevance

| Metric | What It Reveals |
|--------|-----------------|
| Volume Patterns | Communication frequency |
| Timing Patterns | User activity schedules |
| Packet Sizes | Content type inference |
| Latency Variance | Network fingerprinting |

#### Technology Stack

| Component | Technology |
|-----------|------------|
| Charts | Recharts |
| Real-Time | WebSocket hooks |
| State | Zustand + React Query |
| Data | InfluxDB time-series |

---

### Phase 7: Adversary View (v0.3.x) 📋

**Target:** March 2026

**The revolutionary feature** - Simulate what external observers can see about your communications.

#### Philosophy

> *"You cannot defend against threats you don't understand."*

Traditional security testing verifies encryption. Adversary View reveals **what metadata leaks even when encryption is perfect**.

#### Threat Model Levels

| Level | Adversary | Capabilities | Simulated |
|-------|-----------|--------------|-----------|
| 1 | Local Observer | WiFi operator, home router | ✅ Full |
| 2 | ISP/Network | Traffic volume patterns | ✅ Full |
| 3 | State Actor | Legal access + forensics | ✅ Full |
| 4 | Global Passive | Cross-endpoint correlation | ✅ Partial |

#### Why Level 4 Simulation is Possible

In production: Client A and Client B are different people in different locations.
In our lab: Both endpoints are controlled, enabling global adversary simulation.

#### Planned Features

| Feature | Description |
|---------|-------------|
| Timing Correlation | Detect send/receive patterns across endpoints |
| Pattern Detection | Identify communication relationships |
| Security Scoring | Quantified privacy assessment |
| Recommendations | Actionable mitigation strategies |
| Before/After | Compare security posture changes |

#### Correlation Algorithm

| Input | Analysis | Output |
|-------|----------|--------|
| Send timestamps | Cross-correlation | Confidence % |
| Receive timestamps | Time offset | Relationship probability |
| Packet sizes | Pattern matching | Content inference |

---

## Planned Phases

### Phase 8: Advanced Test Panel (v0.3.5) 📋

**Target:** April 2026

Comprehensive stress testing and reliability validation.

#### Test Types

| Type | Description | Use Case |
|------|-------------|----------|
| Delivery Reliability | Message delivery success rate | Infrastructure validation |
| Latency Benchmark | Round-trip time measurement | Performance tuning |
| Stress Test | High-volume message load | Capacity planning |
| Mesh Connection | Full mesh between all clients | Network topology testing |
| Bulk Operations | Mass client creation/management | Scale testing |

#### Configuration Options

| Parameter | Range | Default |
|-----------|-------|---------|
| Messages per client | 1-10,000 | 100 |
| Interval (ms) | 10-60,000 | 500 |
| Timeout (s) | 5-300 | 30 |
| Parallel clients | 1-100 | 10 |

---

### Phase 9: Enterprise Monitoring (v0.4.x) 📋

**Target:** May 2026

Production-ready monitoring with alerting and multi-user support.

#### Grafana Integration

| Dashboard | Metrics |
|-----------|---------|
| Server Health | Uptime, latency, error rates |
| Message Throughput | Messages/sec, delivery rate |
| Client Performance | Per-client statistics |
| Real-Time Flow | Live message visualization |

#### InfluxDB Time-Series

| Measurement | Retention | Downsampling |
|-------------|-----------|--------------|
| Raw events | 7 days | None |
| Hourly aggregates | 30 days | 1h mean |
| Daily aggregates | 1 year | 24h mean |

#### Alerting

| Alert | Trigger | Action |
|-------|---------|--------|
| Latency Spike | P95 > 2s | Notification |
| Delivery Failure | Rate > 5% | Notification + Log |
| Client Offline | No heartbeat 5min | Notification |
| Anomaly | ML-detected pattern | Review flag |

#### Multi-User Support

| Feature | Description |
|---------|-------------|
| Authentication | Django auth + JWT |
| RBAC | Admin, Operator, Viewer roles |
| Audit Logging | All actions tracked |
| Team Ownership | Per-user/team client ownership |

---

### Phase 10: Enterprise Security Stack (v0.5.x) 📋

**Target:** Q3 2026

**Palantir-grade** security analysis infrastructure with deep packet inspection and graph visualization.

#### Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    ANALYSIS LAYER                           │
│  React Frontend + Cytoscape.js + Recharts + Grafana         │
├─────────────────────────────────────────────────────────────┤
│                    APPLICATION LAYER                        │
│  Django + Channels + Celery + stem (Tor Controller)         │
├─────────────────────────────────────────────────────────────┤
│                    DATA LAYER                               │
│  PostgreSQL + TimescaleDB + Neo4j + Redis + Elasticsearch   │
├─────────────────────────────────────────────────────────────┤
│                    SECURITY LAYER                           │
│  Zeek + Suricata + Arkime + ntopng                          │
├─────────────────────────────────────────────────────────────┤
│                    THREAT INTEL LAYER                       │
│  MISP + OpenCTI + SpiderFoot + TheHive + Cortex             │
└─────────────────────────────────────────────────────────────┘
```

#### Network Traffic Analysis Tools

| Tool | Purpose | Resource | Integration |
|------|---------|----------|-------------|
| **Zeek** | Protocol analysis, 70+ log types | 2-8 GB RAM | broker/WebSocket |
| **Suricata** | IDS/IPS, signature-based detection | 2-4 GB RAM | EVE JSON + Redis |
| **Arkime** | Full packet capture & search | 30+ GB RAM | REST API |
| **ntopng** | Flow analysis, 450+ protocols | 2-4 GB RAM | Python API |

#### Zeek Integration

| Log Type | Content | Use Case |
|----------|---------|----------|
| conn.log | Connection metadata | Flow analysis |
| ssl.log | TLS handshake details | Certificate analysis |
| dns.log | DNS queries | Domain tracking |
| weird.log | Protocol anomalies | Threat detection |
| Custom | SimpleX-specific parsing | Protocol analysis |

#### Suricata Rules

| Category | Description |
|----------|-------------|
| SimpleX Protocol | Custom signatures for SMP/XFTP |
| Tor Detection | Hidden service patterns |
| Anomaly | Behavioral signatures |
| Threat Intel | IoC-based rules |

#### Graph Database (Neo4j)

| Node Type | Properties |
|-----------|------------|
| Client | ID, name, profile, status |
| Server | Address, type, fingerprint |
| Message | Timestamp, size, latency |
| Connection | Contact names, status |

| Relationship | Description |
|--------------|-------------|
| CONNECTED_TO | Client-to-client connections |
| ROUTES_THROUGH | Client-to-server routing |
| SENT/RECEIVED | Message flow |

#### Cypher Query Examples
```cypher
// Find all communication paths between two clients
MATCH path = (a:Client)-[:SENT|RECEIVED*]-(b:Client)
WHERE a.name = 'Alice' AND b.name = 'Bob'
RETURN path

// Identify most active communication pairs
MATCH (a:Client)-[r:SENT]->(b:Client)
RETURN a.name, b.name, count(r) as messages
ORDER BY messages DESC
LIMIT 10

// Detect isolated clients
MATCH (c:Client)
WHERE NOT (c)-[:CONNECTED_TO]-()
RETURN c.name
```

#### Visualization (Cytoscape.js)

| Feature | Description |
|---------|-------------|
| Graph Layout | Force-directed, hierarchical, circular |
| Real-Time | Live updates via WebSocket |
| Filtering | By client, server, time range |
| Analysis | Path finding, centrality, clustering |

#### Threat Intelligence Platform

| Tool | Purpose | Integration |
|------|---------|-------------|
| **MISP** | Threat intelligence sharing | pymisp |
| **OpenCTI** | Cyber threat intelligence platform | pycti |
| **SpiderFoot** | OSINT automation (200+ modules) | CLI |
| **TheHive** | Incident response platform | thehive4py |
| **Cortex** | Observable analyzers (80+) | cortex4py |

#### MISP Integration

| Feature | Description |
|---------|-------------|
| IoC Import | Auto-import threat indicators |
| Event Correlation | Match traffic against known threats |
| Sharing | Contribute findings to community |
| Tagging | Taxonomies for classification |

#### SpiderFoot OSINT

| Module Category | Examples |
|-----------------|----------|
| Network | DNS, WHOIS, IP geolocation |
| Dark Web | Tor, I2P, Pastebin |
| Social | Twitter, LinkedIn, GitHub |
| Threat | VirusTotal, Shodan, Censys |

#### Resource Requirements

| Component | RAM | Storage |
|-----------|-----|---------|
| Elasticsearch | 16-32 GB | 500 GB+ |
| Neo4j | 8-16 GB | 100 GB+ |
| Arkime | 8+ GB | 1 TB+ |
| Zeek + Suricata | 8 GB | 100 GB |
| MISP + OpenCTI | 8-16 GB | 200 GB |
| **Total Minimum** | **64 GB** | **2 TB** |
| **Recommended** | **128 GB** | **4 TB** |

---

### Phase 11: Multi-Network Support (v1.x) 📋

**Target:** 2027

Extend beyond Tor to support alternative overlay networks.

#### Lokinet Support

| Aspect | Tor | Lokinet |
|--------|-----|---------|
| Project | Tor Project | Oxen (Session) |
| Routing | Onion Routing | LLARP |
| Addresses | .onion | .loki |
| Incentive | Voluntary | OXEN blockchain |
| SOCKS Port | 9050 | 1190 |

#### Dual-Stack Servers

Servers accessible via multiple networks:

| Server | Tor | Lokinet | Clearnet |
|--------|-----|---------|----------|
| SMP-001 | ✅ abc.onion | ✅ xyz.loki | ❌ |
| SMP-002 | ✅ def.onion | ❌ | ✅ smp.example.com |

#### Implementation Tasks

| Task | Priority |
|------|----------|
| Lokinet SOCKS research | Medium |
| Server model extension | Medium |
| Network selector UI | Medium |
| Latency comparison | Low |

---

## Technology Stack

### Current Stack (v0.1.12)

| Layer | Technology | Status |
|-------|------------|--------|
| **Frontend** | React 18 + TypeScript + Tailwind | ✅ |
| **Build** | Vite 5.x | ✅ |
| **Backend** | Django 5.x + DRF | ✅ |
| **Real-Time** | Django Channels + Redis | ✅ |
| **Database** | PostgreSQL 15 | ✅ |
| **Metrics** | InfluxDB 2.7 + Grafana | ✅ |
| **Containers** | Docker 24.x + Compose | ✅ |
| **Private Tor** | ChutneX (Custom) | ✅ |

### Planned Additions

| Layer | Technology | Phase |
|-------|------------|-------|
| **State** | Zustand + React Query | 6 |
| **Charts** | Recharts | 6 |
| **Graphs** | Cytoscape.js / Sigma.js | 10 |
| **Tasks** | Celery | 9 |
| **Time-Series** | TimescaleDB | 9 |
| **Graph DB** | Neo4j | 10 |
| **Search** | Elasticsearch | 10 |
| **Logs** | Grafana Loki | 10 |
| **Protocol** | Zeek | 10 |
| **IDS** | Suricata | 10 |
| **PCAP** | Arkime | 10 |
| **Threat Intel** | MISP, OpenCTI | 10 |
| **OSINT** | SpiderFoot | 10 |

---

## Timeline

| Version | Target | Milestone |
|---------|--------|-----------|
| **v0.1.12** | **2026-01-12** | **✅ The Forensic Lab Release** |
| v0.2.0 | 2026-02-15 | Traffic Analysis Dashboard |
| v0.3.0 | 2026-03-15 | Adversary View |
| v0.3.5 | 2026-04-01 | Advanced Test Panel |
| v0.4.0 | 2026-05-01 | Enterprise Monitoring |
| v0.5.0 | 2026-07-01 | Enterprise Security Stack |
| v1.0.0 | 2026-09-01 | Production Ready |
| v1.x | 2027 | Multi-Network Support |

---

## Contributing

### Priority Areas

| Area | Difficulty | Impact | Phase |
|------|------------|--------|-------|
| Traffic Visualization | Hard | Very High | 6 |
| Timing Correlation Algorithm | Hard | Very High | 7 |
| Neo4j Integration | Hard | High | 10 |
| Zeek Custom Scripts | Medium | High | 10 |
| Cytoscape Components | Medium | High | 10 |
| WebSocket React Hooks | Medium | Medium | 6 |
| Documentation | Easy | High | All |
| Test Coverage | Medium | Medium | All |

### Getting Started

1. Read [CONTRIBUTING.md](../CONTRIBUTING.md)
2. Check [GitHub Issues](https://github.com/cannatoshi/simplex-smp-monitor/issues)
3. Join discussions on open PRs
4. Start with "good first issue" labels

---

## Legal Notice

This tool is designed for use on **your own infrastructure** only.

| Use Case | Legal Status |
|----------|--------------|
| Testing own infrastructure | ✅ Legal |
| Operating Tor nodes | ✅ Legal (BGH I ZR 64/17) |
| Private network simulation | ✅ Legal |
| Security tool development | ✅ Legal (BVerfG 2009) |
| Testing third-party systems | ⚠️ Requires authorization |

See [LEGAL.md](../LEGAL.md) for full details.

---

## Project Anthem

*"Neon Uptime v3.0 - Forensic Edition"*

> Zeek writes seventy log types, Suricata guards the gate  
> ChutneX spins a private Tor, where packets circulate  
> Neo4j maps the graph tonight, connections rendered gold  
> Adversary View reveals the truth, what metadata has told  
>
> From Docker labs to enterprise stacks, we're building something new  
> Open source forensic power—SimpleX SMP Monitor breakthrough  

---

<p align="center">
  <b>SimpleX SMP Monitor</b><br>
  <i>See what adversaries see. Fix before they exploit.</i><br><br>
  <sub>Built with 💜 for the SimpleX ecosystem</sub><br>
  <sub>i(N) cod(E) w(E) trus(T)</sub>
</p>
