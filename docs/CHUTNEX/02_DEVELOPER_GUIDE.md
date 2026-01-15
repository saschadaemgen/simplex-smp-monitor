# ChutneX Analytics - Developer Guide

> **Frontend Development Documentation**  
> Status: Active Development | Version: 0.1.12-alpha  
> Last Updated: 2026-01-15

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Development Status](#3-development-status)
4. [Page Overview](#4-page-overview)
5. [Data Sources](#5-data-sources)
6. [Backend Development](#6-backend-development)
7. [Additional Software](#7-additional-software)
8. [Workflow Guidelines](#8-workflow-guidelines)
9. [Known Issues](#9-known-issues)
10. [To-Do List](#10-to-do-list)
11. [Changelog](#11-changelog)

---

## 1. Overview

### 1.1 What is ChutneX Analytics?

ChutneX Analytics is a comprehensive **forensics and analysis suite** for private Tor networks:

- **120 Features** in 12 categories
- **Real-time Monitoring** with WebSocket updates
- **Forensics Tools** for timing correlation and traffic analysis
- **Visualizations** with Recharts (Area, Bar, Line, Radar, Scatter)
- **i18n Support** (German/English)
- **Neon Blue Design** (#88CED0) throughout

### 1.2 Development Strategy
```
┌─────────────────────────────────────────────────────────────────┐
│                 DEVELOPMENT PHASES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PHASE 1: Frontend First (CURRENT)                              │
│  ├── UI components with Mock/Demo data                          │
│  ├── Layout and style all pages                                 │
│  ├── i18n for all text                                          │
│  └── Navigation and routing                                     │
│                                                                 │
│  PHASE 2: Backend Integration                                   │
│  ├── API endpoints for real data                                │
│  ├── stem (Tor Control Port) integration                        │
│  ├── Database models for forensics                              │
│  └── WebSocket for live updates                                 │
│                                                                 │
│  PHASE 3: Additional Software                                   │
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

---

## 2. Architecture

### 2.1 Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 5.x | Build Tool |
| React Router | 6.x | Navigation |
| Recharts | 2.x | Charts/Visualizations |
| react-i18next | 14.x | Internationalization |
| Tailwind CSS | 3.x | Styling (Core Classes only) |
| Lucide React | 0.x | Icons |

### 2.2 File Structure
```
frontend/src/
├── api/
│   └── chutney_analytics.ts      # API Client for Analytics
│
├── components/
│   └── navigation/
│       └── ChutneXMegaMenu.tsx   # Main navigation (120 items)
│
├── pages/
│   └── chutney/
│       ├── analytics/
│       │   └── AnalyticsDashboard.tsx
│       ├── nodes/
│       │   ├── NodeGridPage.tsx
│       │   └── NodeBandwidthPage.tsx
│       ├── circuits/
│       │   ├── CircuitsListPage.tsx
│       │   ├── CircuitDetailPage.tsx
│       │   ├── CircuitPathPage.tsx
│       │   ├── CircuitStatsPage.tsx
│       │   ├── CircuitFiltersPage.tsx
│       │   └── CircuitEventsPage.tsx
│       ├── traffic/
│       │   ├── TrafficOverviewPage.tsx
│       │   └── BandwidthChartPage.tsx
│       └── forensics/
│           └── ForensicsOverviewPage.tsx
│
├── i18n/
│   ├── index.ts
│   └── locales/
│       ├── de.json
│       └── en.json
│
└── App.tsx
```

### 2.3 Design System
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

### 2.4 Button Style (Global Standard)
```typescript
const neonButtonStyle = {
  backgroundColor: 'rgb(30, 41, 59)',  // slate-800, NOT transparent
  color: '#88CED0',
  border: '1px solid #88CED0',
  // NO boxShadow/Glow!
};
```
