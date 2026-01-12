# Docker Manager

> **Manage Docker containers directly from the web interface**  
> Start, stop, restart, and monitor all your containers in one place.

---

## Overview

The Docker Manager module provides a comprehensive interface for managing Docker containers running on your host system. It's designed for monitoring SimpleX infrastructure but works with any Docker container.

![Docker Manager Screenshot](screenshots/docker-manager-table.png)

---

## Features

### Container Management
- **Start/Stop/Restart** - Control container lifecycle with one click
- **Pause/Unpause** - Temporarily suspend containers
- **Remove** - Delete containers (with force option for running containers)
- **Bulk Operations** - Select multiple containers and perform actions on all

### Real-Time Monitoring
- **CPU Usage** - Live CPU percentage with visual progress bar
- **Memory Usage** - RAM consumption with percentage and absolute values
- **Network I/O** - Bytes received/transmitted
- **Block I/O** - Disk read/write statistics

### Visual Features
- **Table View** - Detailed list with sortable columns
- **Card View** - Grid layout for visual overview
- **Expandable Rows** - Click to see container details (mounts, networks, ports)
- **Tor Detection** - Purple highlighting for Tor/ChutneX containers 🧅
- **Status Indicators** - Animated dots showing container state

### Additional Tools
- **Container Logs** - View last 200 lines of container output
- **Search & Filter** - Find containers by name, filter by status
- **System Prune** - Clean up stopped containers

---

## Quick Start

### Accessing Docker Manager

1. Open the SimpleX SMP Monitor dashboard
2. Click **🐳 Docker** in the sidebar
3. All containers on your host are displayed

### Basic Operations

| Action | How |
|--------|-----|
| **Start** | Click ▶️ play button |
| **Stop** | Click ⏹️ stop button |
| **Restart** | Click 🔄 restart button |
| **View Logs** | Click 📋 document icon |
| **Remove** | Click 🗑️ trash icon |

### Bulk Actions

1. Check the boxes next to containers you want to manage
2. Use the bulk action buttons that appear:
   - **Start All** - Start all selected
   - **Stop All** - Stop all selected  
   - **Remove All** - Remove all selected (with confirmation)

---

## Interface Guide

### Table View

| Column | Description |
|--------|-------------|
| **Status** | Animated dot (🟢 running, ⚫ stopped, 🟡 paused) |
| **Name** | Container name with 🧅 badge for Tor containers |
| **Image** | Docker image name |
| **Size** | Image size on disk |
| **CPU** | CPU usage percentage with progress bar |
| **Memory** | Memory usage with progress bar |
| **Actions** | Control buttons |

### Card View

Click the grid icon to switch to card view - ideal for visual overview of many containers.

### Expanded Details

Click any row to expand and see:
- **Container ID** - Full container hash
- **Created** - When the container was created
- **Uptime** - How long it's been running
- **Ports** - Port mappings (host:container)
- **Mounts** - Volume bindings
- **Networks** - Connected Docker networks
- **Detailed Stats** - CPU, Memory, Network I/O, Block I/O

---

## Tor/ChutneX Container Detection

Containers related to Tor or ChutneX private networks are automatically detected and highlighted in **purple**:

### Detection Criteria

A container is marked as Tor-related if any of these match:
- **Name** contains: `tor`, `chutnex`, `chutney`
- **Image** contains: `tor`, `chutnex`, `chutney`
- **Network** contains: `tor`, `chutnex`, `chutney`

### Visual Indicators

- 🧅 **Onion emoji** badge next to container name
- **Purple status dot** instead of cyan
- **Purple status badge** ("running" in purple)
- **Purple network badges** in expanded details

---

## Status Colors

| Status | Color | Indicator |
|--------|-------|-----------|
| **Running** | Cyan (or Purple for Tor) | Pulsing dot |
| **Running (Tor)** | Purple | Pulsing dot with 🧅 |
| **Stopped/Exited** | Gray | Static dot |
| **Paused** | Amber | Static dot |
| **Restarting** | Blue | Static dot |
| **Dead** | Red | Static dot |

### Progress Bar Colors

| Condition | Color |
|-----------|-------|
| **Normal (0-80%)** | Neon Blue |
| **Warning (>80%)** | Red with glow |

---

## Header Statistics

The header shows a quick overview:
- 🟣 **X 🧅 tor** - Running Tor containers
- 🔵 **X running** - Running normal containers
- ⚫ **X stopped** - Stopped containers
- 🟡 **X paused** - Paused containers

---

## System Prune

The **Prune** button removes:
- All stopped containers
- Unused networks
- Dangling images
- Build cache

⚠️ **Warning:** This cannot be undone. A confirmation dialog will appear.

---

## Refresh Behavior

| Data | Refresh Interval |
|------|------------------|
| **Container Stats** | Every 5 seconds |
| **Container List** | Every 15 seconds |
| **Manual Refresh** | Click "Refresh" button |

---

## Keyboard Shortcuts

*Coming in a future release*

---

## Troubleshooting

### No containers showing

1. Ensure Docker is running on the host
2. Check that the Django app has access to Docker socket:
   ```bash
   # In docker-compose.yml, verify this mount exists:
   volumes:
     - /var/run/docker.sock:/var/run/docker.sock
   ```

### Stats showing 0%

This was fixed in v0.1.12-alpha. If you see this:
1. Ensure you're on the latest version
2. Restart the Django app

### Permission denied

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Or run with sudo (not recommended for production)
```

### Container actions failing

Check Django logs:
```bash
docker compose logs app --tail 50
```

---

## API Endpoints

For developers integrating with the Docker Manager:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/docker/info/` | GET | Docker host information |
| `/api/docker/containers/` | GET | List all containers |
| `/api/docker/containers/{id}/action/` | POST | Container action (start/stop/etc) |
| `/api/docker/containers/{id}/` | DELETE | Remove container |
| `/api/docker/containers/{id}/stats/` | GET | Single container stats |
| `/api/docker/containers/{id}/logs/` | GET | Container logs |
| `/api/docker/stats/all/` | GET | All running container stats |
| `/api/docker/bulk/` | POST | Bulk operations |
| `/api/docker/prune/` | POST | System prune |

---

## Roadmap

### Planned Features

- [ ] **WebSocket Real-Time** - Live stats without polling
- [ ] **Terminal/Shell** - Execute commands in containers
- [ ] **Image Management** - Pull, build, delete images
- [ ] **Network Management** - Create/delete networks
- [ ] **Volume Management** - Manage persistent storage
- [ ] **Compose Support** - Deploy docker-compose stacks
- [ ] **Container Creation** - Create new containers from UI

---

*Last updated: 2026-01-12 | Version: 0.1.12-alpha*