# Docker Deployment

Complete Docker containerization for cross-platform deployment.

---

## Quick Start

```bash
# Clone and start
git clone https://github.com/cannatoshi/simplex-smp-monitor.git
cd simplex-smp-monitor
docker compose up -d
```

**That's it!** Open http://localhost:8080

---

## Default Credentials

| Service | URL | Username | Password |
|---------|-----|----------|----------|
| **Web UI** | http://localhost:8080 | `admin` | `simplex123` |
| **Django Admin** | http://localhost:8080/admin/ | `admin` | `simplex123` |
| **Grafana** | http://localhost:3002 | `admin` | `simplex123` |
| **InfluxDB** | http://localhost:8086 | `admin` | `simplex123` |

> ⚠️ **Change these in production!** Edit `.env` before deploying.

---

## Installation Methods

### Method 1: Clone & Run (Development)

```bash
git clone https://github.com/cannatoshi/simplex-smp-monitor.git
cd simplex-smp-monitor
docker compose up -d
```

### Method 2: Pre-Built Images (Production)

```bash
mkdir simplex-smp-monitor && cd simplex-smp-monitor

# Download from GitHub Releases
wget https://github.com/cannatoshi/simplex-smp-monitor/releases/download/v0.1.11-alpha/simplex-smp-monitor-app.tar.gz
wget https://github.com/cannatoshi/simplex-smp-monitor/releases/download/v0.1.11-alpha/docker-compose.prod.yml

# Load and start
docker load < simplex-smp-monitor-app.tar.gz
docker compose -f docker-compose.prod.yml up -d
```

### Method 3: GitHub Container Registry

```bash
docker pull ghcr.io/cannatoshi/simplex-smp-monitor-app:latest
docker tag ghcr.io/cannatoshi/simplex-smp-monitor-app:latest simplex-smp-monitor-app:latest
docker compose -f docker-compose.prod.yml up -d
```

---

## Services Overview

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| **Nginx** | simplex-monitor-nginx | 8080 | Reverse Proxy + Static Files |
| **App** | simplex-monitor-app | 8000 | Django API + React SPA |
| **PostgreSQL** | simplex-monitor-postgres | 5432 | Database |
| **Redis** | simplex-monitor-redis | 6379 | Cache + Channel Layer |
| **InfluxDB** | simplex-monitor-influxdb | 8086 | Metrics Storage |
| **Grafana** | simplex-monitor-grafana | 3002 | Dashboards |
| **Tor** | simplex-monitor-tor | 9050 | SOCKS Proxy for .onion |

---

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │            NGINX (:8080)            │
                    │   React SPA + Reverse Proxy         │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
        ┌──────────┐        ┌──────────┐        ┌──────────┐
        │  React   │        │  Django  │        │  Admin   │
        │   SPA    │        │   API    │        │  Panel   │
        │   /*     │        │  /api/*  │        │ /admin/* │
        └──────────┘        └────┬─────┘        └──────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
   ┌──────────┐           ┌──────────┐           ┌──────────┐
   │PostgreSQL│           │  Redis   │           │   Tor    │
   │    DB    │           │  Cache   │           │  Proxy   │
   └──────────┘           └──────────┘           └──────────┘
```

---

## Commands Reference

### Lifecycle

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Stop and remove all data (fresh start)
docker compose down -v

# Restart specific service
docker compose restart app
```

### Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f nginx
docker compose logs -f postgres
```

### Rebuild

```bash
# After code changes
docker compose build app --no-cache
docker compose up -d

# Full rebuild
docker compose build --no-cache
docker compose up -d
```

### Shell Access

```bash
# App container bash
docker compose exec app bash

# Django shell
docker compose exec app python manage.py shell

# PostgreSQL
docker compose exec postgres psql -U simplex -d simplex_monitor

# Redis CLI
docker compose exec redis redis-cli
```

---

## Configuration

### Custom Ports

Edit `.env`:

```bash
APP_PORT=9000      # Web UI (default: 8080)
GRAFANA_PORT=3003  # Grafana (default: 3002)
INFLUXDB_PORT=8087 # InfluxDB (default: 8086)
```

### Production Settings

```bash
# Generate secure secret key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Edit `.env`:

```bash
DEBUG=False
SECRET_KEY=your-generated-secret-key-here
ADMIN_PASSWORD=your-secure-password
POSTGRES_PASSWORD=another-secure-password
```

---

## Data Persistence

All data is stored in Docker volumes:

| Volume | Content |
|--------|---------|
| `simplex-monitor-postgres` | Database |
| `simplex-monitor-redis` | Cache |
| `simplex-monitor-influxdb-data` | Metrics |
| `simplex-monitor-grafana` | Dashboards |
| `simplex-monitor-app-data` | App data |
| `simplex-monitor-app-media` | Uploads |

### Backup Database

```bash
docker exec simplex-monitor-postgres pg_dump -U simplex simplex_monitor > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker exec -i simplex-monitor-postgres psql -U simplex simplex_monitor
```

---

## Custom Docker Images

### Available Images

| Image | Purpose | Build Command |
|-------|---------|---------------|
| `simplex-cli` | SimpleX Chat Client | `docker build -t simplex-cli docker/images/simplex-cli/` |
| `simplex-smp` | SMP Server (ClearNet) | `docker build -t simplex-smp docker/images/simplex-smp/` |
| `simplex-smp-tor` | SMP Server (Tor) | `docker build -t simplex-smp-tor docker/images/simplex-smp-tor/` |
| `simplex-xftp` | XFTP File Server | `docker build -t simplex-xftp docker/images/simplex-xftp/` |
| `simplex-ntf` | Notification Server | `docker build -t simplex-ntf docker/images/simplex-ntf/` |
| `chutnex` | Private Tor Network Node | `docker build -t chutnex docker/images/chutnex/` |

### Build All Images

```bash
cd ~/simplex-smp-monitor

for img in chutnex simplex-cli simplex-smp simplex-smp-tor simplex-xftp simplex-ntf; do
    echo "Building ${img}..."
    docker build -t ${img}:latest docker/images/${img}/
done
```

---

## Networks

| Network | Purpose | Created By |
|---------|---------|------------|
| `simplex-monitor-network` | Main stack | docker-compose |
| `simplex-clients` | Client containers | ClientDockerManager |
| `simplex-servers` | Server containers | ServerDockerManager |
| `chutnex-{slug}` | ChutneX private Tor | ChutneXDockerManager |

### Connect App to Client Network

Required for WebSocket communication:

```bash
docker network connect simplex-clients simplex-monitor-app
```

---

## Troubleshooting

### Container won't start

```bash
docker compose logs app
docker compose ps
```

### Port already in use

```bash
# Check what's using the port
sudo lsof -i :8080

# Use different port in .env
APP_PORT=9000
```

### Database connection error

```bash
docker compose logs postgres
docker compose restart postgres
```

### Reset admin password

```bash
docker compose exec app python manage.py changepassword admin
```

### Permission issues

```bash
sudo chown -R $USER:$USER .
```

### Windows line ending issues

```powershell
git config --global core.autocrlf false
git rm -rf --cached .
git reset --hard HEAD
```

---

## Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| **Start** | `docker compose up -d` | `docker compose -f docker-compose.prod.yml up -d` |
| **Database** | PostgreSQL | PostgreSQL |
| **Debug** | Enabled | Disabled |
| **Static Files** | Whitenoise | Nginx |

---

## System Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **RAM** | 2 GB | 4 GB |
| **Disk** | 5 GB | 10 GB |
| **Docker** | 20.10+ | Latest |
| **Docker Compose** | 2.0+ | Latest |

---

## Upgrading

### From Source (Method 1)

```bash
cd simplex-smp-monitor
docker compose down
git pull
docker compose build --no-cache app
docker compose up -d
```

### From Pre-Built Images (Method 2)

```bash
docker compose -f docker-compose.prod.yml down
wget https://github.com/cannatoshi/simplex-smp-monitor/releases/download/vX.X.X/simplex-smp-monitor-app.tar.gz
docker load < simplex-smp-monitor-app.tar.gz
docker compose -f docker-compose.prod.yml up -d
```

---

*For detailed technical information, see [DEVNOTES.md](DEVNOTES.md)*