# ChutneX Analytics - Development Guide

> **Entwicklungsdokumentation für das ChutneX Analytics Frontend**  
> Status: Active Development | Version: 0.1.12-alpha  
> Letzte Aktualisierung: 14.01.2026

---

## 📋 Inhaltsverzeichnis

1. [Übersicht](#1-übersicht)
2. [Architektur](#2-architektur)
3. [Entwicklungsstand](#3-entwicklungsstand)
4. [Seitenübersicht](#4-seitenübersicht)
5. [Datenquellen](#5-datenquellen)
6. [Backend-Entwicklung](#6-backend-entwicklung)
7. [Zusatzsoftware](#7-zusatzsoftware)
8. [Workflow-Richtlinien](#8-workflow-richtlinien)
9. [Bekannte Probleme](#9-bekannte-probleme)
10. [To-Do Liste](#10-to-do-liste)
11. [Changelog](#11-changelog)

---

## 1. Übersicht

### 1.1 Was ist ChutneX Analytics?

ChutneX Analytics ist eine umfassende **Forensik- und Analyse-Suite** für private Tor-Netzwerke. Sie bietet:

- **120 Features** in 12 Kategorien
- **Real-time Monitoring** mit WebSocket-Updates
- **Forensik-Tools** für Timing-Korrelation und Traffic-Analyse
- **Visualisierungen** mit Recharts (Area, Bar, Line, Radar, Scatter)
- **i18n Support** (Deutsch/Englisch)
- **Neon Blue Design** (#88CED0) durchgängig

### 1.2 Entwicklungsstrategie

```
┌─────────────────────────────────────────────────────────────────┐
│                 ENTWICKLUNGSPHASEN                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PHASE 1: Frontend First (AKTUELL)                              │
│  ├── UI-Komponenten mit Mock/Demo-Daten                         │
│  ├── Alle Seiten layouten und stylen                            │
│  ├── i18n für alle Texte                                        │
│  └── Navigation und Routing                                     │
│                                                                 │
│  PHASE 2: Backend Integration                                   │
│  ├── API-Endpoints für echte Daten                              │
│  ├── stem (Tor Control Port) Integration                        │
│  ├── Datenbank-Modelle für Forensik                             │
│  └── WebSocket für Live-Updates                                 │
│                                                                 │
│  PHASE 3: Zusatzsoftware                                        │
│  ├── tcpdump/tshark für Packet Capture                          │
│  ├── Zeek für Protocol Analysis                                 │
│  ├── Suricata für IDS/Alerts                                    │
│  └── Neo4j für Graph-Datenbank                                  │
│                                                                 │
│  PHASE 4: Enterprise Features                                   │
│  ├── ML-basierte Anomalie-Erkennung                             │
│  ├── Automatisierte Reports                                     │
│  ├── Prometheus/Grafana Integration                             │
│  └── Multi-Network Vergleiche                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Architektur

### 2.1 Frontend-Stack

| Technologie | Version | Verwendung |
|-------------|---------|------------|
| React | 18.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 5.x | Build Tool |
| React Router | 6.x | Navigation |
| Recharts | 2.x | Charts/Visualisierungen |
| react-i18next | 14.x | Internationalisierung |
| Tailwind CSS | 3.x | Styling (nur Core Classes) |
| Lucide React | 0.x | Icons |

### 2.2 Datei-Struktur

```
frontend/src/
├── api/
│   └── chutney_analytics.ts      # API Client für Analytics
│
├── components/
│   └── navigation/
│       └── ChutneXMegaMenu.tsx   # Hauptnavigation (120 Items)
│
├── pages/
│   └── chutney/
│       ├── analytics/
│       │   └── AnalyticsDashboard.tsx  # Haupt-Dashboard
│       ├── nodes/
│       │   ├── NodeGridPage.tsx        # Node-Übersicht
│       │   └── NodeBandwidthPage.tsx   # Node-Bandbreite
│       ├── circuits/
│       │   ├── CircuitsListPage.tsx    # Circuit-Liste
│       │   ├── CircuitDetailPage.tsx   # Circuit-Details
│       │   ├── CircuitPathPage.tsx     # Pfad-Visualisierung
│       │   ├── CircuitStatsPage.tsx    # Statistiken
│       │   ├── CircuitFiltersPage.tsx  # Filter-Builder
│       │   └── CircuitEventsPage.tsx   # Event-Log
│       ├── traffic/
│       │   ├── TrafficOverviewPage.tsx # Traffic-Übersicht
│       │   └── BandwidthChartPage.tsx  # Bandbreiten-Charts
│       └── forensics/
│           └── ForensicsOverviewPage.tsx # Forensik-Dashboard
│
├── i18n/
│   ├── index.ts                  # i18n Konfiguration
│   └── locales/
│       ├── de.json               # Deutsche Übersetzungen
│       └── en.json               # Englische Übersetzungen
│
└── App.tsx                       # Router-Konfiguration
```

### 2.3 Design-System

```css
/* Neon Blue Theme */
--neon-primary: #88CED0;
--neon-dim: rgba(136, 206, 208, 0.1);
--neon-medium: rgba(136, 206, 208, 0.2);
--neon-bright: rgba(136, 206, 208, 0.4);

/* Chart Colors */
--chart-1: #88CED0;
--chart-2: #6BB8BA;
--chart-3: #A5DFE1;
--chart-4: #4FA3A5;
--chart-5: #C2EDEF;
--chart-6: #3D8B8D;

/* Status Colors */
--status-success: #34d399;
--status-warning: #fbbf24;
--status-error: #f87171;

/* Background */
--bg-dark: #0f172a;
--bg-card: rgba(30, 41, 59, 0.5);
--border: rgba(51, 65, 85, 0.5);
```

---

## 3. Entwicklungsstand

### 3.1 Fertige Komponenten ✅

| Komponente | Status | Daten | i18n |
|------------|--------|-------|------|
| ChutneXMegaMenu | ✅ Fertig | - | ✅ DE/EN |
| AnalyticsDashboard | ✅ Fertig | Echt + Mock | ✅ DE/EN |
| NodeGridPage | ✅ Fertig | Echt | ✅ DE/EN |
| NodeBandwidthPage | ✅ Fertig | Echt | ✅ DE/EN |
| CircuitsListPage | ✅ Fertig | Echt | ✅ DE/EN |
| CircuitDetailPage | ✅ Fertig | Echt | ✅ DE/EN |
| CircuitPathPage | ✅ Fertig | Echt | ✅ DE/EN |
| CircuitStatsPage | ✅ Fertig | Echt | ✅ DE/EN |
| CircuitFiltersPage | ✅ Fertig | Echt | ✅ DE/EN |
| CircuitEventsPage | ✅ Fertig | Echt | ✅ DE/EN |
| TrafficOverviewPage | ✅ Fertig | Echt | ✅ DE/EN |
| BandwidthChartPage | ✅ Fertig | Echt | ✅ DE/EN |
| ForensicsOverviewPage | ✅ Fertig | **MOCK** | ✅ DE/EN |

### 3.2 In Entwicklung 🔧

| Komponente | Status | Nächste Schritte |
|------------|--------|------------------|
| CapturesListPage | 🔧 Geplant | UI erstellen |
| CaptureDetailPage | 🔧 Geplant | UI erstellen |
| TimingCorrelationPage | 🔧 Geplant | Backend zuerst |
| TrafficPatternsPage | 🔧 Geplant | Backend zuerst |
| CellAnalysisPage | 🔧 Geplant | Backend zuerst |

### 3.3 Noch nicht begonnen 📋

- Visualization Sektion (10 Seiten)
- Integration Sektion (10 Seiten)
- Reports Sektion (10 Seiten)
- Analytics Sektion (10 Seiten)
- Settings Sektion (10 Seiten)

---

## 4. Seitenübersicht

### 4.1 MegaMenu Kategorien (120 Features)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHUTNEX MEGA MENU                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  OVERVIEW (10)          NODES (10)           CIRCUITS (10)      │
│  ├── Network List ✅    ├── Node Grid ✅     ├── Circuits List ✅│
│  ├── Network Details ✅ ├── Node Detail      ├── Circuit Card ✅ │
│  ├── Analytics ✅       ├── Node Bandwidth ✅├── Circuit Path ✅ │
│  ├── New Network ✅     ├── Node Flags       ├── Circuit Stats ✅│
│  ├── Edit Network ✅    ├── Node Identity    ├── Circuit Filter✅│
│  ├── Health Monitor     ├── Node Ports       ├── Circuit Events✅│
│  ├── Activity Feed      ├── Node Compare     ├── Circuit Builder│
│  ├── System Status      ├── Node History     ├── Circuit Timeline│
│  ├── Quick Actions      ├── Node Search      ├── Circuit Compare│
│  └── Getting Started    └── Node Export      └── Circuit Export │
│                                                                 │
│  TRAFFIC (10)           FORENSICS (10)       VISUALIZATION (10) │
│  ├── Traffic Overview ✅├── Forensics ✅     ├── Network Topology│
│  ├── Bandwidth Chart ✅ ├── Timing Corr.     ├── Circuit Flow   │
│  ├── Captures List      ├── Traffic Patterns ├── Bandwidth Heat │
│  ├── Capture Card       ├── Cell Analysis    ├── 3D Globe       │
│  ├── Packet Analysis    ├── Fingerprinting   ├── Traffic Anim.  │
│  ├── Flow Analysis      ├── Attack Detection ├── Timeline View  │
│  ├── Live Capture       ├── Anomaly Scanner  ├── Geo Map        │
│  ├── Traffic Heatmap    ├── Deep Inspection  ├── Sankey Diagram │
│  ├── Protocol Stats     ├── Correlation Eng. ├── Force Graph    │
│  └── Traffic Export     └── Forensics Report └── Realtime Canvas│
│                                                                 │
│  INTEGRATION (10)       REPORTS (10)         ANALYTICS (10)     │
│  ├── Integration Hub    ├── Report Generator ├── Analytics Dash │
│  ├── Zeek Logs          ├── Export PDF       ├── Realtime Metrics│
│  ├── Suricata Alerts    ├── Export CSV       ├── Historical Data│
│  ├── Arkime PCAP        ├── Export JSON      ├── Trend Analysis │
│  ├── Neo4j Graph        ├── Report Templates ├── Custom Dashboards│
│  ├── MISP Threat Intel  ├── Scheduled Reports├── KPI Tracking   │
│  ├── Elasticsearch      ├── Email Delivery   ├── Predictive     │
│  ├── Grafana Dashboards ├── Report History   ├── Data Explorer  │
│  ├── Splunk SIEM        ├── Custom Branding  ├── Performance    │
│  └── Webhook API        └── Compliance       └── Usage Stats    │
│                                                                 │
│  SETTINGS (10)                                                  │
│  ├── Network Settings   ├── Notifications    ├── Audit Logs     │
│  ├── Capture Config     ├── Backup & Restore ├── System Info    │
│  ├── Alert Rules        ├── Access Control                      │
│  ├── API Configuration  ├── User Preferences                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

✅ = Implementiert | Ohne Symbol = Geplant (SOON Badge)
```

### 4.2 Badge-System

| Badge | Bedeutung | Farbe |
|-------|-----------|-------|
| LIVE | Produktionsreif | Cyan/Neon |
| ALPHA | Funktioniert, evtl. Bugs | Cyan gedimmt |
| BETA | In Testphase | Lila |
| PRO | Enterprise Feature | Orange |
| SOON | Noch nicht implementiert | Grau |

---

## 5. Datenquellen

### 5.1 Echte Daten (von API)

Diese Daten kommen direkt von der `analyticsApi`:

```typescript
// api/chutney_analytics.ts
export interface NetworkAnalytics {
  network_id: string;
  network_name: string;
  status: string;
  nodes: {
    total: number;
    by_type: Record<string, number>;
    stats: NodeStats[];  // ✅ ECHTE DATEN
  };
  circuits: {
    total: number;
    by_status: Record<string, number>;
    circuits: CircuitInfo[];  // ✅ ECHTE DATEN
  };
  bandwidth: {
    total_bytes_read: number;    // ✅ ECHTE DATEN
    total_bytes_written: number; // ✅ ECHTE DATEN
    by_node_type: Record<string, {read: number, written: number}>;
  };
}
```

**Echte Daten verfügbar für:**
- Node-Statistiken (Name, Typ, Fingerprint, Bandbreite)
- Circuit-Informationen (ID, Status, Path, Nodes)
- Bandbreiten-Metriken (Read/Write pro Node)
- Netzwerk-Status und Konfiguration

### 5.2 Mock/Demo-Daten

**⚠️ WICHTIG:** Folgende Daten sind aktuell **simuliert** und werden mit `Math.random()` generiert:

```typescript
// ForensicsOverviewPage.tsx - MOCK DATEN
const newEntry = {
  entryLatency: Math.random() * 50 + 10,      // 🎭 MOCK
  exitLatency: Math.random() * 80 + 20,        // 🎭 MOCK
  correlation: Math.random() * 0.3,            // 🎭 MOCK
  anomalyScore: Math.random() * 100,           // 🎭 MOCK
  packetCount: Math.floor(Math.random() * 1000) + 500, // 🎭 MOCK
};

// Ebenfalls MOCK:
const timingAnomalies = Math.floor(Math.random() * 5);
const patternMatches = Math.floor(Math.random() * 12);
const suspiciousFlows = Math.floor(Math.random() * 3);
```

**Hardcoded Demo-Daten:**
- Investigation Queue Items (INV-001, INV-002, etc.)
- Security Radar Scores (75, 82, 45, etc.)
- Threat Level Indicators
- Scatter Plot für Korrelation

### 5.3 Was für echte Daten benötigt wird

| Feature | Benötigt | Status |
|---------|----------|--------|
| Timing Correlation | stem CIRC Events | 🔧 Machbar |
| Entry/Exit Latency | Circuit Timestamps | 🔧 Machbar |
| Anomaly Score | Statistische Analyse | 🔧 Machbar |
| Packet Capture | tcpdump/tshark | 📦 Zusatzsoftware |
| Cell Analysis | Tor Cell Parser | 📦 Zusatzsoftware |
| Pattern Detection | ML/Regex Engine | 📦 Zusatzsoftware |

---

## 6. Backend-Entwicklung

### 6.1 Vorhandene Infrastruktur

```python
# Was bereits installiert ist:
- stem (Python Tor Controller) ✅
- Docker Python SDK ✅
- Django REST Framework ✅
- Channels (WebSocket) ✅
- Redis (Cache/Pub-Sub) ✅
```

### 6.2 Geplante API-Endpoints

```python
# Neue Endpoints für Forensik

# Timing Correlation
GET  /api/v1/chutney/networks/{id}/forensics/timing/
POST /api/v1/chutney/networks/{id}/forensics/timing/start/
GET  /api/v1/chutney/networks/{id}/forensics/timing/results/

# Traffic Analysis
GET  /api/v1/chutney/networks/{id}/forensics/traffic/patterns/
GET  /api/v1/chutney/networks/{id}/forensics/traffic/anomalies/

# Circuit Events (Live)
WS   /ws/chutney/{network_id}/circuits/

# Packet Capture
POST /api/v1/chutney/networks/{id}/capture/start/
POST /api/v1/chutney/networks/{id}/capture/stop/
GET  /api/v1/chutney/networks/{id}/captures/
GET  /api/v1/chutney/networks/{id}/captures/{capture_id}/
```

### 6.3 Geplante Django Models

```python
# chutney/models.py - Neue Models

class TimingCorrelation(models.Model):
    """Timing-Korrelations-Analyse Ergebnisse"""
    network = models.ForeignKey(TorNetwork, on_delete=models.CASCADE)
    circuit_id = models.CharField(max_length=20)
    entry_node = models.ForeignKey(TorNode, related_name='entry_correlations')
    exit_node = models.ForeignKey(TorNode, related_name='exit_correlations')
    entry_timestamp = models.DateTimeField()
    exit_timestamp = models.DateTimeField()
    latency_ms = models.FloatField()
    correlation_score = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

class TrafficCapture(models.Model):
    """Packet Capture Session"""
    network = models.ForeignKey(TorNetwork, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    status = models.CharField(max_length=20)  # running, stopped, completed
    pcap_file = models.FileField(upload_to='captures/')
    started_at = models.DateTimeField()
    stopped_at = models.DateTimeField(null=True)
    packet_count = models.IntegerField(default=0)
    bytes_captured = models.BigIntegerField(default=0)

class ForensicsAlert(models.Model):
    """Forensik-Warnung"""
    network = models.ForeignKey(TorNetwork, on_delete=models.CASCADE)
    alert_type = models.CharField(max_length=50)  # timing, pattern, anomaly
    severity = models.CharField(max_length=20)  # low, medium, high, critical
    title = models.CharField(max_length=200)
    description = models.TextField()
    data = models.JSONField(default=dict)
    status = models.CharField(max_length=20)  # open, reviewing, closed
    created_at = models.DateTimeField(auto_now_add=True)
```

### 6.4 stem Integration (Phase 1)

```python
# chutney/services/forensics_service.py

from stem import CircStatus, StreamStatus
from stem.control import Controller, EventType

class ForensicsService:
    """
    Forensik-Service mit stem für Tor Control Port.
    
    Was JETZT schon möglich ist (ohne Zusatzsoftware):
    """
    
    def __init__(self, controller: Controller):
        self.controller = controller
        self.circuit_events = []
        self.stream_events = []
    
    def start_timing_analysis(self):
        """
        Startet Timing-Analyse durch Circuit Event Monitoring.
        """
        def circuit_handler(event):
            self.circuit_events.append({
                'timestamp': datetime.now(),
                'circuit_id': event.id,
                'status': str(event.status),
                'path': event.path,
                'build_flags': event.build_flags,
                'purpose': event.purpose,
            })
        
        self.controller.add_event_listener(
            circuit_handler, 
            EventType.CIRC
        )
    
    def get_timing_correlation(self, window_seconds=60):
        """
        Berechnet Timing-Korrelation aus Circuit-Events.
        """
        recent = [e for e in self.circuit_events 
                  if (datetime.now() - e['timestamp']).seconds < window_seconds]
        
        # Korrelationsanalyse
        correlations = []
        for event in recent:
            if event['status'] == 'BUILT':
                build_time = self._calculate_build_time(event)
                correlations.append({
                    'circuit_id': event['circuit_id'],
                    'build_time_ms': build_time,
                    'path_length': len(event['path']),
                })
        
        return correlations
    
    def get_bandwidth_events(self):
        """Bandwidth Events für Live-Monitoring."""
        return self.controller.get_info('bw-event-cache', None)
    
    def get_circuit_stats(self):
        """Aktuelle Circuit-Statistiken."""
        circuits = []
        for circ in self.controller.get_circuits():
            circuits.append({
                'id': circ.id,
                'status': str(circ.status),
                'purpose': circ.purpose,
                'path': [(fp, nick) for fp, nick in circ.path],
                'created': getattr(circ, 'created', None),
            })
        return circuits
```

---

## 7. Zusatzsoftware

### 7.1 Phase 1: Basis (Keine Installation nötig)

| Tool | Status | Verwendung |
|------|--------|------------|
| stem | ✅ Installiert | Tor Control Port |
| Docker SDK | ✅ Installiert | Container Management |
| Recharts | ✅ Installiert | Visualisierungen |

**Was damit möglich ist:**
- Timing Correlation (Circuit Events)
- Basic Anomaly Detection (statistische Outliers)
- Bandwidth Monitoring (pro Node/Circuit)
- Circuit Path Analysis

### 7.2 Phase 2: Packet Capture

```bash
# Installation (meist schon vorhanden)
sudo apt install tcpdump tshark

# Oder in Docker Container
apt-get update && apt-get install -y tcpdump tshark
```

| Tool | Verwendung | Priority |
|------|------------|----------|
| tcpdump | Raw Packet Capture | HIGH |
| tshark | Wireshark CLI, Protocol Analysis | HIGH |
| editcap | PCAP Manipulation | MEDIUM |

**Was damit möglich ist:**
- PCAP Capture aller Tor-Zellen
- Packet Size Distribution Analysis
- Inter-Packet Timing
- Traffic Volume Correlation

### 7.3 Phase 3: Protocol Analysis

```bash
# Zeek Installation
echo 'deb http://download.opensuse.org/repositories/security:/zeek/xUbuntu_22.04/ /' | \
    sudo tee /etc/apt/sources.list.d/security:zeek.list
sudo apt update && sudo apt install zeek

# Suricata Installation
sudo apt install suricata
sudo suricata-update
```

| Tool | Verwendung | Priority |
|------|------------|----------|
| Zeek | Deep Protocol Analysis | MEDIUM |
| Suricata | IDS/IPS, Alert Rules | MEDIUM |

**Was damit möglich ist:**
- Tor Protocol Parsing
- Custom Detection Rules
- Automated Alerts
- Traffic Classification

### 7.4 Phase 4: Enterprise Stack

```bash
# Neo4j Installation
wget -O - https://debian.neo4j.com/neotechnology.gpg.key | sudo apt-key add -
echo 'deb https://debian.neo4j.com stable latest' | sudo tee /etc/apt/sources.list.d/neo4j.list
sudo apt update && sudo apt install neo4j

# Elasticsearch + Kibana
# Arkime (vormals Moloch)
```

| Tool | Verwendung | Priority |
|------|------------|----------|
| Neo4j | Graph Database für Circuits | LOW |
| Elasticsearch | Log Aggregation | LOW |
| Arkime | Full Packet Capture | LOW |
| Grafana | Dashboards | LOW |

---

## 8. Workflow-Richtlinien

### 8.1 Neue Seite erstellen

```bash
# 1. Seite erstellen
cat > frontend/src/pages/chutney/{category}/{PageName}Page.tsx << 'EOF'
// ... React Component mit:
// - useParams für networkId
// - useTranslation für i18n
// - analyticsApi für Daten
// - Neon Blue Theme
// - ResponsiveContainer für Charts
EOF

# 2. Übersetzungen hinzufügen
# frontend/src/i18n/locales/de.json
# frontend/src/i18n/locales/en.json

# 3. Route in App.tsx hinzufügen
# Import: const PageName = lazy(() => import('./pages/chutney/...'));
# Route: <Route path="tor-networks/:id/analytics/..." element={...} />

# 4. MegaMenu Badge updaten (SOON → ALPHA)
# frontend/src/components/navigation/ChutneXMegaMenu.tsx

# 5. Dokumentation updaten!
# docs/CHUTNEX_ANALYTICS.md
```

### 8.2 Commit-Konventionen

```bash
# Feature
git commit -m "feat(analytics): add ForensicsOverviewPage with timing charts"

# Fix
git commit -m "fix(routes): remove duplicate TrafficOverviewPage import"

# Docs
git commit -m "docs: update CHUTNEX_ANALYTICS.md with new pages"

# i18n
git commit -m "i18n: add German translations for forensics section"
```

### 8.3 Daten-Strategie

```
1. FRONTEND FIRST
   └── UI mit Mock-Daten bauen
   └── Layout und UX finalisieren
   └── i18n komplett

2. DANN BACKEND
   └── API-Endpoint erstellen
   └── Mock-Daten durch echte ersetzen
   └── WebSocket für Live-Updates

3. DOKUMENTATION
   └── Immer updaten nach Änderungen
   └── Mock vs Echt markieren
   └── Bekannte Issues notieren
```

### 8.4 Code-Qualität

```typescript
// Jede Seite sollte haben:

// 1. Type-Definitionen
interface PageProps { ... }

// 2. Constants am Anfang
const NEON = '#88CED0';
const REFRESH_INTERVALS = [...];

// 3. Helper Functions
const formatBytes = (bytes: number): string => { ... }

// 4. Custom Tooltip (wenn Charts)
const CustomTooltip = ({ active, payload, label }: any) => { ... }

// 5. Komponenten-Komposition
// StatCard, ChartCard, etc.

// 6. Hauptkomponente mit:
// - Loading State
// - Error State
// - Data Fetching mit useCallback
// - Auto-Refresh mit useEffect
// - Breadcrumb Navigation
// - Responsive Layout
```

---

## 9. Bekannte Probleme

### 9.1 App.tsx Duplikate

**Problem:** Bei `sed -i` Befehlen entstehen manchmal doppelte Imports oder Routes.

**Lösung:**
```bash
# Duplikate finden
grep -n "ComponentName" ~/simplex-smp-monitor/frontend/src/App.tsx

# Duplikat-Zeile löschen
sed -i 'Nd' ~/simplex-smp-monitor/frontend/src/App.tsx  # N = Zeilennummer
```

**Prävention:** Immer mit `grep -n` vorher prüfen ob schon existiert.

### 9.2 Route-Struktur kaputt

**Problem:** Route ohne schließendes Tag oder fehlendes Element.

**Symptom:**
```
Adjacent JSX elements must be wrapped in an enclosing tag
```

**Lösung:**
```bash
# Zeilen um Fehler anzeigen
sed -n '190,210p' frontend/src/App.tsx

# Kaputte Zeilen identifizieren und fixen
```

### 9.3 MegaMenu lädt langsam

**Problem:** Netzwerk-Dropdown lädt bei jedem Öffnen.

**Lösung:** Wird in späteren Versionen mit React Query / SWR caching gelöst.

### 9.4 Charts rendern nicht

**Problem:** ResponsiveContainer braucht feste Höhe vom Parent.

**Lösung:**
```tsx
// FALSCH:
<ResponsiveContainer>
  <LineChart ... />
</ResponsiveContainer>

// RICHTIG:
<div className="h-[300px]">
  <ResponsiveContainer width="100%" height="100%">
    <LineChart ... />
  </ResponsiveContainer>
</div>
```

---

## 10. To-Do Liste

### 10.1 Frontend (Phase 1) - Aktuell

#### Fertig ✅
- [x] ChutneXMegaMenu mit i18n
- [x] AnalyticsDashboard
- [x] NodeGridPage
- [x] NodeBandwidthPage
- [x] CircuitsListPage (alle 6 Seiten)
- [x] TrafficOverviewPage
- [x] BandwidthChartPage
- [x] ForensicsOverviewPage (mit Mock-Daten)

#### In Arbeit 🔧
- [ ] CapturesListPage
- [ ] CaptureDetailPage
- [ ] PacketAnalysisPage
- [ ] FlowAnalysisPage
- [ ] LiveCapturePage

#### Geplant 📋
- [ ] Visualization Sektion (10 Seiten)
- [ ] Integration Sektion (10 Seiten)
- [ ] Reports Sektion (10 Seiten)
- [ ] Settings Sektion (10 Seiten)

### 10.2 Backend (Phase 2)

#### Hoch Priorität
- [ ] ForensicsService mit stem
- [ ] Timing Correlation API
- [ ] Circuit Event WebSocket
- [ ] Anomaly Detection (statistisch)

#### Medium Priorität
- [ ] TrafficCapture Model + API
- [ ] ForensicsAlert Model + API
- [ ] tcpdump Integration
- [ ] PCAP Parsing

#### Niedrig Priorität
- [ ] Zeek Integration
- [ ] Suricata Integration
- [ ] Neo4j Graph Export
- [ ] Prometheus Metrics

### 10.3 Dokumentation

- [ ] API-Dokumentation (Swagger/OpenAPI)
- [ ] User Guide für ChutneX Analytics
- [ ] Video Tutorials
- [ ] Beispiel-Workflows

---

## 11. Changelog

### 2026-01-14

**Neue Seiten:**
- ForensicsOverviewPage (mit Mock-Daten für Timing, Anomalies, etc.)
- BandwidthChartPage (4 Chart-Typen, Radar, Brush-Zoom)

**Fixes:**
- App.tsx Route-Duplikate entfernt
- MegaMenu i18n komplett (DE/EN)

**Dokumentation:**
- CHUTNEX_ANALYTICS.md erstellt
- Datenquellen dokumentiert (Echt vs Mock)
- Zusatzsoftware-Anforderungen dokumentiert

### 2026-01-13

**Neue Seiten:**
- TrafficOverviewPage
- Alle Circuit-Seiten (6 Stück)

**Features:**
- i18n System implementiert
- Language Switcher in Header

### 2026-01-12

**Initiale Implementierung:**
- ChutneXMegaMenu mit 120 Features
- AnalyticsDashboard
- NodeGridPage
- NodeBandwidthPage
- API Client (chutney_analytics.ts)

---

## Anhang A: Schnellreferenz

### Entwicklungsserver starten
```bash
cd ~/simplex-smp-monitor/frontend
npm run dev
```

### Seite testen
```
http://localhost:5173/tor-networks/{network-id}/analytics/{page}
```

### Übersetzungen hinzufügen
```bash
# de.json
python3 << 'PYEOF'
import json
with open('frontend/src/i18n/locales/de.json', 'r') as f:
    de = json.load(f)
de["chutnexPages"]["newSection"] = {"key": "Wert"}
with open('frontend/src/i18n/locales/de.json', 'w') as f:
    json.dump(de, f, indent=2, ensure_ascii=False)
PYEOF
```

### MegaMenu Badge ändern
```bash
sed -i "s/badge: 'SOON', disabled: true/badge: 'ALPHA'/" \
  frontend/src/components/navigation/ChutneXMegaMenu.tsx
```

---

*Dokumentversion: 1.0*  
*Erstellt: 14.01.2026*  
*Autoren: cannatoshi + Claude*

**🔬 ChutneX Analytics - Forensik für private Tor-Netzwerke**