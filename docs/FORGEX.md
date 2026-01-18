# ForgeX - Remote Server Deployment & Management

> **Part of the SimpleX SMP Monitor Ecosystem**
> 
> ForgeX enables centralized management, installation, configuration, and monitoring of SimpleX SMP and XFTP servers on remote systems - directly from the SMP Monitor Dashboard.
>
> **🏠 Home Server Mode** - Deploy SimpleX servers behind Starlink, CGNAT, or any NAT without port forwarding using Tor Hidden Services!

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Architecture](#architecture)
4. [Security Concept](#security-concept)
5. [Deployment Modes](#deployment-modes)
6. [Supported Systems](#supported-systems)
7. [Technical Implementation](#technical-implementation)
8. [Data Models](#data-models)
9. [API Endpoints](#api-endpoints)
10. [Tor Integration](#tor-integration)
11. [Backup & Recovery](#backup--recovery)
12. [Configuration](#configuration)
13. [Development Roadmap](#development-roadmap)
14. [Security Checklist](#security-checklist)

---

## Overview

### What is ForgeX?

ForgeX is an integrated remote management module for the SimpleX SMP Monitor that provides:

- **Provisioning**: Automated installation of SMP and XFTP servers
- **Home Server Mode**: Deploy behind ANY internet connection (Starlink, CGNAT, mobile hotspot)
- **Tor Integration**: Automatic .onion addresses - no DynDNS, no port forwarding
- **Configuration Management**: Centralized server configurations
- **Updates**: Secure, controlled updates with rollback capability
- **Monitoring**: Real-time status monitoring of managed servers
- **Backup/Restore**: Encrypted backups including critical Tor identity keys
- **Audit Trail**: Complete logging of all actions

### Why ForgeX?

| Problem | ForgeX Solution |
|---------|-----------------|
| "I have Starlink, can't port forward" | ✅ Tor Hidden Service - works everywhere |
| "My ISP uses CGNAT" | ✅ No port forwarding needed |
| "I don't have a static IP" | ✅ .onion address is permanent |
| "DynDNS is unreliable" | ✅ Tor handles everything |
| "Managing multiple servers is tedious" | ✅ One dashboard for all servers |
| "I want privacy for my infrastructure" | ✅ Tor hides your server location |
| "I lost my server config and now clients can't connect" | ✅ Automatic backup of Tor identity keys |

---

## Key Features

### 🏠 Home Server Mode

Deploy SimpleX servers from **anywhere** - no networking knowledge required:

```
┌─────────────────────────────────────────────────────────────────┐
│  TRADITIONAL (Clearnet):                                        │
│                                                                  │
│  Home Server → Router Config → Port Forward → DynDNS → Firewall │
│                                                                  │
│  ❌ Requires static IP or DynDNS                                │
│  ❌ Port forwarding often blocked (Starlink, CGNAT, Mobile)     │
│  ❌ ISP sees your server traffic                                │
│  ❌ Server IP exposed to all clients                            │
├─────────────────────────────────────────────────────────────────┤
│  FORGEX HOME SERVER MODE (Tor Hidden Service):                  │
│                                                                  │
│  Home Server → Tor → .onion address                             │
│                                                                  │
│  ✅ Works behind ANY NAT (Starlink, CGNAT, 4G/5G, Hotel WiFi)   │
│  ✅ No port forwarding needed                                   │
│  ✅ No static IP needed                                         │
│  ✅ No DynDNS needed                                            │
│  ✅ ISP only sees "Tor traffic"                                 │
│  ✅ Server location hidden from clients                         │
│  ✅ Automatic .onion address (permanent, yours forever)         │
└─────────────────────────────────────────────────────────────────┘
```

### 🔒 Dual Tor Architecture

ForgeX implements battle-tested Dual Tor setup for maximum stability:

```
┌─────────────────────────────────────────────────────────────────┐
│                    DUAL TOR ARCHITECTURE                        │
│                                                                  │
│  ┌─────────────────────┐       ┌─────────────────────┐         │
│  │    tor@default      │       │      tor@tor2       │         │
│  │  (Hidden Services)  │       │   (SOCKS Proxy)     │         │
│  │                     │       │                     │         │
│  │  SOCKSPort 0        │       │  SocksPort 9050     │         │
│  │  HiddenService ×N   │       │  No HiddenServices  │         │
│  └──────────┬──────────┘       └──────────┬──────────┘         │
│             │                             │                     │
│             │ INBOUND                     │ OUTBOUND            │
│             │ (clients → .onion)          │ (Private Routing)   │
│             ▼                             ▼                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    SMP/XFTP SERVER                          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Why two Tor instances?**
- Single Tor with Hidden Services + SOCKS = Resource conflicts
- Results in `SocksErrorGeneralServerFailure` errors
- Dual setup: Each instance dedicated to one task = Stable!

### 🛡️ Tor Watchdog (Auto-Recovery)

Automatic monitoring and recovery from Tor connectivity issues:

- Runs every 5 minutes via systemd timer
- Tests Hidden Service reachability via `torsocks nc`
- Automatic Tor restart if unreachable
- Logs all events to syslog for audit

### 🔑 Critical Backup System

ForgeX automatically backs up your **Tor identity keys** - lose these, lose your .onion address forever:

```
⚠️  CRITICAL: Your .onion address IS your identity!

These files ARE your .onion address:
├── /var/lib/tor/simplex-smp/hs_ed25519_secret_key
├── /var/lib/tor/simplex-smp/hs_ed25519_public_key
├── /var/lib/tor/simplex-xftp/hs_ed25519_secret_key
└── /var/lib/tor/simplex-xftp/hs_ed25519_public_key

Lost keys = New .onion address = ALL clients must reconfigure!

ForgeX Backup includes these automatically. 
```

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SMP Monitor Frontend                             │
│                              (React/TypeScript)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  [Monitoring]    [Analytics]    [ChutneX]    [ForgeX]                   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ WebSocket + REST API
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Django Backend                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
│  │   ForgeX Views   │  │  Celery Tasks    │  │  WebSocket Consumer  │   │
│  │   & Serializers  │  │  (Async Jobs)    │  │  (Live Progress)     │   │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘   │
│           │                     │                       │               │
│  ┌────────▼─────────────────────▼───────────────────────▼───────────┐   │
│  │                      ForgeX Service Layer                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │ SSH Manager │  │   Ansible   │  │    Tor      │               │   │
│  │  │             │  │   Runner    │  │  Deployer   │               │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
           ▼                 ▼                 ▼
    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │ VPS/Cloud   │   │ Home Server │   │ Raspberry   │
    │ (Clearnet)  │   │ (Tor Only)  │   │ Pi (ARM64)  │
    │             │   │             │   │             │
    │ Public IP   │   │ .onion addr │   │ .onion addr │
    │ Port 5223   │   │ Starlink OK │   │ Low Power   │
    └─────────────┘   └─────────────┘   └─────────────┘
```

---

## Security Concept

### Three-Pillar Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│   │   PILLAR 1      │  │   PILLAR 2      │  │   PILLAR 3      │ │
│   │  Authentication │  │   Abstraction   │  │   Anonymity     │ │
│   │                 │  │                 │  │                 │ │
│   │  • SSH Keys     │  │  • Ansible      │  │  • Tor Hidden   │ │
│   │  • No Passwords │  │  • Playbooks    │  │    Services     │ │
│   │  • Encrypted    │  │  • No direct    │  │  • No IP        │ │
│   │    Storage      │  │    commands     │  │    exposure     │ │
│   │  • Fernet       │  │  • Idempotent   │  │  • Location     │ │
│   │                 │  │                 │  │    hidden       │ │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Deployment Modes

### Mode Comparison

| Feature | Public Server | Home Server (Tor) |
|---------|---------------|-------------------|
| **Connection Type** | Direct clearnet | Tor Hidden Service |
| **Requires Static IP** | ✅ Yes | ❌ No |
| **Requires Port Forward** | ✅ Yes | ❌ No |
| **Works with Starlink** | ❌ No | ✅ Yes |
| **Works with CGNAT** | ❌ No | ✅ Yes |
| **Works with Mobile Hotspot** | ❌ No | ✅ Yes |
| **Server IP Hidden** | ❌ No | ✅ Yes |
| **ISP Visibility** | Full | Only "Tor traffic" |
| **Latency** | ~10-50ms | ~200-500ms |
| **Best For** | VPS, Dedicated | Home, Privacy-focused |

### UI: Add Server Dialog

```
┌─────────────────────────────────────────────────────────────────┐
│ Add New Server                                              [X] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Deployment Mode                                                 │
│  ───────────────                                                 │
│                                                                  │
│  ○ Public Server (VPS/Dedicated)                                │
│      Direct clearnet access, requires static IP & port forward  │
│                                                                  │
│  ● Home Server (Tor Hidden Service) ⭐ RECOMMENDED              │
│      Works everywhere: Starlink, CGNAT, Mobile, Hotel WiFi      │
│      No port forwarding • No static IP • No DynDNS              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🏠 Home Server Mode automatically configures:                ││
│  │                                                              ││
│  │ • Dual Tor Architecture (stable Hidden Services)             ││
│  │ • Automatic .onion address generation (56 chars + .onion)    ││
│  │ • Tor Watchdog (auto-recovery from issues)                   ││
│  │ • Firewall rules (block clearnet, Tor-only access)           ││
│  │ • SSH over Tor (secure remote administration)                ││
│  │                                                              ││
│  │ ⚠️  Your .onion address = Your server identity               ││
│  │    ForgeX automatically backs up your Tor keys!              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Server Details                                                  │
│  ──────────────                                                  │
│                                                                  │
│  Display Name     [ Home SimpleX Server              ]          │
│  SSH Host         [ 192.168.1.100                    ]          │
│  SSH Port         [ 22                               ]          │
│  Distribution     [ Raspberry Pi OS (Debian 12)     ▼]          │
│  Architecture     [ ARM64 (aarch64)                 ▼]          │
│                                                                  │
│  ℹ️  Onion addresses are 56 characters + ".onion" (Tor v3)       │
│     Example: abc123...xyz.onion                                  │
│                                                                  │
│                         [Cancel]  [Test Connection]  [Deploy]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Supported Systems

### Operating Systems

| Distribution | Versions | Architecture | Status |
|--------------|----------|--------------|--------|
| **Debian** | 12 (Bookworm) | x86-64, ARM64 | ✅ Full |
| **Ubuntu** | 22.04, 24.04 LTS | x86-64, ARM64 | ✅ Full |
| **Raspberry Pi OS** | Bookworm (64-bit) | ARM64 | ✅ Full |
| **Rocky Linux** | 8, 9 | x86-64 | ✅ Full |
| **AlmaLinux** | 8, 9 | x86-64 | ✅ Full |
| **Fedora** | 40, 41 | x86-64 | ✅ Full |

### SimpleX Components (January 2026)

| Component | Min. Version | Stable | Beta | Protocol |
|-----------|--------------|--------|------|----------|
| **SMP Server** | 6.3.0 | **6.4.4** | 6.5.0-beta.3 | SMP v6/v7 |
| **XFTP Server** | 6.3.0 | **6.4.4** | 6.5.0-beta.3 | XFTP |

> **Note:** Beta channel (6.5.x) includes PostgreSQL message storage and improved expiration. 
> ForgeX supports both stable and beta channels via configuration.

### Hardware Recommendations

```yaml
Raspberry Pi 4/5 (Home Server):
  Model: Pi 4 (4GB) or Pi 5 (4GB+)
  Storage: 32GB+ microSD or USB SSD (SSD recommended!)
  Power: Official 5V/3A PSU
  Network: Ethernet recommended (WiFi works)
  Cost: ~€80 total
  Supports: 10 SMP + 1 XFTP servers
  
  ⚠️  microSD Wear: Use SSD or enable log rotation/tmpfs for logs

Mini PC (Home Server):
  CPU: x86-64 or ARM64
  RAM: 2GB+
  Storage: 32GB+
  Examples: Intel NUC, Beelink, Orange Pi 5

VPS (Public Server):
  CPU: 1+ vCPU
  RAM: 512MB+ (1GB recommended)
  Storage: 10GB+
  Network: Public IPv4 (IPv6 optional)
```

---

## Technical Implementation

### Backend Structure

```
backend/
├── forgex/
│   ├── models/
│   │   ├── server.py           # ManagedServer
│   │   ├── ssh_key.py          # SSHKey (encrypted)
│   │   ├── deployment.py       # DeploymentTask
│   │   ├── backup.py           # BackupRecord (NEW)
│   │   └── audit.py            # AuditLog
│   ├── services/
│   │   ├── ssh_manager.py      # SSH connections
│   │   ├── ansible_runner.py   # Playbook execution
│   │   ├── crypto_service.py   # Fernet encryption
│   │   ├── tor_deployer.py     # Tor Hidden Service setup
│   │   ├── backup_service.py   # Backup/Restore with Tor keys
│   │   └── health_check.py     # Server monitoring
│   ├── tasks/
│   │   ├── deployment.py       # Celery deployment tasks
│   │   ├── backup.py           # Celery backup tasks
│   │   └── monitoring.py       # Background health checks
│   ├── consumers/
│   │   └── progress.py         # WebSocket consumer
│   └── playbooks/
│       ├── install_smp.yml
│       ├── install_xftp.yml
│       ├── setup_tor_onion.yml       # Tor Hidden Service
│       ├── setup_dual_tor.yml        # Dual Tor Architecture
│       ├── setup_ssh_over_tor.yml    # SSH via .onion
│       ├── install_tor_watchdog.yml  # Auto-recovery
│       ├── setup_firewall.yml        # Tor-only firewall
│       ├── backup_server.yml         # Full backup incl. Tor keys
│       ├── restore_server.yml        # Restore from backup
│       ├── update_server.yml
│       └── harden_server.yml
```

---

## Data Models

### ManagedServer

```python
class ManagedServer(models.Model):
    class DeploymentMode(models.TextChoices):
        PUBLIC = 'public', 'Public Server (Clearnet)'
        TOR_HIDDEN = 'tor_hidden', 'Home Server (Tor Hidden Service)'
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending Setup'
        DEPLOYING = 'deploying', 'Deploying'
        ONLINE = 'online', 'Online'
        OFFLINE = 'offline', 'Offline'
        ERROR = 'error', 'Error'
    
    class Architecture(models.TextChoices):
        X86_64 = 'x86_64', 'x86-64'
        AARCH64 = 'aarch64', 'ARM64 (aarch64)'
    
    # Basic Info
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100)
    deployment_mode = models.CharField(
        max_length=20, 
        choices=DeploymentMode.choices,
        default=DeploymentMode.TOR_HIDDEN  # Home Server is default!
    )
    
    # Network - Clearnet (for public mode)
    hostname = models.CharField(max_length=255, blank=True)
    ssh_port = models.PositiveIntegerField(default=22)
    ipv4_address = models.GenericIPAddressField(protocol='IPv4', null=True, blank=True)
    ipv6_address = models.GenericIPAddressField(protocol='IPv6', null=True, blank=True)
    
    # Network - Tor (for home server mode)
    # Note: .onion addresses are exactly 56 chars + ".onion" = 62 chars total (Tor v3)
    smp_onion_address = models.CharField(max_length=62, blank=True)
    xftp_onion_address = models.CharField(max_length=62, blank=True)
    ssh_onion_address = models.CharField(max_length=62, blank=True)
    
    # Tor Configuration
    tor_watchdog_enabled = models.BooleanField(default=True)
    dual_tor_configured = models.BooleanField(default=False)
    ssh_over_tor_enabled = models.BooleanField(default=True)  # Default ON for Home Mode
    tor_keys_backed_up = models.BooleanField(default=False)
    last_tor_key_backup = models.DateTimeField(null=True, blank=True)
    
    # Status & Versions
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    distribution = models.CharField(max_length=20)
    architecture = models.CharField(max_length=20, choices=Architecture.choices)
    
    # Components
    smp_installed = models.BooleanField(default=False)
    smp_version = models.CharField(max_length=20, null=True, blank=True)
    smp_fingerprint = models.CharField(max_length=64, blank=True)
    
    xftp_installed = models.BooleanField(default=False)
    xftp_version = models.CharField(max_length=20, null=True, blank=True)
    xftp_fingerprint = models.CharField(max_length=64, blank=True)
    
    # SSH
    ssh_key = models.ForeignKey('SSHKey', on_delete=models.PROTECT)
    ssh_username = models.CharField(max_length=100, default='forgex-deploy')
    
    # Metadata
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    tags = models.JSONField(default=list)
    
    def get_smp_address(self) -> str:
        """Returns full SMP server address for clients."""
        if self.deployment_mode == self.DeploymentMode.TOR_HIDDEN:
            return f"smp://{self.smp_fingerprint}@{self.smp_onion_address}:5223"
        return f"smp://{self.smp_fingerprint}@{self.hostname}:5223"
    
    def get_xftp_address(self) -> str:
        """Returns full XFTP server address for clients."""
        if self.deployment_mode == self.DeploymentMode.TOR_HIDDEN:
            return f"xftp://{self.xftp_fingerprint}@{self.xftp_onion_address}:443"
        return f"xftp://{self.xftp_fingerprint}@{self.hostname}:443"


class BackupRecord(models.Model):
    """Tracks backups including critical Tor identity keys."""
    
    class BackupType(models.TextChoices):
        FULL = 'full', 'Full Backup'
        TOR_KEYS = 'tor_keys', 'Tor Keys Only'
        CONFIG = 'config', 'Configuration Only'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    server = models.ForeignKey(ManagedServer, on_delete=models.CASCADE, related_name='backups')
    backup_type = models.CharField(max_length=20, choices=BackupType.choices)
    
    # Storage
    storage_path = models.CharField(max_length=500)  # S3 URL or local path
    encrypted = models.BooleanField(default=True)
    size_bytes = models.BigIntegerField()
    
    # Contents
    includes_tor_keys = models.BooleanField(default=False)
    includes_smp_config = models.BooleanField(default=False)
    includes_xftp_config = models.BooleanField(default=False)
    includes_xftp_files = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True)
```

---

## Backup & Recovery

### Critical: Tor Identity Keys

Your .onion address is derived from cryptographic keys stored on the server. **These keys ARE your identity:**

```
/var/lib/tor/simplex-smp/
├── hostname                    # Your .onion address (derived from keys)
├── hs_ed25519_public_key       # Public key
└── hs_ed25519_secret_key       # ⚠️  CRITICAL: Private key

/var/lib/tor/simplex-xftp/
├── hostname
├── hs_ed25519_public_key
└── hs_ed25519_secret_key       # ⚠️  CRITICAL: Private key
```

**If you lose these keys:**
- ❌ Your .onion address is **gone forever**
- ❌ All clients must reconfigure with new address
- ❌ No way to recover - Tor v3 keys are not reproducible

**ForgeX Backup automatically includes:**
- ✅ All Tor identity keys (encrypted)
- ✅ SMP server configuration
- ✅ XFTP server configuration
- ✅ SimpleX fingerprints

### Backup Playbook

```yaml
# playbooks/backup_server.yml
---
- name: Full Server Backup (including Tor Keys)
  hosts: all
  become: yes
  vars:
    backup_dir: "/tmp/forgex-backup-{{ ansible_date_time.iso8601_basic_short }}"
    
  tasks:
    - name: Create backup directory
      ansible.builtin.file:
        path: "{{ backup_dir }}"
        state: directory
        mode: '0700'

    # === CRITICAL: Tor Identity Keys ===
    - name: Backup Tor Hidden Service keys (SMP)
      ansible.builtin.copy:
        src: /var/lib/tor/simplex-smp/
        dest: "{{ backup_dir }}/tor-smp/"
        remote_src: yes
        mode: preserve
      when: deployment_mode == 'tor_hidden'

    - name: Backup Tor Hidden Service keys (XFTP)
      ansible.builtin.copy:
        src: /var/lib/tor/simplex-xftp/
        dest: "{{ backup_dir }}/tor-xftp/"
        remote_src: yes
        mode: preserve
      when: deployment_mode == 'tor_hidden'

    - name: Backup Tor SSH keys (if enabled)
      ansible.builtin.copy:
        src: /var/lib/tor/ssh/
        dest: "{{ backup_dir }}/tor-ssh/"
        remote_src: yes
        mode: preserve
      when: ssh_over_tor_enabled | default(false)

    # === SimpleX Configuration ===
    - name: Backup SMP configuration
      ansible.builtin.copy:
        src: /etc/opt/simplex/
        dest: "{{ backup_dir }}/smp-config/"
        remote_src: yes
        mode: preserve

    - name: Backup XFTP configuration
      ansible.builtin.copy:
        src: /etc/opt/simplex-xftp/
        dest: "{{ backup_dir }}/xftp-config/"
        remote_src: yes
        mode: preserve

    # === Create Archive ===
    - name: Create encrypted backup archive
      ansible.builtin.archive:
        path: "{{ backup_dir }}"
        dest: "/tmp/forgex-backup-{{ inventory_hostname }}.tar.gz"
        format: gz

    - name: Fetch backup to ForgeX server
      ansible.builtin.fetch:
        src: "/tmp/forgex-backup-{{ inventory_hostname }}.tar.gz"
        dest: "{{ local_backup_path }}/"
        flat: yes

    - name: Cleanup remote backup files
      ansible.builtin.file:
        path: "{{ item }}"
        state: absent
      loop:
        - "{{ backup_dir }}"
        - "/tmp/forgex-backup-{{ inventory_hostname }}.tar.gz"
```

---

## Tor Integration

### Ansible Playbook: Setup Tor Hidden Service

```yaml
# playbooks/setup_tor_onion.yml
---
- name: Setup Tor Hidden Service for SimpleX (Home Server Mode)
  hosts: all
  become: yes
  vars:
    tor_repo_key: "https://deb.torproject.org/torproject.org/A3C4F0F979CAA22CDBA8F512EE8CBC9E886DDD89.asc"
    
  tasks:
    - name: Add Tor Project GPG key
      ansible.builtin.get_url:
        url: "{{ tor_repo_key }}"
        dest: /usr/share/keyrings/tor-archive-keyring.gpg
        mode: '0644'

    - name: Add Tor Project repository (Debian/Ubuntu)
      ansible.builtin.apt_repository:
        repo: "deb [signed-by=/usr/share/keyrings/tor-archive-keyring.gpg] https://deb.torproject.org/torproject.org {{ ansible_distribution_release }} main"
        filename: tor
        state: present
      when: ansible_os_family == 'Debian'

    - name: Install Tor
      ansible.builtin.package:
        name:
          - tor
          - torsocks
        state: present

    # === DUAL TOR ARCHITECTURE ===
    
    - name: Create tor@tor2 instance for SOCKS proxy
      ansible.builtin.command:
        cmd: tor-instance-create tor2
        creates: /etc/tor/instances/tor2/torrc

    - name: Configure tor@tor2 (SOCKS only)
      ansible.builtin.copy:
        content: |
          # SOCKS Proxy for SMP Private Routing
          Log notice syslog
          SocksPort 9050
        dest: /etc/tor/instances/tor2/torrc
        mode: '0644'
      notify: Restart tor@tor2

    - name: Configure tor@default (Hidden Services only)
      ansible.builtin.template:
        src: torrc-hidden-services.j2
        dest: /etc/tor/torrc
        mode: '0644'
      notify: Restart tor@default

    - name: Enable and start both Tor instances
      ansible.builtin.systemd:
        name: "{{ item }}"
        enabled: yes
        state: started
      loop:
        - tor@default
        - tor@tor2

    - name: Wait for Hidden Service hostnames
      ansible.builtin.wait_for:
        path: "/var/lib/tor/simplex-smp/hostname"
        timeout: 60

    - name: Read onion addresses
      ansible.builtin.slurp:
        src: "/var/lib/tor/{{ item }}/hostname"
      register: onion_addresses
      loop:
        - simplex-smp
        - simplex-xftp

  handlers:
    - name: Restart tor@default
      ansible.builtin.systemd:
        name: tor@default
        state: restarted

    - name: Restart tor@tor2
      ansible.builtin.systemd:
        name: tor@tor2
        state: restarted
```

### Firewall Playbook (Tor-Only Mode)

```yaml
# playbooks/setup_firewall.yml
---
- name: Configure Firewall for Tor-Only Mode
  hosts: all
  become: yes
  
  tasks:
    # === UFW (Debian/Ubuntu) ===
    - name: Install UFW
      ansible.builtin.package:
        name: ufw
        state: present
      when: ansible_os_family == 'Debian'

    - name: Set UFW defaults
      community.general.ufw:
        direction: "{{ item.direction }}"
        policy: "{{ item.policy }}"
      loop:
        - { direction: 'incoming', policy: 'deny' }
        - { direction: 'outgoing', policy: 'allow' }
      when: ansible_os_family == 'Debian'

    - name: Allow SSH (temporary, for initial setup)
      community.general.ufw:
        rule: allow
        port: '22'
        proto: tcp
        comment: 'SSH - remove after enabling SSH over Tor'
      when: 
        - ansible_os_family == 'Debian'
        - not ssh_over_tor_enabled | default(false)

    - name: Block clearnet access to SMP (Tor-only)
      community.general.ufw:
        rule: deny
        port: '5223'
        proto: tcp
        comment: 'SMP - Tor only, no clearnet'
      when: 
        - ansible_os_family == 'Debian'
        - deployment_mode == 'tor_hidden'

    - name: Block clearnet access to XFTP (Tor-only)
      community.general.ufw:
        rule: deny
        port: '443'
        proto: tcp
        comment: 'XFTP - Tor only, no clearnet'
      when: 
        - ansible_os_family == 'Debian'
        - deployment_mode == 'tor_hidden'

    - name: Allow localhost (for Tor → Services)
      community.general.ufw:
        rule: allow
        interface: lo
        direction: in
      when: ansible_os_family == 'Debian'

    - name: Enable UFW
      community.general.ufw:
        state: enabled
      when: ansible_os_family == 'Debian'

    # === NFTABLES (Alternative for RPi) ===
    - name: Deploy nftables config (Raspberry Pi)
      ansible.builtin.template:
        src: nftables-tor-only.conf.j2
        dest: /etc/nftables.conf
        mode: '0644'
      when: 
        - ansible_os_family == 'Debian'
        - "'raspberry' in ansible_kernel | lower or 'rpi' in ansible_hostname | lower"
      notify: Reload nftables

  handlers:
    - name: Reload nftables
      ansible.builtin.systemd:
        name: nftables
        state: restarted
```

### Dynamic Binary Download (Architecture-Aware)

```yaml
# playbooks/install_smp.yml (excerpt)
---
- name: Install SimpleX SMP Server
  hosts: all
  become: yes
  vars:
    simplex_version: "6.4.4"
    simplex_channel: "stable"  # or "beta" for 6.5.x
    
    # Architecture mapping
    arch_map:
      x86_64: "x86-64"
      aarch64: "aarch64"
    
    # Ubuntu version for binary compatibility
    ubuntu_version_map:
      "12": "22_04"  # Debian 12 → Ubuntu 22.04 compatible
      "22.04": "22_04"
      "24.04": "24_04"
  
  tasks:
    - name: Determine binary architecture
      ansible.builtin.set_fact:
        binary_arch: "{{ arch_map[ansible_architecture] | default('x86-64') }}"
        binary_ubuntu: "{{ ubuntu_version_map[ansible_distribution_version] | default('22_04') }}"

    - name: Download SMP server binary
      ansible.builtin.get_url:
        url: "https://github.com/simplex-chat/simplexmq/releases/download/v{{ simplex_version }}/smp-server-ubuntu-{{ binary_ubuntu }}-{{ binary_arch }}"
        dest: /usr/local/bin/smp-server
        mode: '0755'
        checksum: "sha256:{{ smp_checksum }}"  # From GitHub release

    - name: Download XFTP server binary
      ansible.builtin.get_url:
        url: "https://github.com/simplex-chat/simplexmq/releases/download/v{{ simplex_version }}/xftp-server-ubuntu-{{ binary_ubuntu }}-{{ binary_arch }}"
        dest: /usr/local/bin/xftp-server
        mode: '0755'
        checksum: "sha256:{{ xftp_checksum }}"

    - name: Verify binary works
      ansible.builtin.command:
        cmd: "{{ item }} -v"
      loop:
        - /usr/local/bin/smp-server
        - /usr/local/bin/xftp-server
      changed_when: false
```

---

## API Endpoints

```yaml
Base URL: /api/v1/forgex/

# Servers
GET    /servers/                    # List all servers
POST   /servers/                    # Add new server
GET    /servers/{id}/               # Get server details
PATCH  /servers/{id}/               # Update server
DELETE /servers/{id}/               # Remove server
POST   /servers/{id}/test/          # Test SSH connection
GET    /servers/{id}/health/        # Health check
GET    /servers/{id}/addresses/     # Get SMP/XFTP addresses for clients

# Deployment Actions
POST   /servers/{id}/deploy/        # Full deployment (SMP + XFTP + Tor)
POST   /servers/{id}/install/smp/   # Install SMP only
POST   /servers/{id}/install/xftp/  # Install XFTP only
POST   /servers/{id}/setup-tor/     # Setup Tor Hidden Services
POST   /servers/{id}/update/        # Update to latest version
POST   /servers/{id}/service/       # start/stop/restart

# Backup & Restore
POST   /servers/{id}/backup/        # Create backup (includes Tor keys!)
POST   /servers/{id}/backup/tor-keys/ # Backup Tor keys only
GET    /servers/{id}/backups/       # List backups for server
POST   /servers/{id}/restore/       # Restore from backup
DELETE /backups/{backup_id}/        # Delete backup

# SSH Keys
GET    /keys/                       # List SSH keys
POST   /keys/                       # Add new key
POST   /keys/generate/              # Generate key pair
DELETE /keys/{id}/                  # Delete key

# Deployments & Audit
GET    /deployments/                # List deployments
GET    /deployments/{id}/           # Deployment details
GET    /audit/                      # Audit logs
```

---

## Configuration

### Django Settings

```python
FORGEX_CONFIG = {
    'SSH_TIMEOUT': 30,
    'ANSIBLE_FORKS': 5,
    'PLAYBOOK_DIR': BASE_DIR / 'forgex' / 'playbooks',
    'ENCRYPTION_KEY': env('FORGEX_ENCRYPTION_KEY'),
    
    # SimpleX Versions (January 2026)
    'SIMPLEX_STABLE_VERSION': '6.4.4',
    'SIMPLEX_BETA_VERSION': '6.5.0-beta.3',
    'SIMPLEX_MIN_VERSION': '6.3.0',
    'SIMPLEX_DEFAULT_CHANNEL': 'stable',  # 'stable' or 'beta'
    
    # Tor Settings
    'TOR_WATCHDOG_INTERVAL': 300,  # 5 minutes
    'TOR_HIDDEN_SERVICE_TIMEOUT': 60,
    
    # Backup Settings
    'BACKUP_ENCRYPTION_ENABLED': True,
    'BACKUP_INCLUDE_TOR_KEYS': True,  # CRITICAL!
    'BACKUP_STORAGE': 'local',  # 'local', 's3', 'rclone'
    'BACKUP_S3_BUCKET': env('FORGEX_BACKUP_S3_BUCKET', default=''),
    
    # Default deployment mode
    'DEFAULT_DEPLOYMENT_MODE': 'tor_hidden',  # Home Server by default
    'DEFAULT_SSH_OVER_TOR': True,  # Secure admin by default
}
```

---

## Development Roadmap

### Phase 1: Foundation (Weeks 1-2) ✅
- [x] Django app structure
- [x] Models with deployment modes
- [x] REST API & serializers
- [x] SSH key encryption
- [x] Frontend: ForgeX page with tabs

### Phase 2: Deployment Engine (Weeks 3-4)
- [ ] Celery + Ansible Runner integration
- [ ] WebSocket progress consumer
- [ ] **🏠 Home Server Mode (Tor Hidden Service)**
- [ ] **Dual Tor Architecture setup**
- [ ] **SSH over Tor (default for Home Mode)**
- [ ] **Tor Watchdog auto-recovery**
- [ ] **Firewall auto-configuration (ufw/nftables)**
- [ ] Installation playbooks (SMP, XFTP)
- [ ] **Backup/Restore with Tor keys** ⚠️ CRITICAL
- [ ] Dynamic binary download (architecture-aware)
- [ ] Fail2ban integration

### Phase 3: Advanced (Weeks 5-6)
- [ ] Server hardening playbook
- [ ] Multi-server deployments
- [ ] Configuration templates (Privacy-Max, Raspberry-Pi, etc.)
- [ ] Log streaming (journalctl)
- [ ] Web terminal (xterm.js)
- [ ] Circuit isolation (ControlPort 9051)

### Phase 4: Polish (Weeks 7-8)
- [ ] Scheduled maintenance tasks
- [ ] Alerting system
- [ ] Mobile-responsive UI
- [ ] Version auto-check (GitHub API)
- [ ] Comprehensive testing
- [ ] Documentation

---

## Security Checklist

### Before Deployment
- [ ] FORGEX_ENCRYPTION_KEY set and backed up
- [ ] All SSH keys passphrase-protected
- [ ] HTTPS enforced on ForgeX dashboard
- [ ] Audit logging active

### Home Server Mode (Tor)
- [ ] Dual Tor Architecture configured
- [ ] Tor Watchdog enabled
- [ ] Firewall blocks clearnet access to SMP/XFTP
- [ ] SSH over Tor enabled (no clearnet SSH)
- [ ] .onion addresses documented securely
- [ ] **⚠️ Tor identity keys backed up!**
- [ ] Backup encryption enabled

### Public Server Mode
- [ ] Dedicated user (forgex-deploy)
- [ ] Limited sudo rights
- [ ] Firewall configured (5223/tcp, 443/tcp)
- [ ] Fail2ban installed
- [ ] IPv6 enabled (if available)

---

## Use Cases

### 🏠 Home Server with Starlink

```
Problem:  Starlink uses CGNAT, no port forwarding possible
Solution: ForgeX Home Server Mode with Tor Hidden Service

Result:
- .onion address works worldwide
- No router configuration needed
- ISP (Starlink) only sees Tor traffic
- Server location completely hidden

Cost: ~€80 (Raspberry Pi 4 + accessories)
Power: ~5W (runs 24/7 for pennies)
```

### 🔒 Privacy-Focused Family Server

```
Problem:  Want private messaging for family, don't trust public servers
Solution: Raspberry Pi 4 + ForgeX Home Server Mode

Result:
- All family messages stay on YOUR hardware
- No third party sees any metadata
- Automatic backups protect your .onion identity
- Kids can't accidentally expose the server IP
```

### 🏢 Small Business / Team

```
Problem:  Need secure team communication, compliance requirements
Solution: ForgeX on dedicated server or VPS

Result:
- Full audit trail of all deployments
- Encrypted backups to company S3
- Centralized management dashboard
- Compliance-friendly documentation
```

---

## References

- [SimpleX Chat GitHub](https://github.com/simplex-chat/simplex-chat)
- [SimpleXMQ Releases](https://github.com/simplex-chat/simplexmq/releases)
- [SimpleX Server Docs](https://simplex.chat/docs/server.html)
- [Tor Project](https://www.torproject.org/)
- [Tor Hidden Services Spec](https://gitweb.torproject.org/torspec.git/tree/rend-spec-v3.txt)
- [Ansible Documentation](https://docs.ansible.com/)
- [cannatoshi's Raspberry Pi Guide](https://github.com/cannatoshi/simplex-smp-xftp-via-tor-on-rpi-hardened)

---

## Credits

Special thanks to:
- **SimpleX Team** for the amazing privacy-focused messaging protocol
- **cannatoshi** for the battle-tested Raspberry Pi + Tor deployment guide
- **Tor Project** for making anonymous services possible
- **Grok** for the thorough documentation reviews 😄

---

*Documentation Version: 2.1.0*  
*Last Updated: 2026-01-18*  
*SimpleX Versions: 6.4.4 (stable) / 6.5.0-beta.3 (beta)*  
*Author: cannatoshi*

---

> *"The best hiding place is one nobody knows exists."*  
> *"Two Tors are better than one."* 🧅🧅