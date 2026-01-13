# Development Guide

Guide for developing SimpleX SMP Monitor locally.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.12+ |
| Node.js | 24+ |
| Docker | 24+ |
| Git | Any |

---

## Quick Start

### Option A: Docker (Production-like)

```bash
git clone https://github.com/cannatoshi/simplex-smp-monitor.git
cd simplex-smp-monitor
docker compose up -d
```

Access: http://localhost:8080

### Option B: Manual (Development)

```bash
# Clone
git clone https://github.com/cannatoshi/simplex-smp-monitor.git
cd simplex-smp-monitor

# Backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate

# Frontend
cd frontend
npm install
cd ..
```

---

## Development Workflow

### Running Dev Servers

**Terminal 1 - Backend (Django):**
```bash
source .venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

**Terminal 2 - Frontend (Vite):**
```bash
cd frontend
npm run dev
```

### Port Overview

| Service | Dev | Production |
|---------|-----|------------|
| React (Vite) | 3001 | - |
| Django | 8000 | - |
| Nginx | - | 8080 |
| PostgreSQL | 5432 | 5432 |
| Redis | 6379 | 6379 |

---

## Running Dev + Docker Simultaneously

Use different ports to avoid conflicts:

```bash
# Dev on default ports (8000, 3001)
# Docker on production port (8080)

# Both can run at the same time!
```

---

## Database

### Migrations

```bash
# Create migration
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations
```

### Reset Database (Dev)

```bash
rm db.sqlite3
python manage.py migrate
python manage.py createsuperuser
```

---

## Docker Development

### Build Images

```bash
# Build all
docker compose build

# Build specific service
docker compose build app

# No cache rebuild
docker compose build --no-cache app
```

### Export Images for Release

```bash
# Tag
docker tag simplex-smp-monitor-app:latest simplex-smp-monitor-app:v0.1.11

# Export
docker save simplex-smp-monitor-app:latest | gzip > simplex-smp-monitor-app.tar.gz
docker save simplex-smp-monitor-nginx:latest | gzip > simplex-smp-monitor-nginx.tar.gz
```

### Test Production Locally

```bash
docker compose down -v
docker compose up -d
# Access: http://localhost:8080
```

---

## Release Process

### 1. Update Version Numbers

- `README.md` - Version badge and header
- `CHANGELOG.md` - Add release notes
- `docker-entrypoint.sh` - Banner version

### 2. Commit Changes

```bash
git add .
git commit -s -m "chore(release): Prepare v0.1.11-alpha 🚀 📦"
```

### 3. Create Tag

```bash
git tag -s v0.1.11-alpha -m "v0.1.11-alpha"
git push origin v0.1.11-alpha
```

### 4. Build & Export Images

```bash
docker compose build
docker save simplex-smp-monitor-app:latest | gzip > simplex-smp-monitor-app.tar.gz
docker save simplex-smp-monitor-nginx:latest | gzip > simplex-smp-monitor-nginx.tar.gz
```

### 5. Create GitHub Release

1. Go to Releases → Draft new release
2. Select tag
3. Add release notes from CHANGELOG
4. Upload .tar.gz files
5. Mark as pre-release if alpha/beta

---

## Code Style

### Python

- PEP 8
- Max line length: 120
- Use type hints

### TypeScript/React

- Functional components
- TypeScript strict mode
- Tailwind CSS

### Commits

```
<type>(<scope>): <description> <emoji>

Signed-off-by: Name <email>
```

---

## Useful Commands

```bash
# Django shell
python manage.py shell

# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic

# Run tests
python manage.py test

# Frontend build
cd frontend && npm run build
```

---

*Last updated: January 1, 2026*