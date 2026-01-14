# ChutneX Analytics - Development Guide

> **Development Documentation for ChutneX Analytics Frontend**  
> Status: Active Development | Version: 0.1.12-alpha  
> Last Updated: January 15, 2026

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Development Status](#3-development-status)
4. [Page Overview](#4-page-overview)
5. [Data Sources](#5-data-sources)
6. [Backend Development](#6-backend-development)
7. [Additional Software](#7-additional-software)
8. [Workflow Guidelines](#8-workflow-guidelines)
9. [TypeScript Standards](#9-typescript-standards)
10. [Known Issues & Solutions](#10-known-issues--solutions)
11. [To-Do List](#11-to-do-list)
12. [Changelog](#12-changelog)

---

## 1. Overview

### 1.1 What is ChutneX Analytics?

ChutneX Analytics is a comprehensive **forensics and analysis suite** for private Tor networks. It provides:

- **120 Features** across 12 categories
- **Real-time Monitoring** with WebSocket updates
- **Forensics Tools** for timing correlation and traffic analysis
- **Visualizations** with Recharts (Area, Bar, Line, Radar, Scatter)
- **i18n Support** (English/German)
- **Neon Blue Design** (#88CED0) throughout

### 1.2 Development Strategy
```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT PHASES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PHASE 1: Frontend Placeholders (COMPLETED)                     │
│  ├── All 120 menu items created                                 │
│  ├── Navigation and routing complete                            │
│  ├── Simple placeholder pages for all sections                  │
│  └── TypeScript compilation: PASSING                            │
│                                                                 │
│  PHASE 2: Incremental Full Development (CURRENT)                │
│  ├── Develop each page fully (frontend + backend)               │
│  ├── Test thoroughly before moving to next page                 │
│  ├── Real data integration per page                             │
│  └── Documentation updated per feature                          │
│                                                                 │
│  PHASE 3: Additional Software Integration                       │
│  ├── tcpdump/tshark for Packet Capture                          │
│  ├── Zeek for Protocol Analysis                                 │
│  ├── Suricata for IDS/Alerts                                    │
│  └── Neo4j for Graph Database                                   │
│                                                                 │
│  PHASE 4: Enterprise Features                                   │
│  ├── ML-based Anomaly Detection                                 │
│  ├── Automated Reports                                          │
│  ├── Prometheus/Grafana Integration                             │
│  └── Multi-Network Comparisons                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Strategy Change (January 15, 2026)

**Previous Approach:** Build all UI pages first with mock data, then add backend.

**New Approach:** Develop each page completely (frontend + backend + tests) before moving to the next. This ensures:
- No accumulation of technical debt
- Each feature is production-ready when completed
- Easier debugging and maintenance
- Better documentation coverage

---

## 2. Architecture

### 2.1 Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 7.x | Build Tool |
| React Router | 6.x | Navigation |
| Recharts | 2.x | Charts/Visualizations |
| react-i18next | 14.x | Internationalization |
| Tailwind CSS | 3.x | Styling (Core Classes Only) |
| Lucide React | 0.x | Icons |

### 2.2 Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Django | 6.x | Web Framework |
| Django REST Framework | 3.x | REST API |
| Django Channels | 4.x | WebSocket Support |
| stem | 1.8.x | Tor Control Port Interface |
| Redis | 7.x | Cache/Pub-Sub |
| PostgreSQL | 15.x | Database |
| Docker SDK | 7.x | Container Management |

### 2.3 File Structure
```
frontend/src/
├── api/
│   └── chutney_analytics.ts      # API Client for Analytics
│
├── components/
│   ├── chutneX/                   # Reusable ChutneX Components
│   │   ├── circuits/
│   │   │   ├── CircuitCard.tsx
│   │   │   ├── CircuitEventLog.tsx
│   │   │   ├── CircuitFilters.tsx
│   │   │   ├── CircuitPathViz.tsx
│   │   │   ├── CircuitStats.tsx
│   │   │   └── CircuitsList.tsx
│   │   ├── forensics/
│   │   │   ├── CellAnalysis.tsx
│   │   │   ├── ForensicsOverview.tsx
│   │   │   ├── TimingCorrelation.tsx
│   │   │   └── TrafficPatterns.tsx
│   │   ├── integration/
│   │   │   ├── IntegrationHub.tsx
│   │   │   ├── SuricataAlerts.tsx
│   │   │   └── ZeekLogs.tsx
│   │   ├── nodes/
│   │   │   ├── NodeDetailCard.tsx
│   │   │   ├── NodeFlags.tsx
│   │   │   ├── NodeGrid.tsx
│   │   │   ├── NodeIdentity.tsx
│   │   │   └── NodePortsDisplay.tsx
│   │   ├── overview/
│   │   │   ├── AnalyticsHeader.tsx
│   │   │   ├── AnalyticsTabs.tsx
│   │   │   ├── ConsensusInfo.tsx
│   │   │   ├── NetworkConfig.tsx
│   │   │   ├── NetworkOverview.tsx
│   │   │   ├── NetworkStatsCards.tsx
│   │   │   └── NetworkTimestamps.tsx
│   │   ├── reports/
│   │   │   └── ReportGenerator.tsx
│   │   ├── traffic/
│   │   │   ├── BandwidthChart.tsx
│   │   │   ├── FlowAnalysis.tsx
│   │   │   ├── PacketAnalysis.tsx
│   │   │   ├── TrafficCaptureCard.tsx
│   │   │   ├── TrafficCapturesList.tsx
│   │   │   └── TrafficOverview.tsx
│   │   ├── visualization/
│   │   │   ├── BandwidthHeatmap.tsx
│   │   │   ├── CircuitFlowDiagram.tsx
│   │   │   └── NetworkTopology.tsx
│   │   ├── index.ts              # Component Exports
│   │   └── types.ts              # Shared TypeScript Types
│   │
│   ├── layout/
│   │   └── Layout.tsx            # Main Layout with Navigation
│   │
│   └── navigation/
│       └── ChutneXMegaMenu.tsx   # Main Navigation (120 Items)
│
├── pages/
│   ├── ChutneXAnalytics.tsx      # Main Analytics Entry Point
│   │
│   └── chutney/
│       ├── analytics/            # Analytics Section (3 pages)
│       │   ├── AnalyticsDashboardPage.tsx
│       │   ├── AnalyticsHeaderPage.tsx
│       │   └── AnalyticsTabsPage.tsx
│       │
│       ├── circuits/             # Circuits Section (6 pages)
│       │   ├── CircuitDetailPage.tsx
│       │   ├── CircuitEventsPage.tsx
│       │   ├── CircuitFiltersPage.tsx
│       │   ├── CircuitPathPage.tsx
│       │   ├── CircuitStatsPage.tsx
│       │   └── CircuitsListPage.tsx    # FULLY IMPLEMENTED
│       │
│       ├── forensics/            # Forensics Section (4 pages)
│       │   ├── CellAnalysisPage.tsx
│       │   ├── ForensicsOverviewPage.tsx
│       │   ├── TimingCorrelationPage.tsx
│       │   └── TrafficPatternsPage.tsx
│       │
│       ├── integration/          # Integration Section (3 pages)
│       │   ├── IntegrationHubPage.tsx
│       │   ├── SuricataAlertsPage.tsx
│       │   └── ZeekLogsPage.tsx
│       │
│       ├── nodes/                # Nodes Section (6 pages)
│       │   ├── NodeBandwidthPage.tsx
│       │   ├── NodeDetailPage.tsx
│       │   ├── NodeFlagsPage.tsx
│       │   ├── NodeGridPage.tsx
│       │   ├── NodeIdentityPage.tsx
│       │   └── NodePortsPage.tsx
│       │
│       ├── overview/             # Overview Section (4 pages)
│       │   ├── ConsensusInfoPage.tsx
│       │   ├── NetworkConfigPage.tsx
│       │   ├── StatsCardsPage.tsx
│       │   └── TimestampsPage.tsx
│       │
│       ├── reports/              # Reports Section (1 page)
│       │   └── ReportGeneratorPage.tsx
│       │
│       ├── traffic/              # Traffic Section (7 pages)
│       │   ├── BandwidthChartPage.tsx
│       │   ├── CaptureDetailPage.tsx
│       │   ├── CapturesListPage.tsx
│       │   ├── ConnectionMapPage.tsx
│       │   ├── FlowAnalysisPage.tsx
│       │   ├── PacketAnalysisPage.tsx
│       │   └── TrafficOverviewPage.tsx
│       │
│       └── viz/                  # Visualization Section (3 pages)
│           ├── CircuitFlowPage.tsx
│           ├── HeatmapPage.tsx
│           └── NetworkTopologyPage.tsx
│
├── i18n/
│   ├── index.ts                  # i18n Configuration
│   └── locales/
│       ├── de.json               # German Translations
│       └── en.json               # English Translations
│
└── App.tsx                       # Router Configuration
```

### 2.4 Design System
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
--status-info: #60a5fa;

/* Background */
--bg-dark: #0a0a0f;
--bg-card: rgba(30, 41, 59, 0.5);
--bg-card-hover: rgba(30, 41, 59, 0.7);
--border: rgba(51, 65, 85, 0.5);
--border-hover: rgba(136, 206, 208, 0.3);
```

### 2.5 Component Design Patterns
```typescript
// Standard Page Component Pattern
import { useParams } from 'react-router-dom';

const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.1)';

const ExamplePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  return (
    <div className="h-full bg-[#0a0a0f] p-6">
      <h1 className="text-2xl font-bold text-[#88CED0]">Page Title</h1>
      <p className="text-gray-500">Network: {id}</p>
    </div>
  );
};

export default ExamplePage;
```

---

## 3. Development Status

### 3.1 Fully Implemented Pages ✅

| Page | Route | Data Source | Features |
|------|-------|-------------|----------|
| CircuitsListPage | `/tor-networks/:id/analytics/circuits` | Real API | Path visualization, filtering, statistics, charts, table/card views |

### 3.2 Placeholder Pages (Awaiting Development) 📋

All other pages are currently simple placeholders displaying only:
- Page title
- Network ID from URL params

This is intentional - each page will be fully developed (frontend + backend) before moving to the next.

#### Analytics Section (3 pages)
- AnalyticsDashboardPage
- AnalyticsHeaderPage
- AnalyticsTabsPage

#### Circuits Section (5 remaining pages)
- CircuitDetailPage
- CircuitEventsPage
- CircuitFiltersPage
- CircuitPathPage
- CircuitStatsPage

#### Forensics Section (4 pages)
- ForensicsOverviewPage
- CellAnalysisPage
- TimingCorrelationPage
- TrafficPatternsPage

#### Integration Section (3 pages)
- IntegrationHubPage
- SuricataAlertsPage
- ZeekLogsPage

#### Nodes Section (6 pages)
- NodeGridPage
- NodeBandwidthPage
- NodeDetailPage
- NodeFlagsPage
- NodeIdentityPage
- NodePortsPage

#### Overview Section (4 pages)
- ConsensusInfoPage
- NetworkConfigPage
- StatsCardsPage
- TimestampsPage

#### Reports Section (1 page)
- ReportGeneratorPage

#### Traffic Section (7 pages)
- TrafficOverviewPage
- BandwidthChartPage
- CapturesListPage
- CaptureDetailPage
- ConnectionMapPage
- FlowAnalysisPage
- PacketAnalysisPage

#### Visualization Section (3 pages)
- NetworkTopologyPage
- CircuitFlowPage
- HeatmapPage

### 3.3 Development Priority Queue

Based on user value and technical dependencies:

| Priority | Page | Reason |
|----------|------|--------|
| 1 | NodeGridPage | Core functionality, shows all nodes |
| 2 | NodeBandwidthPage | Important metrics |
| 3 | ForensicsOverviewPage | Key forensics feature |
| 4 | TrafficOverviewPage | Traffic monitoring |
| 5 | BandwidthChartPage | Visualization |
| 6 | NetworkTopologyPage | Network visualization |

---

## 4. Page Overview

### 4.1 MegaMenu Categories (120 Features)
```
┌─────────────────────────────────────────────────────────────────┐
│                    CHUTNEX MEGA MENU                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  OVERVIEW (10)          NODES (10)           CIRCUITS (10)      │
│  ├── Network List       ├── Node Grid        ├── Circuits List ✅│
│  ├── Network Details    ├── Node Detail      ├── Circuit Card   │
│  ├── Analytics          ├── Node Bandwidth   ├── Circuit Path   │
│  ├── New Network        ├── Node Flags       ├── Circuit Stats  │
│  ├── Edit Network       ├── Node Identity    ├── Circuit Filter │
│  ├── Health Monitor     ├── Node Ports       ├── Circuit Events │
│  ├── Activity Feed      ├── Node Compare     ├── Circuit Builder│
│  ├── System Status      ├── Node History     ├── Circuit Timeline│
│  ├── Quick Actions      ├── Node Search      ├── Circuit Compare│
│  └── Getting Started    └── Node Export      └── Circuit Export │
│                                                                 │
│  TRAFFIC (10)           FORENSICS (10)       VISUALIZATION (10) │
│  ├── Traffic Overview   ├── Forensics Dash   ├── Network Topology│
│  ├── Bandwidth Chart    ├── Timing Corr.     ├── Circuit Flow   │
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

✅ = Fully Implemented | No symbol = Placeholder (SOON Badge)
```

### 4.2 Badge System

| Badge | Meaning | Color | Usage |
|-------|---------|-------|-------|
| LIVE | Production Ready | Cyan/Neon (#88CED0) | Fully tested features |
| ALPHA | Works, may have bugs | Dimmed Cyan | New features |
| BETA | In Testing | Purple (#a78bfa) | Features under test |
| PRO | Enterprise Feature | Orange (#f59e0b) | Premium features |
| SOON | Not yet implemented | Gray (#6b7280) | Placeholder pages |

### 4.3 Route Structure
```typescript
// Main Analytics Routes
/tor-networks/:id/analytics                    // Main dashboard
/tor-networks/:id/analytics/nodes              // Node grid
/tor-networks/:id/analytics/nodes/bandwidth    // Node bandwidth
/tor-networks/:id/analytics/nodes/:nodeId      // Node detail
/tor-networks/:id/analytics/circuits           // Circuits list
/tor-networks/:id/analytics/circuits/:circuitId // Circuit detail
/tor-networks/:id/analytics/traffic            // Traffic overview
/tor-networks/:id/analytics/traffic/bandwidth  // Bandwidth charts
/tor-networks/:id/analytics/forensics          // Forensics dashboard
/tor-networks/:id/analytics/forensics/timing   // Timing correlation
```

---

## 5. Data Sources

### 5.1 Real Data (from API)

Data from the `analyticsApi` client:
```typescript
// api/chutney_analytics.ts
export interface NetworkAnalytics {
  network_id: string;
  network_name: string;
  status: string;
  nodes: {
    total: number;
    by_type: Record<string, number>;
    stats: NodeStats[];  // ✅ REAL DATA
  };
  circuits: {
    total_circuits: number;
    built_circuits: number;
    by_status: Record<string, number>;
    by_purpose: Record<string, number>;
    circuits: CircuitInfo[];  // ✅ REAL DATA
  };
  bandwidth: {
    total_bytes_read: number;    // ✅ REAL DATA
    total_bytes_written: number; // ✅ REAL DATA
    by_node_type: Record<string, {read: number, written: number}>;
  };
  consensus?: ConsensusInfo;
}

export interface CircuitInfo {
  circuit_id: string;
  status: string;
  purpose: string;
  path_length: number;
  path: Array<{
    fingerprint: string;
    nickname?: string;
  }>;
  source_node?: string;
  build_flags?: string[];
}

export interface NodeStats {
  name: string;
  type: string;
  fingerprint: string;
  bandwidth_read: number;
  bandwidth_written: number;
  status: string;
}
```

**Real data available for:**
- Node statistics (Name, Type, Fingerprint, Bandwidth)
- Circuit information (ID, Status, Path, Nodes)
- Bandwidth metrics (Read/Write per Node)
- Network status and configuration
- Consensus information

### 5.2 Mock/Demo Data

**⚠️ IMPORTANT:** The following data is currently **simulated** using `Math.random()`:
```typescript
// Example mock data patterns (to be replaced with real API data)

// Timing metrics
entryLatency: Math.random() * 50 + 10,      // 🎭 MOCK
exitLatency: Math.random() * 80 + 20,        // 🎭 MOCK
correlation: Math.random() * 0.3,            // 🎭 MOCK

// Anomaly detection
anomalyScore: Math.random() * 100,           // 🎭 MOCK
timingAnomalies: Math.floor(Math.random() * 5),
patternMatches: Math.floor(Math.random() * 12),
suspiciousFlows: Math.floor(Math.random() * 3),

// Packet metrics
packetCount: Math.floor(Math.random() * 1000) + 500,
```

**Hardcoded demo data:**
- Investigation Queue Items (INV-001, INV-002, etc.)
- Security Radar Scores
- Threat Level Indicators
- Scatter Plot correlation data

### 5.3 Data Requirements by Feature

| Feature | Data Required | Source | Status |
|---------|---------------|--------|--------|
| Circuit List | CircuitInfo[] | stem CIRC events | ✅ Available |
| Node Grid | NodeStats[] | stem GETINFO | ✅ Available |
| Bandwidth | Read/Write bytes | stem BW events | ✅ Available |
| Timing Correlation | Circuit timestamps | stem CIRC events | 🔧 Implementable |
| Entry/Exit Latency | Event timestamps | stem Events | 🔧 Implementable |
| Anomaly Score | Statistical analysis | Custom service | 🔧 Implementable |
| Packet Capture | Raw packets | tcpdump/tshark | 📦 Needs software |
| Cell Analysis | Tor cell data | Tor cell parser | 📦 Needs software |
| Pattern Detection | Traffic patterns | ML/Regex engine | 📦 Needs software |

---

## 6. Backend Development

### 6.1 Existing Infrastructure
```python
# Already installed and configured:
stem                    # ✅ Python Tor Controller
docker                  # ✅ Docker Python SDK
djangorestframework     # ✅ REST API
channels                # ✅ WebSocket Support
channels-redis          # ✅ Redis Channel Layer
redis                   # ✅ Cache/Pub-Sub
psycopg2               # ✅ PostgreSQL
```

### 6.2 Current API Endpoints
```python
# Existing ChutneX API Endpoints

# Network Management
GET    /api/v1/chutney/networks/                    # List networks
POST   /api/v1/chutney/networks/                    # Create network
GET    /api/v1/chutney/networks/{slug}/             # Network detail
PUT    /api/v1/chutney/networks/{slug}/             # Update network
DELETE /api/v1/chutney/networks/{slug}/             # Delete network
POST   /api/v1/chutney/networks/{slug}/start/       # Start network
POST   /api/v1/chutney/networks/{slug}/stop/        # Stop network
GET    /api/v1/chutney/networks/{slug}/status/      # Network status

# Analytics (Current)
GET    /api/v1/chutney/networks/{id}/analytics/     # Full analytics data
```

### 6.3 Planned API Endpoints
```python
# New Endpoints for Full Feature Implementation

# Forensics - Timing Correlation
GET  /api/v1/chutney/networks/{id}/forensics/timing/
POST /api/v1/chutney/networks/{id}/forensics/timing/start/
POST /api/v1/chutney/networks/{id}/forensics/timing/stop/
GET  /api/v1/chutney/networks/{id}/forensics/timing/results/

# Forensics - Traffic Analysis
GET  /api/v1/chutney/networks/{id}/forensics/traffic/patterns/
GET  /api/v1/chutney/networks/{id}/forensics/traffic/anomalies/
GET  /api/v1/chutney/networks/{id}/forensics/traffic/flows/

# Forensics - Cell Analysis
GET  /api/v1/chutney/networks/{id}/forensics/cells/
GET  /api/v1/chutney/networks/{id}/forensics/cells/{cell_id}/

# Circuit Events (WebSocket)
WS   /ws/chutney/{network_id}/circuits/
WS   /ws/chutney/{network_id}/events/

# Packet Capture
POST /api/v1/chutney/networks/{id}/captures/start/
POST /api/v1/chutney/networks/{id}/captures/stop/
GET  /api/v1/chutney/networks/{id}/captures/
GET  /api/v1/chutney/networks/{id}/captures/{capture_id}/
GET  /api/v1/chutney/networks/{id}/captures/{capture_id}/packets/

# Node Details
GET  /api/v1/chutney/networks/{id}/nodes/
GET  /api/v1/chutney/networks/{id}/nodes/{node_id}/
GET  /api/v1/chutney/networks/{id}/nodes/{node_id}/bandwidth/
GET  /api/v1/chutney/networks/{id}/nodes/{node_id}/flags/

# Reports
POST /api/v1/chutney/networks/{id}/reports/generate/
GET  /api/v1/chutney/networks/{id}/reports/
GET  /api/v1/chutney/networks/{id}/reports/{report_id}/
```

### 6.4 Planned Django Models
```python
# chutney/models.py - New Models for Forensics

class TimingCorrelation(models.Model):
    """Timing correlation analysis results"""
    network = models.ForeignKey(TorNetwork, on_delete=models.CASCADE)
    circuit_id = models.CharField(max_length=20)
    entry_node = models.ForeignKey(TorNode, related_name='entry_correlations', on_delete=models.CASCADE)
    exit_node = models.ForeignKey(TorNode, related_name='exit_correlations', on_delete=models.CASCADE)
    entry_timestamp = models.DateTimeField()
    exit_timestamp = models.DateTimeField()
    latency_ms = models.FloatField()
    correlation_score = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['network', 'created_at']),
            models.Index(fields=['circuit_id']),
        ]


class TrafficCapture(models.Model):
    """Packet capture session"""
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        RUNNING = 'running', 'Running'
        STOPPED = 'stopped', 'Stopped'
        COMPLETED = 'completed', 'Completed'
        ERROR = 'error', 'Error'
    
    network = models.ForeignKey(TorNetwork, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    pcap_file = models.FileField(upload_to='captures/', null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    stopped_at = models.DateTimeField(null=True, blank=True)
    packet_count = models.IntegerField(default=0)
    bytes_captured = models.BigIntegerField(default=0)
    filter_expression = models.CharField(max_length=500, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']


class ForensicsAlert(models.Model):
    """Forensics alert/warning"""
    class AlertType(models.TextChoices):
        TIMING = 'timing', 'Timing Anomaly'
        PATTERN = 'pattern', 'Traffic Pattern'
        ANOMALY = 'anomaly', 'Statistical Anomaly'
        CORRELATION = 'correlation', 'Correlation Match'
    
    class Severity(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'
    
    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        REVIEWING = 'reviewing', 'Reviewing'
        RESOLVED = 'resolved', 'Resolved'
        DISMISSED = 'dismissed', 'Dismissed'
    
    network = models.ForeignKey(TorNetwork, on_delete=models.CASCADE)
    alert_type = models.CharField(max_length=50, choices=AlertType.choices)
    severity = models.CharField(max_length=20, choices=Severity.choices)
    title = models.CharField(max_length=200)
    description = models.TextField()
    data = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.CharField(max_length=100, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['network', 'status']),
            models.Index(fields=['severity']),
        ]


class CircuitEvent(models.Model):
    """Circuit lifecycle event for forensics"""
    class EventType(models.TextChoices):
        CREATED = 'created', 'Created'
        EXTENDED = 'extended', 'Extended'
        BUILT = 'built', 'Built'
        FAILED = 'failed', 'Failed'
        CLOSED = 'closed', 'Closed'
    
    network = models.ForeignKey(TorNetwork, on_delete=models.CASCADE)
    circuit_id = models.CharField(max_length=20)
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    timestamp = models.DateTimeField()
    path = models.JSONField(default=list)  # List of node fingerprints
    purpose = models.CharField(max_length=50, blank=True)
    build_flags = models.JSONField(default=list)
    reason = models.CharField(max_length=200, blank=True)  # For failures
    raw_event = models.JSONField(default=dict)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['network', 'timestamp']),
            models.Index(fields=['circuit_id']),
        ]
```

### 6.5 stem Integration Service
```python
# chutney/services/forensics_service.py

from datetime import datetime
from typing import List, Dict, Optional
from stem import CircStatus, StreamStatus
from stem.control import Controller, EventType

class ForensicsService:
    """
    Forensics service using stem for Tor Control Port integration.
    
    Capabilities without additional software:
    - Circuit event monitoring
    - Timing correlation analysis
    - Bandwidth tracking
    - Basic anomaly detection
    """
    
    def __init__(self, controller: Controller):
        self.controller = controller
        self.circuit_events: List[Dict] = []
        self.stream_events: List[Dict] = []
        self.bandwidth_events: List[Dict] = []
        self._listeners_active = False
    
    def start_monitoring(self):
        """Start monitoring all relevant events."""
        if self._listeners_active:
            return
        
        self.controller.add_event_listener(
            self._handle_circuit_event, 
            EventType.CIRC
        )
        self.controller.add_event_listener(
            self._handle_stream_event,
            EventType.STREAM
        )
        self.controller.add_event_listener(
            self._handle_bandwidth_event,
            EventType.BW
        )
        
        self._listeners_active = True
    
    def stop_monitoring(self):
        """Stop all event monitoring."""
        if not self._listeners_active:
            return
        
        self.controller.remove_event_listener(self._handle_circuit_event)
        self.controller.remove_event_listener(self._handle_stream_event)
        self.controller.remove_event_listener(self._handle_bandwidth_event)
        
        self._listeners_active = False
    
    def _handle_circuit_event(self, event):
        """Handle circuit events for timing analysis."""
        self.circuit_events.append({
            'timestamp': datetime.now(),
            'circuit_id': event.id,
            'status': str(event.status),
            'path': event.path if hasattr(event, 'path') else [],
            'build_flags': event.build_flags if hasattr(event, 'build_flags') else [],
            'purpose': event.purpose if hasattr(event, 'purpose') else '',
            'reason': event.reason if hasattr(event, 'reason') else '',
        })
        
        # Keep only last 1000 events
        if len(self.circuit_events) > 1000:
            self.circuit_events = self.circuit_events[-1000:]
    
    def _handle_stream_event(self, event):
        """Handle stream events."""
        self.stream_events.append({
            'timestamp': datetime.now(),
            'stream_id': event.id,
            'status': str(event.status),
            'circuit_id': event.circ_id if hasattr(event, 'circ_id') else None,
            'target': event.target if hasattr(event, 'target') else '',
        })
        
        if len(self.stream_events) > 1000:
            self.stream_events = self.stream_events[-1000:]
    
    def _handle_bandwidth_event(self, event):
        """Handle bandwidth events."""
        self.bandwidth_events.append({
            'timestamp': datetime.now(),
            'read': event.read,
            'written': event.written,
        })
        
        if len(self.bandwidth_events) > 1000:
            self.bandwidth_events = self.bandwidth_events[-1000:]
    
    def get_timing_correlation(self, window_seconds: int = 60) -> List[Dict]:
        """
        Calculate timing correlation from circuit events.
        
        Args:
            window_seconds: Time window to analyze
            
        Returns:
            List of correlation data points
        """
        cutoff = datetime.now() - timedelta(seconds=window_seconds)
        recent = [e for e in self.circuit_events if e['timestamp'] > cutoff]
        
        correlations = []
        for event in recent:
            if event['status'] == 'BUILT':
                build_time = self._calculate_build_time(event['circuit_id'])
                if build_time:
                    correlations.append({
                        'circuit_id': event['circuit_id'],
                        'build_time_ms': build_time,
                        'path_length': len(event['path']),
                        'timestamp': event['timestamp'].isoformat(),
                    })
        
        return correlations
    
    def _calculate_build_time(self, circuit_id: str) -> Optional[float]:
        """Calculate circuit build time from CREATED to BUILT events."""
        created_time = None
        built_time = None
        
        for event in self.circuit_events:
            if event['circuit_id'] == circuit_id:
                if event['status'] == 'LAUNCHED':
                    created_time = event['timestamp']
                elif event['status'] == 'BUILT':
                    built_time = event['timestamp']
        
        if created_time and built_time:
            return (built_time - created_time).total_seconds() * 1000
        return None
    
    def get_circuit_stats(self) -> List[Dict]:
        """Get current circuit statistics."""
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
    
    def get_bandwidth_history(self, window_seconds: int = 300) -> List[Dict]:
        """Get bandwidth history for the specified time window."""
        cutoff = datetime.now() - timedelta(seconds=window_seconds)
        return [e for e in self.bandwidth_events if e['timestamp'] > cutoff]
    
    def detect_anomalies(self) -> List[Dict]:
        """
        Detect statistical anomalies in circuit behavior.
        
        Uses simple statistical methods:
        - Build time outliers (> 2 std dev)
        - Unusual path lengths
        - Repeated failures
        """
        anomalies = []
        
        # Analyze build times
        build_times = []
        for event in self.circuit_events:
            if event['status'] == 'BUILT':
                bt = self._calculate_build_time(event['circuit_id'])
                if bt:
                    build_times.append(bt)
        
        if len(build_times) > 10:
            import statistics
            mean_bt = statistics.mean(build_times)
            std_bt = statistics.stdev(build_times)
            
            for event in self.circuit_events[-100:]:
                if event['status'] == 'BUILT':
                    bt = self._calculate_build_time(event['circuit_id'])
                    if bt and bt > mean_bt + 2 * std_bt:
                        anomalies.append({
                            'type': 'slow_build',
                            'circuit_id': event['circuit_id'],
                            'build_time_ms': bt,
                            'expected_ms': mean_bt,
                            'deviation': (bt - mean_bt) / std_bt,
                            'timestamp': event['timestamp'].isoformat(),
                        })
        
        return anomalies
```

---

## 7. Additional Software

### 7.1 Phase 1: Base (No Installation Required)

| Tool | Status | Purpose |
|------|--------|---------|
| stem | ✅ Installed | Tor Control Port |
| Docker SDK | ✅ Installed | Container Management |
| Recharts | ✅ Installed | Visualizations |

**Capabilities:**
- Timing Correlation (Circuit Events)
- Basic Anomaly Detection (Statistical Outliers)
- Bandwidth Monitoring (per Node/Circuit)
- Circuit Path Analysis

### 7.2 Phase 2: Packet Capture
```bash
# Installation (usually already available)
sudo apt install tcpdump tshark

# Or in Docker container
apt-get update && apt-get install -y tcpdump tshark
```

| Tool | Purpose | Priority |
|------|---------|----------|
| tcpdump | Raw Packet Capture | HIGH |
| tshark | Wireshark CLI, Protocol Analysis | HIGH |
| editcap | PCAP Manipulation | MEDIUM |

**Capabilities:**
- PCAP Capture of all Tor cells
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

| Tool | Purpose | Priority |
|------|---------|----------|
| Zeek | Deep Protocol Analysis | MEDIUM |
| Suricata | IDS/IPS, Alert Rules | MEDIUM |

**Capabilities:**
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

# Elasticsearch + Kibana (via Docker)
docker run -d --name elasticsearch -p 9200:9200 elasticsearch:8.x
docker run -d --name kibana -p 5601:5601 kibana:8.x
```

| Tool | Purpose | Priority |
|------|---------|----------|
| Neo4j | Graph Database for Circuits | LOW |
| Elasticsearch | Log Aggregation | LOW |
| Arkime | Full Packet Capture | LOW |
| Grafana | Dashboards | LOW |

---

## 8. Workflow Guidelines

### 8.1 Creating a New Page (Complete Development)
```bash
# Step 1: Create the page component
cat > frontend/src/pages/chutney/{category}/{PageName}Page.tsx << 'EOF'
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { analyticsApi, NetworkAnalytics } from '../../../api/chutney_analytics';

const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.1)';

export default function PageNamePage() {
  const { id: networkId } = useParams<{ id: string }>();
  const [analytics, setAnalytics] = useState<NetworkAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!networkId) return;
    try {
      const data = await analyticsApi.getNetworkAnalytics(networkId);
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [networkId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="h-full bg-gray-900 flex items-center justify-center">
        <Loader2 size={48} className="animate-spin" style={{ color: NEON }} />
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 overflow-auto">
      {/* Header */}
      <div className="bg-gray-800/30 border-b border-gray-700/50 px-6 py-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-4">
          <Link to="/tor-networks" className="text-gray-500 hover:text-[#88CED0] flex items-center gap-1">
            <ArrowLeft size={14} />Networks
          </Link>
          <ChevronRight size={14} className="text-gray-600" />
          <span style={{ color: NEON }}>Page Title</span>
        </div>
        {/* Title */}
        <h1 className="text-2xl font-bold text-white">Page Title</h1>
        <p className="text-gray-500 text-sm">Page description</p>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Add your content here */}
      </div>
    </div>
  );
}
EOF

# Step 2: Add backend API endpoint (if needed)
# Edit chutney/api/views.py

# Step 3: Add route in App.tsx
# const PageNamePage = lazy(() => import('./pages/chutney/category/PageNamePage'));
# <Route path="tor-networks/:id/analytics/path" element={<PageNamePage />} />

# Step 4: Update MegaMenu badge (SOON → ALPHA)
# frontend/src/components/navigation/ChutneXMegaMenu.tsx

# Step 5: Add translations (if using i18n)
# frontend/src/i18n/locales/en.json
# frontend/src/i18n/locales/de.json

# Step 6: Test thoroughly
npm run build
npm run dev
# Test in browser

# Step 7: Update documentation
# docs/CHUTNEX_ANALYTICS.md

# Step 8: Commit
git add -A
git commit -m "feat(analytics): implement PageName with full backend integration"
```

### 8.2 Commit Conventions
```bash
# Feature
git commit -m "feat(analytics): add ForensicsOverviewPage with timing charts"

# Fix
git commit -m "fix(circuits): resolve TypeScript errors in CircuitsListPage"

# Docs
git commit -m "docs: update CHUTNEX_ANALYTICS.md with new pages"

# Style
git commit -m "style(components): apply Neon Blue theme to all cards"

# Refactor
git commit -m "refactor(api): extract common analytics fetch logic"

# Test
git commit -m "test(forensics): add unit tests for timing correlation"
```

### 8.3 Code Review Checklist

Before committing any page, verify:

- [ ] TypeScript compilation passes (`npm run build`)
- [ ] No unused imports or variables
- [ ] Loading state implemented
- [ ] Error state implemented
- [ ] Breadcrumb navigation present
- [ ] Responsive layout (mobile-friendly)
- [ ] Neon Blue theme applied consistently
- [ ] API data properly typed
- [ ] Error handling for API calls
- [ ] Documentation updated

---

## 9. TypeScript Standards

### 9.1 Common Patterns
```typescript
// React.cloneElement with type safety
React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' })

// Null coalescing for optional props
<Component value={optionalValue ?? false} />
<Component text={optionalText ?? ''} />

// Unused variable prefixing
const { network: _network, setNetwork } = useState(...);
const CircuitCard: React.FC<Props> = ({ circuit, onClick: _onClick }) => {...}

// Object destructuring with renaming
const { id: networkId } = useParams<{ id: string }>();
```

### 9.2 Type Definitions
```typescript
// Props interface pattern
interface PageProps {
  networkId: string;
  onRefresh?: () => void;
}

// Component with optional props
interface CardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
}

// API response types
interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}
```

### 9.3 Common TypeScript Errors and Fixes

| Error | Solution |
|-------|----------|
| `'X' is declared but never used` | Prefix with underscore: `_X` |
| `Type 'null' is not assignable` | Add null coalescing: `value ?? defaultValue` |
| `Property does not exist on type` | Add to interface or use optional chaining |
| `cloneElement type error` | Cast as `React.ReactElement<any>` |
| `Formatter type mismatch` | Cast value: `(value ?? 0)` |

### 9.4 Import Organization
```typescript
// Standard import order
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Activity, ArrowLeft, ChevronRight, Clock, Loader2, RefreshCw 
} from 'lucide-react';
import { analyticsApi, NetworkAnalytics } from '../../../api/chutney_analytics';
```

---

## 10. Known Issues & Solutions

### 10.1 App.tsx Import Duplicates

**Problem:** sed commands sometimes create duplicate imports or routes.

**Solution:**
```bash
# Find duplicates
grep -n "ComponentName" ~/simplex-smp-monitor/frontend/src/App.tsx

# Delete duplicate line (N = line number)
sed -i 'Nd' ~/simplex-smp-monitor/frontend/src/App.tsx
```

**Prevention:** Always check with `grep -n` before adding imports.

### 10.2 Broken Route Structure

**Problem:** Route without closing tag or missing element.

**Symptom:**
```
Adjacent JSX elements must be wrapped in an enclosing tag
```

**Solution:**
```bash
# Show lines around error
sed -n '190,210p' frontend/src/App.tsx

# Identify and fix broken lines
```

### 10.3 MegaMenu Loading Slowly

**Problem:** Network dropdown loads on every open.

**Solution:** Will be resolved with React Query / SWR caching in future versions.

### 10.4 Charts Not Rendering

**Problem:** ResponsiveContainer needs fixed height from parent.

**Solution:**
```tsx
// WRONG:
<ResponsiveContainer>
  <LineChart ... />
</ResponsiveContainer>

// CORRECT:
<div className="h-[300px]">
  <ResponsiveContainer width="100%" height="100%">
    <LineChart ... />
  </ResponsiveContainer>
</div>
```

### 10.5 Recharts Circular Dependency Warning

**Problem:** Vite shows circular dependency warning during build.

**Symptom:**
```
Export "Bar" of module "recharts" was reexported through module...
```

**Solution:** This is a known Recharts issue. The warning is non-blocking and doesn't affect functionality. Can be safely ignored.

### 10.6 useState Destructuring Syntax

**Problem:** Missing comma in useState destructuring.

**Symptom:**
```
',' expected
```

**Solution:**
```typescript
// WRONG:
const [status setStatus] = useState('');

// CORRECT:
const [status, setStatus] = useState('');
```

---

## 11. To-Do List

### 11.1 Immediate (Next Sprint)

#### High Priority
- [ ] NodeGridPage - Full implementation with real data
- [ ] NodeBandwidthPage - Bandwidth charts and metrics
- [ ] ForensicsOverviewPage - Dashboard with stem integration

#### Medium Priority
- [ ] TrafficOverviewPage - Traffic monitoring
- [ ] BandwidthChartPage - Advanced charts
- [ ] NetworkTopologyPage - Network visualization

### 11.2 Backend Development

#### Phase 1 (stem integration)
- [ ] ForensicsService with stem
- [ ] Timing Correlation API
- [ ] Circuit Event WebSocket
- [ ] Anomaly Detection (statistical)

#### Phase 2 (Packet capture)
- [ ] TrafficCapture Model + API
- [ ] ForensicsAlert Model + API
- [ ] tcpdump Integration
- [ ] PCAP Parsing

#### Phase 3 (Enterprise)
- [ ] Zeek Integration
- [ ] Suricata Integration
- [ ] Neo4j Graph Export
- [ ] Prometheus Metrics

### 11.3 Documentation

- [ ] API Documentation (Swagger/OpenAPI)
- [ ] User Guide for ChutneX Analytics
- [ ] Video Tutorials
- [ ] Example Workflows

### 11.4 Testing

- [ ] Unit tests for ForensicsService
- [ ] Integration tests for API endpoints
- [ ] E2E tests for critical user flows
- [ ] Performance benchmarks

---

## 12. Changelog

### 2026-01-15

**Major Refactoring:**
- Converted 40+ complex placeholder pages to simple stubs
- Changed development strategy: develop each page fully before moving to next
- Fixed all TypeScript compilation errors

**TypeScript Fixes Applied:**
- React.cloneElement type casting with `<any>`
- Null coalescing for optional props
- Unused variable prefixing with underscore
- Fixed useState destructuring syntax
- Removed unused imports across all files

**Files Changed:** 57
- 17 ChutneX components
- 37 Page files
- 1 Layout component
- 1 Main analytics page
- 1 README.md

**Build Status:**
- ✅ TypeScript compilation: PASS
- ✅ Vite build: SUCCESS
- ⚠️ Recharts circular dependency warning (known issue, non-blocking)

### 2026-01-14

**New Pages:**
- ForensicsOverviewPage (with mock data for timing, anomalies, etc.)
- BandwidthChartPage (4 chart types, radar, brush zoom)

**Fixes:**
- App.tsx route duplicates removed
- MegaMenu i18n complete (DE/EN)

**Documentation:**
- CHUTNEX_ANALYTICS.md created
- Data sources documented (Real vs Mock)
- Additional software requirements documented

### 2026-01-13

**New Pages:**
- TrafficOverviewPage
- All Circuit pages (6 total)

**Features:**
- i18n system implemented
- Language Switcher in header

### 2026-01-12

**Initial Implementation:**
- ChutneXMegaMenu with 120 features
- AnalyticsDashboard
- NodeGridPage
- NodeBandwidthPage
- API Client (chutney_analytics.ts)

---

## Appendix A: Quick Reference

### Development Server
```bash
cd ~/simplex-smp-monitor/frontend
npm run dev
```

### Build for Production
```bash
cd ~/simplex-smp-monitor/frontend
npm run build
```

### Test Page
```
http://localhost:5173/tor-networks/{network-id}/analytics/{page}
```

### Check TypeScript Errors
```bash
cd ~/simplex-smp-monitor/frontend
npx tsc --noEmit
```

### MegaMenu Badge Change
```bash
sed -i "s/badge: 'SOON', disabled: true/badge: 'ALPHA'/" \
  frontend/src/components/navigation/ChutneXMegaMenu.tsx
```

### Find Unused Imports
```bash
cd ~/simplex-smp-monitor/frontend
npx eslint src --ext .tsx --fix
```

---

## Appendix B: Component Templates

### Simple Placeholder Page
```typescript
import { useParams } from 'react-router-dom';

const PageNamePage = () => {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="h-full bg-[#0a0a0f] p-6">
      <h1 className="text-2xl font-bold text-[#88CED0]">Page Title</h1>
      <p className="text-gray-500">Network: {id}</p>
    </div>
  );
};

export default PageNamePage;
```

### Full Page with Data Fetching
```typescript
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { analyticsApi, NetworkAnalytics } from '../../../api/chutney_analytics';

const NEON = '#88CED0';
const NEON_DIM = 'rgba(136, 206, 208, 0.1)';

export default function PageNamePage() {
  const { id: networkId } = useParams<{ id: string }>();
  const [analytics, setAnalytics] = useState<NetworkAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!networkId) return;
    try {
      const data = await analyticsApi.getNetworkAnalytics(networkId);
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [networkId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="h-full bg-gray-900 flex items-center justify-center">
        <Loader2 size={48} className="animate-spin" style={{ color: NEON }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-gray-900 p-6">
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 overflow-auto">
      <div className="bg-gray-800/30 border-b border-gray-700/50 px-6 py-4">
        <div className="flex items-center gap-2 text-sm mb-4">
          <Link to="/tor-networks" className="text-gray-500 hover:text-[#88CED0] flex items-center gap-1">
            <ArrowLeft size={14} />Networks
          </Link>
          <ChevronRight size={14} className="text-gray-600" />
          <span style={{ color: NEON }}>Page Title</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Page Title</h1>
      </div>
      <div className="p-6">
        {/* Content */}
      </div>
    </div>
  );
}
```

### Stat Card Component
```typescript
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
}> = ({ title, value, subtitle, icon }) => (
  <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4 hover:border-[#88CED0]/30 transition-all">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold mt-1" style={{ color: '#88CED0' }}>{value}</p>
        {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
      </div>
      <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(136, 206, 208, 0.1)' }}>
        <div style={{ color: '#88CED0' }}>{icon}</div>
      </div>
    </div>
  </div>
);
```

---

*Document Version: 1.1*  
*Created: January 14, 2026*  
*Last Updated: January 15, 2026*  
*Authors: cannatoshi*

**🔬 ChutneX Analytics - Forensics for Private Tor Networks**
