# Manual Installation Guide

Installation without Docker for development or environments where Docker is not available.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Python | 3.12+ | With pip and venv |
| Node.js | 24+ | For React frontend |
| npm | 10+ | Package manager |
| Tor | Latest | For .onion server testing |
| Git | Any | Repository cloning |
| Docker | 24.x+ | Required for CLI Clients and Redis |
| Redis | 7.x | Real-time communication |

---

## Step 1: System Dependencies

### Debian/Ubuntu
```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv git curl

# Install Node.js 24+
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version   # v24.x+
npm --version    # v10.x+
```

---

## Step 2: Install Tor
```bash
sudo apt install -y tor
sudo systemctl enable tor
sudo systemctl start tor

# Verify
sudo systemctl status tor
ss -lntp | grep 9050
```

Test Tor connectivity:
```bash
curl -x socks5h://127.0.0.1:9050 -s https://check.torproject.org/api/ip | jq
```

Expected: `"IsTor": true`

---

## Step 3: Install Docker

Docker is required for CLI Clients and Redis even in manual installations.
```bash
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
sudo systemctl enable docker
sudo systemctl start docker

# Log out and back in, then verify
docker --version
docker run hello-world
```

---

## Step 4: Setup Redis
```bash
docker run -d \
  --name simplex-redis \
  --restart unless-stopped \
  -p 6379:6379 \
  -v simplex-redis-data:/data \
  redis:7-alpine redis-server --appendonly yes

# Verify
docker exec simplex-redis redis-cli ping
```

Expected: `PONG`

---

## Step 5: Clone Repository
```bash
cd ~
git clone https://github.com/cannatoshi/simplex-smp-monitor.git
cd simplex-smp-monitor
```

---

## Step 6: Python Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

## Step 7: React Frontend
```bash
cd frontend
npm install
cd ..
```

---

## Step 8: Database
```bash
python manage.py migrate
python manage.py createsuperuser  # Optional
```

---

## Step 9: Build CLI Client Image
```bash
cd docker/images/simplex-cli
docker build -t simplex-cli:latest .
cd ../../..

# Verify
docker images | grep simplex-cli
```

---

## Step 10: Start Servers

You need two terminals:

**Terminal 1: Django Backend**
```bash
cd ~/simplex-smp-monitor
source .venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

**Terminal 2: Vite Dev Server**
```bash
cd ~/simplex-smp-monitor/frontend
npm run dev
```

---

## Access Points

| Interface | URL |
|-----------|-----|
| React App | http://localhost:3001 |
| Django Admin | http://localhost:8000/admin/ |
| REST API | http://localhost:8000/api/v1/ |

---

## Configuration

### Tor Settings

Edit `servers/views.py` if Tor runs on different host/port:
```python
TOR_PROXY_HOST = '127.0.0.1'
TOR_PROXY_PORT = 9050
```

### Redis Settings

Edit `config/settings.py` for remote Redis:
```python
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],
        },
    },
}
```

### Environment Variables

Create `.env` for production:
```bash
DEBUG=False
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=your-domain.com,localhost
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

---

## Monitoring Stack (Optional)

For metrics and visualization:
```bash
docker-compose up -d influxdb grafana
```

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3000 | admin / admin |
| InfluxDB | http://localhost:8086 | Set on first run |

---

## Troubleshooting

### Redis Not Running
```bash
docker ps | grep redis
docker start simplex-redis
```

### Event Bridge Not Starting

Check Django console for:
```
INFO 🌉 Event Bridge thread started
```

### Frontend Build Errors
```bash
cd frontend
npm run build
```

### Port Conflicts
```bash
ss -tlnp | grep 8000
ss -tlnp | grep 3001
```

---

## Upgrading
```bash
cd ~/simplex-smp-monitor
git pull
source .venv/bin/activate
pip install -r requirements.txt
cd frontend && npm install && cd ..
python manage.py migrate
```

---

<p align="center">
  <sub>For Docker installation, see <a href="DOCKER.md">docs/DOCKER.md</a></sub>
</p>
