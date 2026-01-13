# SimpleX SMP Monitor

## Forensic Analysis Platform for SimpleX Messaging Infrastructure

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Version](https://img.shields.io/badge/Version-0.1.12--alpha-blue.svg)](CHANGELOG.md)
[![Python](https://img.shields.io/badge/Python-3.12+-3776ab.svg)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.x-092E20.svg)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![ChutneX](https://img.shields.io/badge/ChutneX-Private%20Tor%20Lab-7D4698.svg)](#chutnex---private-tor-laboratory)
[![Forensics](https://img.shields.io/badge/Forensics-Platform-00CED1.svg)](#about-this-project)
[![Tor](https://img.shields.io/badge/Tor-Supported-7D4698.svg)](https://www.torproject.org/)
[![Status](https://img.shields.io/badge/Status-Alpha-orange.svg)](#status)

A comprehensive forensic analysis platform for self-hosted SimpleX SMP/XFTP infrastructure. Built for security researchers, journalists, NGOs, and privacy advocates who need deep visibility into their private messaging infrastructure.

> **Current Version:** 0.1.12-alpha - "The Forensic Lab Release"  
> **Status:** Active Development  
> **Companion Project:** [SimpleX Private Infrastructure Tutorial](https://github.com/cannatoshi/simplex-smp-xftp-via-tor-on-rpi-hardened)

---

## Important: Hardware Requirements

**This is a forensic analysis platform, not a simple web application.**

Running private Tor networks, multiple SimpleX clients, traffic analysis tools, and graph databases requires substantial hardware resources. Please review the requirements before installation.

| Resource | Minimum | Recommended | Heavy Workloads |
|----------|---------|-------------|-----------------|
| **RAM** | 32 GB | 128 GB | 256 GB |
| **Storage** | 500 GB NVMe | 1 TB NVMe | 3 TB NVMe |
| **CPU** | 8 cores | 16 cores | 32+ cores |
| **Network** | 1 Gbit | 10 Gbit | 10 Gbit |

For detailed resource breakdowns per component, see [docs/DOCKER.md](docs/DOCKER.md#system-requirements).

---

## Dashboard Preview

![Dashboard](screenshots/dashboard.png)

*Real-time infrastructure overview with server statistics, client management, and system diagnostics*

---

## Status

> **Alpha Software** - Core features are functional, but expect ongoing development. Not recommended for production use without thorough testing in your environment.

**What works:**
- Server and client management with Docker orchestration
- ChutneX private Tor network laboratory
- Real-time WebSocket infrastructure with Redis
- Docker Manager for container control
- React SPA frontend with TypeScript
- Tor hidden service support
- Message delivery tracking with receipts

**In active development:**
- Traffic Analysis Dashboard
- Adversary View (Security Audit Mode)
- Enterprise monitoring stack integration

---

## What's New in v0.1.12 - The Forensic Lab Release

This release transforms SimpleX SMP Monitor from a monitoring tool into a forensic analysis platform.

### ChutneX - Private Tor Laboratory

Build complete, isolated Tor networks in seconds. ChutneX enables forensic analysis without touching the public Tor network.

| Capability | Description |
|------------|-------------|
| **11-Node Network** | 3 Directory Authorities, 2 Guards, 2 Middle, 2 Exit, 2 Clients |
| **100% Isolation** | Traffic never leaves your infrastructure |
| **Reproducible** | Same network conditions for every test |
| **Full Observability** | Every packet, every hop is yours to analyze |

For technical details, see [docs/CHUTNEX.md](docs/CHUTNEX.md).

### Docker Manager

Full container lifecycle management directly in the web interface. Monitor CPU and memory usage, start/stop containers, view logs, and manage bulk operations without leaving your browser.

### Documentation Overhaul

- [docs/DEVNOTES.md](docs/DEVNOTES.md) - Implementation details and troubleshooting
- [docs/DOCKER.md](docs/DOCKER.md) - Deployment guide with realistic requirements
- [docs/CHUTNEX.md](docs/CHUTNEX.md) - Complete ChutneX documentation

For the complete changelog, see [CHANGELOG.md](CHANGELOG.md).

---

## About This Project

### Vision

SimpleX SMP Monitor is designed to answer critical questions for infrastructure operators:

- Are my servers reachable through Tor?
- What timing patterns exist in my message traffic?
- Can an adversary correlate my communications?
- What metadata is exposed even when content is encrypted?
- Are messages actually being delivered end-to-end?

### Target Audience

| Audience | Primary Use Case |
|----------|------------------|
| Security Researchers | Traffic analysis, timing correlation, protocol research |
| Journalists | Secure source communication infrastructure validation |
| NGOs & Human Rights Organizations | Infrastructure security audits |
| Privacy Advocates | Metadata exposure analysis |
| Enterprise Security Teams | Red team exercises, penetration testing |

### Platform Architecture

SimpleX SMP Monitor uses Docker to orchestrate a complete testing environment. You can create SMP servers and SimpleX clients through a user-friendly web interface, then assign them to automated tests or use them manually for research.

**Core Components (Implemented):**

| Component | Technology | Purpose |
|-----------|------------|---------|
| Web Interface | React 18 + TypeScript | Dashboard, configuration, monitoring |
| Backend API | Django 5 + DRF | REST API, WebSocket, orchestration |
| Real-Time Layer | Redis + Channels | Live updates, event streaming |
| Private Tor Lab | ChutneX | Isolated Tor network simulation |
| Container Management | Docker SDK | Client and server orchestration |
| Time-Series Storage | InfluxDB | Metrics and historical data |
| Visualization | Grafana | Dashboards and alerting |

**Analysis Components (In Development):**

The following components are planned and will be integrated as development continues:

| Component | Technology | Purpose | Status |
|-----------|------------|---------|--------|
| Traffic Analysis* | Recharts + WebSocket | Live traffic visualization, timing patterns | In Development |
| Adversary View* | Custom algorithms | Timing correlation, metadata exposure analysis | Planned |
| Protocol Analysis* | Zeek | Deep packet inspection, 70+ log types | Planned |
| Intrusion Detection* | Suricata | Signature-based threat detection | Planned |
| Graph Database* | Neo4j | Relationship mapping, communication graphs | Planned |
| Graph Visualization* | Cytoscape.js | Interactive network topology | Planned |
| Threat Intelligence* | MISP, OpenCTI | IoC correlation, threat feeds | Planned |
| OSINT Integration* | SpiderFoot | Automated reconnaissance | Planned |

*Components marked with asterisk are not yet implemented but are part of the active development roadmap. See [docs/ROADMAP.md](docs/ROADMAP.md) for details.*

### Network Simulation

The platform uses Docker networks to simulate different scenarios:

| Network | Purpose |
|---------|---------|
| `simplex-clients` | SimpleX CLI client containers |
| `simplex-servers` | SMP/XFTP server containers |
| `chutnex-{slug}` | Isolated private Tor networks |

Each ChutneX network is completely isolated from both the public Tor network and other ChutneX instances, enabling parallel forensic investigations without cross-contamination.

### Integrated Media Player

The platform includes an optional media player designed specifically for extended forensic sessions.

**Why a media player in a forensic tool?**

During multi-hour analysis sessions, background audio can improve focus without disrupting your work. However, streaming services introduce external network traffic that can contaminate traffic analysis and create unwanted metadata.

**Features:**

- Collapsible video widget that stays in foreground and is draggable
- Local caching prevents network requests during active tests
- Playback is logged but uses minimal resources
- Built-in YouTube search for tutorials and documentation
- Custom playlists for training materials or background audio
- No external data transmission during playback

**Optional by design:** If you don't use the player, it doesn't appear in the interface. The footer player bar only shows when media is actively loaded.

Video tutorials and documentation will be available through the player in future releases.

---

## Features

### Implemented

| Category | Feature | Description |
|----------|---------|-------------|
| **Infrastructure** | ChutneX Private Tor | 11-node isolated Tor networks |
| | Docker Manager | Container lifecycle control in UI |
| | SMP Server Management | Create, configure, test servers |
| | CLI Client Management | Docker-based SimpleX clients |
| **Monitoring** | Real-Time Updates | WebSocket-based live data |
| | Message Tracking | Delivery receipts with latency |
| | Server Health | Connectivity and latency tests |
| | Container Stats | CPU/Memory monitoring |
| **Interface** | React SPA | Modern TypeScript frontend |
| | Dark/Light Mode | Theme persistence |
| | Internationalization | German/English (25 prepared) |
| | Responsive Design | Desktop, tablet, mobile |
| **Integration** | Tor Support | Automatic .onion routing |
| | InfluxDB | Time-series metrics |
| | Grafana | Visualization dashboards |
| | Redis | Real-time message broker |

### Coming Soon

| Feature | Description |
|---------|-------------|
| Traffic Analysis Dashboard* | Live visualization of message flows, timing patterns, packet sizes |
| Adversary View* | Simulate observer capabilities from ISP to state-level actors |
| Timing Correlation* | Detect communication relationships through timing analysis |
| Security Scoring* | Quantified privacy assessment with recommendations |
| Protocol Analysis* | Deep packet inspection with Zeek |
| Graph Visualization* | Communication relationship mapping with Neo4j |
| Threat Intelligence* | IoC correlation with MISP and OpenCTI |
| Advanced Test Panel* | Stress tests, mesh connections, bulk operations |

*See [docs/ROADMAP.md](docs/ROADMAP.md) for the complete development roadmap.*

---

## Screenshots

### ChutneX Private Tor Network

![ChutneX Network](screenshots/chutnex_network.png)

*Private Tor network management with node status, circuit visualization, and isolation verification*

### Docker Manager

![Docker Manager](screenshots/docker_manager.png)

*Real-time container management with CPU/memory stats, lifecycle controls, and log viewing*

### Server Management

![Server List](screenshots/servers_list.png)

*Server overview with status indicators, latency metrics, and category organization*

### Client Detail

![Client Detail](screenshots/client_detail.png)

*Client management with connection handling, message tracking, and delivery statistics*

---

## Quick Start

### Prerequisites

- Docker 24.x or newer
- Docker Compose 2.x or newer
- Hardware meeting [minimum requirements](#important-hardware-requirements)

### Installation

**Method 1: Clone and Run**
```bash
git clone https://github.com/cannatoshi/simplex-smp-monitor.git
cd simplex-smp-monitor
docker compose up -d
```

**Method 2: Pre-Built Images**
```bash
mkdir simplex-smp-monitor && cd simplex-smp-monitor

# Download from GitHub Releases
wget https://github.com/cannatoshi/simplex-smp-monitor/releases/download/v0.1.12-alpha/simplex-smp-monitor-app.tar.gz
wget https://github.com/cannatoshi/simplex-smp-monitor/releases/download/v0.1.12-alpha/docker-compose.prod.yml

# Load and start
docker load < simplex-smp-monitor-app.tar.gz
docker compose -f docker-compose.prod.yml up -d
```

**Method 3: GitHub Container Registry**
```bash
docker pull ghcr.io/cannatoshi/simplex-smp-monitor-app:v0.1.12
docker pull ghcr.io/cannatoshi/simplex-smp-monitor-nginx:v0.1.12
```

For detailed installation instructions, see [docs/DOCKER.md](docs/DOCKER.md).

### Access Points

| Interface | URL | Default Credentials |
|-----------|-----|---------------------|
| Web Application | http://localhost:8080 | admin / simplex123 |
| Grafana | http://localhost:3002 | admin / simplex123 |
| InfluxDB | http://localhost:8086 | admin / simplex123 |

### Verify Installation
```bash
# Check all services are running
docker compose ps

# View application logs
docker compose logs -f app
```

---

## Architecture

### Component Overview

| Layer | Components | Purpose |
|-------|------------|---------|
| **Frontend** | React 18, TypeScript, Tailwind CSS | User interface |
| **API** | Django REST Framework | Data and operations |
| **Real-Time** | Django Channels, Redis | WebSocket communication |
| **Orchestration** | Docker SDK, ChutneX | Container and network management |
| **Storage** | PostgreSQL, InfluxDB | Relational and time-series data |
| **Visualization** | Grafana | Metrics dashboards |
| **Network** | Tor, ChutneX | Anonymity and isolation |

### Data Flow

1. **User Interface** sends requests to Django REST API
2. **Django** orchestrates Docker containers and manages data
3. **SimplexEventBridge** connects to all running clients via WebSocket
4. **Redis Channel Layer** broadcasts events to connected browsers
5. **InfluxDB** stores time-series metrics for historical analysis
6. **Grafana** visualizes trends and provides alerting

### Network Isolation

ChutneX networks use Docker's internal network mode, preventing any traffic from reaching external networks. Each private Tor network operates independently with its own Directory Authorities, consensus, and circuits.

---

## Documentation

| Document | Description |
|----------|-------------|
| [CHANGELOG.md](CHANGELOG.md) | Version history and release notes |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Development roadmap and planned features |
| [docs/DOCKER.md](docs/DOCKER.md) | Docker deployment guide |
| [docs/MANUAL_INSTALL.md](docs/MANUAL_INSTALL.md) | Manual installation without Docker |
| [docs/CLI_CLIENTS.md](docs/CLI_CLIENTS.md) | SimpleX CLI client guide |
| [docs/CHUTNEX.md](docs/CHUTNEX.md) | ChutneX private Tor documentation |
| [docs/DEVNOTES.md](docs/DEVNOTES.md) | Developer notes and implementation details |
| [docs/LEGAL.md](docs/LEGAL.md) | Legal information and compliance |

---

## Docker Images

### Application Images

| Image | Size | Description |
|-------|------|-------------|
| `simplex-smp-monitor-app` | ~250 MB | Django + React application |
| `chutnex` | ~45 MB | Private Tor network nodes |
| `simplex-cli` | ~52 MB | SimpleX Chat client |
| `simplex-smp` | ~44 MB | SMP server (ClearNet) |
| `simplex-smp-tor` | ~46 MB | SMP server (Tor) |
| `simplex-xftp` | ~43 MB | XFTP file server |
| `simplex-ntf` | ~44 MB | Notification server |

### Building Images
```bash
cd ~/simplex-smp-monitor

# Build all images
for img in chutnex simplex-cli simplex-smp simplex-smp-tor simplex-xftp simplex-ntf; do
    docker build -t ${img}:latest docker/images/${img}/
done

# Build application
docker compose build app
```

---

## Contributing

Contributions are welcome. Please review the following before submitting:

1. [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
2. [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) - Community standards
3. [docs/DEVNOTES.md](docs/DEVNOTES.md) - Technical implementation details

### Priority Areas

| Area | Impact |
|------|--------|
| Traffic Analysis Components | High |
| Adversary View Algorithms | High |
| Test Coverage | Medium |
| Documentation | Medium |
| Translations | Low |

---

## Related Projects

- [SimpleX Private Infrastructure Tutorial](https://github.com/cannatoshi/simplex-smp-xftp-via-tor-on-rpi-hardened) - Deploy SimpleX on Raspberry Pi with Tor
- [SimpleX Chat](https://github.com/simplex-chat/simplex-chat) - The SimpleX Chat application
- [SimpleXMQ](https://github.com/simplex-chat/simplexmq) - SimpleX Messaging Queue protocol

---

## License

This project is licensed under the **GNU Affero General Public License v3.0** (AGPL-3.0).

See [LICENSE](LICENSE) for the full license text.

---

## Legal and Disclaimer

This software is provided "AS IS" without warranty of any kind. It is intended for testing your own infrastructure only.

**Important:**
- Do not test servers you do not own or have explicit permission to test
- Operating Tor nodes is legal in Germany and the EU (BGH I ZR 64/17, 2018)
- ChutneX private networks are completely isolated and legal for research purposes

This project is **not affiliated with or endorsed by SimpleX Chat Ltd** or **The Tor Project, Inc**.

For complete legal information:
- [docs/LEGAL.md](docs/LEGAL.md) - Legal documentation overview
- [docs/DISCLAIMER.md](docs/DISCLAIMER.md) - Liability disclaimer
- [docs/TRADEMARK.md](docs/TRADEMARK.md) - Trademark information
- [docs/TESTING_POLICY.md](docs/TESTING_POLICY.md) - Testing guidelines

---

<p align="center">
  <sub>Built for the SimpleX ecosystem</sub><br>
  <sub>i(N) cod(E) w(E) trus(T)</sub>
</p>
