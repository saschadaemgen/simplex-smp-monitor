# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> 📋 **Detailed release notes** with code examples: [docs/releases/](docs/releases/)  
> 🗺️ **Planned features**: [docs/ROADMAP.md](docs/ROADMAP.md)

---

## [0.1.12-alpha] - 2026-01-12

### *"The Forensic Lab Release"*

**From monitoring tool to full-blown forensic analysis platform.**

#### Added
- **ChutneX** - Private Tor network lab with 100% isolation (11 nodes: 3 DA, 2 Guard, 2 Middle, 2 Exit, 2 Client)
- **Docker Manager** - Real-time container management UI with CPU/Memory stats, lifecycle controls, bulk actions
- **Musicplayer Cache Forensics Dashboard** - Cache analytics, auto-switch to LOCAL playback
- **docs/DEVNOTES.md** - Developer implementation details and troubleshooting
- **docs/CHUTNEX.md** - Complete ChutneX technical documentation
- **docs/releases/** - Detailed release notes archive

#### Changed
- **docs/DOCKER.md** - Realistic system requirements (32-256 GB RAM for forensic workloads)
- **Docker images** centralized in `docker/images/` directory
- **Footer** - Rotating text now includes clickable GitHub link

#### Fixed
- **WebSocket container networking** - `RUNNING_IN_DOCKER` environment variable for URL detection
- **ChutneX DA synchronization** - All nodes wait for DA registration before starting Tor

#### Documentation
- Isolation verification tests with recorded results
- Network naming conventions (`simplex-clients`, `simplex-servers`, `chutnex-{slug}`)
- Scaling reference (10 to 1000 clients)

📄 [Full release notes](docs/releases/v0.1.12-alpha.md)

---

## [0.1.11-alpha] - 2026-01-01

### *Security & Community Health Update*

#### Security
- **25 vulnerabilities fixed** - CVE patches, XSS prevention, information exposure fixes
- **CVE-2024-26130** - cbor2 infinite loop vulnerability patched

#### Added
- **10 community health files** - SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, etc.
- **GitHub security features** - Private vulnerability reporting, Dependabot, CodeQL, secret scanning

📄 [Full release notes](docs/releases/v0.1.11-alpha.md)

---

## [0.1.10-alpha] - 2026-01-01

### *Docker One-Click Deployment*

#### Added
- **Complete Docker Compose stack** - One command deployment
- **Three installation methods** - Clone & Run, wget pre-built, GHCR pull
- **SimpleX Server Docker images** - Pre-built SMP, XFTP, NTF (v6.4.4.1)
- **Production compose file** - `docker-compose.prod.yml` for standalone deployment
- **Whitenoise integration** - Django serves React SPA directly

#### Fixed
- **Windows line endings** - `.gitattributes` enforces LF for shell scripts

📄 [Full release notes](docs/releases/v0.1.10-alpha.md)

---

## [0.1.9-alpha] - 2025-12-29

### *React SPA Migration*

#### Added
- **React 18 + TypeScript** frontend replacing Django Templates
- **Vite 5.x** build system with HMR
- **Tailwind CSS** styling with dark mode
- **React Router v6** client-side routing
- **react-i18next** internationalization (DE/EN)
- **REST API** for all entities

#### Deprecated
- Django Templates + HTMX + Alpine.js frontend

📄 [Full release notes](docs/releases/v0.1.9-alpha.md)

---

## [0.1.8-alpha] - 2025-12-27

### *Real-Time Infrastructure*

#### Added
- **Redis Channel Layer** - Production-ready message broker
- **SimplexEventBridge** - Auto-connects to all running containers
- **WebSocket Consumers** - Browser connections for live updates
- **Auto-start** - Event Bridge starts with Django (no manual command)
- **Live status indicator** - Real-time connection status in navigation

#### Deprecated
- `listen_events` management command (now automatic)

📄 [Full release notes](docs/releases/v0.1.8-alpha.md)

---

## [0.1.7-alpha] - 2025-12-27

### *SimpleX CLI Clients*

#### Added
- **Docker container management** for test clients
- **WebSocket command service** for client communication
- **Client connections** - Bidirectional connection tracking
- **Delivery receipt tracking** - ⏳ pending → ✓ sent → ✓✓ delivered
- **Latency measurement** in milliseconds

📄 [Full release notes](docs/releases/v0.1.7-alpha.md)

---

## [0.1.6-alpha] - 2025-12-26

### *Multi-Type Tests & i18n*

#### Added
- **Multi-type test system** - Monitoring, Stress, Latency tests
- **APScheduler** - Automated test execution
- **i18n translation system** - Alpine.js with JSON language files
- **25 language files** prepared (DE/EN active)

📄 [Full release notes](docs/releases/v0.1.6-alpha.md)

---

## [0.1.5-alpha] - 2025-12-25

### *Extended Server Configuration*

#### Added
- **7-tab server form** - Basic, Monitoring, SSH, Control Port, Telegraf, SimpleX Config, Statistics
- **Category system** - Colored labels for server organization
- **Quick test button** - Immediate connection test from card

📄 [Full release notes](docs/releases/v0.1.5-alpha.md)

---

## [0.1.4-alpha] - 2025-12-24

### *UI Redesign & Tor Integration*

#### Added
- **Professional dark/light mode** with Tailwind CSS
- **Bilingual support** - English/German toggle
- **Connection testing** - Real-time with latency measurement
- **Tor integration** - Automatic .onion detection, SOCKS5 proxy tests

📄 [Full release notes](docs/releases/v0.1.4-alpha.md)

---

## [0.1.0-alpha] - 2025-12-23

### *Initial Release*

#### Added
- Django 5.x project with ASGI support
- Server management (CRUD)
- Dashboard with statistics
- Docker Compose stack (InfluxDB, Grafana, Telegraf)
- HTMX + Alpine.js frontend

📄 [Full release notes](docs/releases/v0.1.0-alpha.md)

---

## Version History

| Version | Date | Codename |
|---------|------|----------|
| 0.1.12-alpha | 2026-01-12 | The Forensic Lab Release |
| 0.1.11-alpha | 2026-01-01 | Security & Community Health |
| 0.1.10-alpha | 2026-01-01 | Docker One-Click Deployment |
| 0.1.9-alpha | 2025-12-29 | React SPA Migration |
| 0.1.8-alpha | 2025-12-27 | Real-Time Infrastructure |
| 0.1.7-alpha | 2025-12-27 | SimpleX CLI Clients |
| 0.1.6-alpha | 2025-12-26 | Multi-Type Tests & i18n |
| 0.1.5-alpha | 2025-12-25 | Extended Server Configuration |
| 0.1.4-alpha | 2025-12-24 | UI Redesign & Tor Integration |
| 0.1.0-alpha | 2025-12-23 | Initial Release |

---

[0.1.12-alpha]: https://github.com/cannatoshi/simplex-smp-monitor/compare/v0.1.11-alpha...v0.1.12-alpha
[0.1.11-alpha]: https://github.com/cannatoshi/simplex-smp-monitor/compare/v0.1.10-alpha...v0.1.11-alpha
[0.1.10-alpha]: https://github.com/cannatoshi/simplex-smp-monitor/compare/v0.1.9-alpha...v0.1.10-alpha
[0.1.9-alpha]: https://github.com/cannatoshi/simplex-smp-monitor/compare/v0.1.8-alpha...v0.1.9-alpha
[0.1.8-alpha]: https://github.com/cannatoshi/simplex-smp-monitor/compare/v0.1.7-alpha...v0.1.8-alpha
[0.1.7-alpha]: https://github.com/cannatoshi/simplex-smp-monitor/compare/v0.1.6-alpha...v0.1.7-alpha
[0.1.6-alpha]: https://github.com/cannatoshi/simplex-smp-monitor/compare/v0.1.5-alpha...v0.1.6-alpha
[0.1.5-alpha]: https://github.com/cannatoshi/simplex-smp-monitor/compare/v0.1.4-alpha...v0.1.5-alpha
[0.1.4-alpha]: https://github.com/cannatoshi/simplex-smp-monitor/compare/v0.1.0-alpha...v0.1.4-alpha
[0.1.0-alpha]: https://github.com/cannatoshi/simplex-smp-monitor/releases/tag/v0.1.0-alpha
