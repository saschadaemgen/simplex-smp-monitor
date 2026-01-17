# Telemetry & Measurement Guide

> **Technical Documentation for Latency Measurement, Timing Accuracy & Metrics**  
> Explains how measurements are taken, accuracy considerations, and data collection  
> For real-time architecture see `REDIS.md`  
> Last Updated: January 17, 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Measurement Architecture](#2-measurement-architecture)
3. [Timestamp Sources](#3-timestamp-sources)
4. [Latency Calculation Methods](#4-latency-calculation-methods)
5. [Accuracy Analysis](#5-accuracy-analysis)
6. [Clock Synchronization](#6-clock-synchronization)
7. [Metrics Reference](#7-metrics-reference)
8. [Data Flow Timing](#8-data-flow-timing)
9. [Calibration Procedures](#9-calibration-procedures)
10. [Statistical Analysis](#10-statistical-analysis)
11. [Storage & Retention](#11-storage--retention)
12. [Visualization & Reporting](#12-visualization--reporting)
13. [Performance Impact](#13-performance-impact)
14. [Troubleshooting](#14-troubleshooting)
15. [Future Improvements](#15-future-improvements)

---

## 1. Overview

### 1.1 Purpose of Telemetry

SimpleX SMP Monitor collects telemetry data to enable forensic analysis of messaging patterns over Tor networks. The primary measurements include:

| Measurement Type | Purpose | Typical Range |
|-----------------|---------|---------------|
| **End-to-End Latency** | Total message delivery time | 500ms - 10,000ms |
| **Hop Latency** | Time per Tor circuit hop | 50ms - 500ms |
| **SMP Server Latency** | Message queue processing time | 10ms - 100ms |
| **Circuit Build Time** | Time to establish Tor circuit | 1,000ms - 5,000ms |
| **Consensus Fetch Time** | Directory authority response | 500ms - 3,000ms |

### 1.2 Measurement Philosophy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      MEASUREMENT PHILOSOPHY                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   PRINCIPLE 1: Measure at the Source                                    │
│   ──────────────────────────────────                                    │
│   Timestamps should be captured as close to the actual event as         │
│   possible, minimizing intermediate processing delays.                  │
│                                                                         │
│   PRINCIPLE 2: Relative Over Absolute                                   │
│   ────────────────────────────────────                                  │
│   When absolute time synchronization is difficult, relative             │
│   measurements between events are more accurate.                        │
│                                                                         │
│   PRINCIPLE 3: Statistical Significance                                 │
│   ──────────────────────────────────────                                │
│   Single measurements are noisy. Aggregate statistics (mean, median,    │
│   percentiles) provide actionable insights.                             │
│                                                                         │
│   PRINCIPLE 4: Minimal Observer Effect                                  │
│   ─────────────────────────────────────                                 │
│   Measurement instrumentation should not significantly impact           │
│   the performance of the system being measured.                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.3 What We Measure vs. What We Display

```
MEASUREMENT POINT                          DISPLAY POINT
(High Precision)                           (Human Readable)
─────────────────                          ─────────────────

Container Event      ←── 0.001ms ──►       Browser UI
    │                   precision              │
    │                                          │
    ▼                                          ▼
Event Bridge         ←── Stored ──►        Dashboard
(Python datetime)       in DB              (Rounded)
    │                                          │
    │                                          │
    ▼                                          ▼
PostgreSQL           ←── µs ──►            "1,234 ms"
(timestamp with tz)     precision          (User sees)
```

---

## 2. Measurement Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     TELEMETRY ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   LAYER 1: EVENT SOURCES                                                │
│   ══════════════════════                                                │
│                                                                         │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │
│   │  SimpleX    │  │  SimpleX    │  │    Tor      │                     │
│   │  Client A   │  │  Client B   │  │  Control    │                     │
│   │             │  │             │  │   Port      │                     │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                     │
│          │                │                │                            │
│          │ WebSocket      │ WebSocket      │ stem                       │
│          │ Events         │ Events         │ Events                     │
│          │                │                │                            │
│          ▼                ▼                ▼                            │
│   ┌─────────────────────────────────────────────────────────┐           │
│   │                                                         │           │
│   │                    EVENT BRIDGE                         │           │
│   │                                                         │           │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │           │
│   │   │  Timestamp  │  │   Event     │  │   Metric    │     │           │
│   │   │  Capture    │  │   Parser    │  │  Calculator │     │           │
│   │   └─────────────┘  └─────────────┘  └─────────────┘     │           │
│   │                                                         │           │
│   └────────────────────────┬────────────────────────────────┘           │
│                            │                                            │
│                            │                                            │
│   LAYER 2: STORAGE         │                                            │
│   ════════════════         │                                            │
│                            ▼                                            │
│   ┌─────────────────────────────────────────────────────────┐           │
│   │                                                         │           │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │           │
│   │   │ PostgreSQL  │  │  InfluxDB   │  │   Redis     │     │           │
│   │   │ (Primary)   │  │ (Time-Ser.) │  │  (Real-time)│     │           │
│   │   └─────────────┘  └─────────────┘  └─────────────┘     │           │
│   │                                                         │           │
│   └─────────────────────────────────────────────────────────┘           │
│                                                                         │
│                                                                         │
│   LAYER 3: ANALYSIS & DISPLAY                                           │
│   ═══════════════════════════                                           │
│                                                                         │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │
│   │   Grafana   │  │   React     │  │   Export    │                     │
│   │  Dashboards │  │  Frontend   │  │   (CSV/JSON)│                     │
│   └─────────────┘  └─────────────┘  └─────────────┘                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Measurement Points

```
MESSAGE JOURNEY WITH MEASUREMENT POINTS
═══════════════════════════════════════

Client A                    Tor Network                    Client B
────────                    ───────────                    ────────

   │
   │ ① USER_INPUT
   │    User clicks "Send"
   │    t₀ = browser timestamp
   │
   ▼
┌──────────────┐
│ SimpleX CLI  │
│  Container   │
└──────┬───────┘
       │
       │ ② CLIENT_SEND
       │    SimpleX processes message
       │    t₁ = container event timestamp
       │
       ▼
   ┌───────┐
   │ Entry │ ③ TOR_ENTRY
   │ Node  │    Circuit entry point
   └───┬───┘    t₂ = (not directly measurable)
       │
       ▼
   ┌───────┐
   │Middle │ ④ TOR_RELAY
   │ Node  │    Relay hop
   └───┬───┘    t₃ = (not directly measurable)
       │
       ▼
   ┌───────┐
   │ Exit  │ ⑤ TOR_EXIT
   │ Node  │    Exit to SMP server
   └───┬───┘    t₄ = (not directly measurable)
       │
       ▼
┌──────────────┐
│  SMP Server  │ ⑥ SMP_RECEIVED
│   (.onion)   │    Message queued
└──────┬───────┘    t₅ = server log timestamp (if available)
       │
       │ (Reverse path through Tor)
       │
       ▼
┌──────────────┐
│ SimpleX CLI  │ ⑦ CLIENT_RECEIVED
│  Container   │    Message delivered
└──────┬───────┘    t₆ = container event timestamp
       │
       │ ⑧ DELIVERY_CONFIRMED
       │    Status update sent back
       │    t₇ = container event timestamp
       │
       ▼
   (Back to Client A via Tor)
       │
       │ ⑨ STATUS_RECEIVED
       │    Client A gets confirmation
       │    t₈ = container event timestamp
       │
       ▼
    DONE


MEASURABLE LATENCIES:
─────────────────────

Total E2E Latency:     t₈ - t₁  (what we primarily measure)
Send Latency:          t₆ - t₁  (message transit time)
Confirmation Latency:  t₈ - t₆  (status return time)
Round-Trip Latency:    t₈ - t₁  (same as E2E for SimpleX)
```

### 2.3 Instrumentation Points in Code

| Location | File | What's Measured |
|----------|------|-----------------|
| Message Send | `clients/services/command_service.py` | `send_initiated_at` |
| Send Event | `clients/services/event_bridge.py` | `send_confirmed_at` |
| Receive Event | `clients/services/event_bridge.py` | `received_at` |
| Delivery Status | `clients/services/event_bridge.py` | `delivered_at` |
| Circuit Events | `chutney/services/tor_bridge.py` | `circuit_built_at` |
| Bandwidth | `chutney/services/tor_bridge.py` | `bytes_read/written` |

---

## 3. Timestamp Sources

### 3.1 Available Timestamp Sources

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      TIMESTAMP SOURCES                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   SOURCE 1: Python datetime (Event Bridge)                              │
│   ─────────────────────────────────────────                             │
│                                                                         │
│   from datetime import datetime, timezone                               │
│   timestamp = datetime.now(timezone.utc)                                │
│                                                                         │
│   Precision: microseconds (µs)                                          │
│   Accuracy:  depends on host NTP sync                                   │
│   Use case:  primary measurement source                                 │
│                                                                         │
│                                                                         │
│   SOURCE 2: SimpleX Event Timestamp                                     │
│   ────────────────────────────────────                                  │
│                                                                         │
│   {                                                                     │
│     "resp": {                                                           │
│       "chatItemTs": "2026-01-17T14:30:00.123456Z"                       │
│     }                                                                   │
│   }                                                                     │
│                                                                         │
│   Precision: microseconds (µs)                                          │
│   Accuracy:  container clock                                            │
│   Use case:  when available, preferred for message events               │
│                                                                         │
│                                                                         │
│   SOURCE 3: PostgreSQL NOW()                                            │
│   ──────────────────────────                                            │
│                                                                         │
│   created_at = models.DateTimeField(auto_now_add=True)                  │
│                                                                         │
│   Precision: microseconds (µs)                                          │
│   Accuracy:  database server clock                                      │
│   Use case:  record creation time, not event time                       │
│                                                                         │
│                                                                         │
│   SOURCE 4: time.perf_counter() (Python)                                │
│   ───────────────────────────────────────                               │
│                                                                         │
│   start = time.perf_counter()                                           │
│   # ... operation ...                                                   │
│   elapsed = time.perf_counter() - start                                 │
│                                                                         │
│   Precision: nanoseconds (ns)                                           │
│   Accuracy:  monotonic, relative only                                   │
│   Use case:  measuring code execution time                              │
│                                                                         │
│                                                                         │
│   SOURCE 5: JavaScript Date.now() (Browser)                             │
│   ──────────────────────────────────────────                            │
│                                                                         │
│   const timestamp = Date.now();  // milliseconds since epoch            │
│                                                                         │
│   Precision: milliseconds (ms)                                          │
│   Accuracy:  user's device clock (often inaccurate!)                    │
│   Use case:  UI display only, never for measurements                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Timestamp Selection Matrix

| Event Type | Primary Source | Fallback Source | Precision |
|------------|---------------|-----------------|-----------|
| Message Sent | SimpleX `chatItemTs` | Event Bridge `datetime.now()` | µs |
| Message Received | SimpleX `chatItemTs` | Event Bridge `datetime.now()` | µs |
| Status Update | Event Bridge `datetime.now()` | - | µs |
| Circuit Event | stem `event.arrived_at` | Event Bridge `datetime.now()` | ms |
| Bandwidth Sample | Event Bridge `datetime.now()` | - | µs |
| User Action | PostgreSQL `auto_now_add` | - | µs |

### 3.3 Timestamp Format Standards

```python
# STORAGE FORMAT (PostgreSQL)
# Always store in UTC with timezone info
timestamp_field = models.DateTimeField()
# Stored as: 2026-01-17 14:30:00.123456+00:00

# API FORMAT (JSON)
# ISO 8601 with milliseconds and Z suffix
{
    "timestamp": "2026-01-17T14:30:00.123Z"
}

# INTERNAL FORMAT (Python)
from datetime import datetime, timezone
ts = datetime.now(timezone.utc)
# datetime(2026, 1, 17, 14, 30, 0, 123456, tzinfo=timezone.utc)

# DISPLAY FORMAT (Frontend)
# Localized to user timezone, appropriate precision
"14:30:00.123"  # For latency-relevant displays
"2:30 PM"       # For general timestamps
```

---

## 4. Latency Calculation Methods

### 4.1 End-to-End Latency

```python
# clients/services/event_bridge.py

class LatencyCalculator:
    """
    Calculates message latency from tracked events.
    
    Latency Definition:
    ───────────────────
    The time from when a message is sent by Client A
    until Client A receives confirmation that Client B
    has received the message.
    
    This includes:
    - Client A processing time
    - Tor circuit traversal (outbound)
    - SMP server queuing
    - Tor circuit traversal (to Client B)
    - Client B processing time
    - Tor circuit traversal (confirmation outbound)
    - Tor circuit traversal (confirmation to Client A)
    """
    
    def calculate_e2e_latency(
        self, 
        send_event_time: datetime,
        delivery_confirmed_time: datetime
    ) -> int:
        """
        Calculate end-to-end latency in milliseconds.
        
        Args:
            send_event_time: When SimpleX reported message sent
            delivery_confirmed_time: When delivery status received
            
        Returns:
            Latency in milliseconds (integer)
        """
        delta = delivery_confirmed_time - send_event_time
        latency_ms = int(delta.total_seconds() * 1000)
        return latency_ms
```

### 4.2 Segment Latencies

```
LATENCY SEGMENTS
════════════════

Total E2E Latency = Σ (all segments)
                  = Send + Transit + Queue + Deliver + Confirm

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   ┌─────────┐                                           ┌─────────┐     │
│   │Client A │                                           │Client B │     │
│   └────┬────┘                                           └────┬────┘     │
│        │                                                     │          │
│        │ ◄──── SEND SEGMENT ────►                            │          │
│        │      (client processing)                            │          │
│        │      Typical: 5-50ms                                │          │
│        │                                                     │          │
│        ▼                                                     │          │
│   ┌─────────┐                                                │          │
│   │  Tor    │ ◄──── TRANSIT SEGMENT (Outbound) ────►         │          │
│   │ Circuit │       (3 hops through Tor)                     │          │
│   └────┬────┘       Typical: 200-2000ms                      │          │
│        │                                                     │          │
│        ▼                                                     │          │
│   ┌─────────┐                                                │          │
│   │  SMP    │ ◄──── QUEUE SEGMENT ────►                      │          │
│   │ Server  │       (message storage & forward)              │          │
│   └────┬────┘       Typical: 10-100ms                        │          │
│        │                                                     │          │
│        │            ◄──── TRANSIT SEGMENT (To B) ────►       │          │
│        │                  (3 hops through Tor)               │          │
│        │                  Typical: 200-2000ms                │          │
│        │                                                     ▼          │
│        │                                                ┌─────────┐     │
│        │                                                │ Deliver │     │
│        │ ◄──── DELIVER SEGMENT ────►                    │ Event   │     │
│        │       (client processing)                      └────┬────┘     │
│        │       Typical: 5-50ms                               │          │
│        │                                                     │          │
│        │            ◄──── CONFIRM SEGMENT ────►              │          │
│        │                  (status back through Tor)          │          │
│        │                  Typical: 400-4000ms                │          │
│        ▼                                                     │          │
│   ┌─────────┐                                                │          │
│   │ Status  │                                                │          │
│   │Received │                                                │          │
│   └─────────┘                                                │          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘


SEGMENT BREAKDOWN (Typical ChutneX Network):
────────────────────────────────────────────

| Segment          | Min    | Typical | Max     | % of Total |
|------------------|--------|---------|---------|------------|
| Send Processing  | 5ms    | 20ms    | 100ms   | 1-2%       |
| Tor Outbound     | 150ms  | 500ms   | 2000ms  | 25-35%     |
| SMP Queue        | 10ms   | 30ms    | 200ms   | 1-3%       |
| Tor to Client B  | 150ms  | 500ms   | 2000ms  | 25-35%     |
| Deliver Process  | 5ms    | 20ms    | 100ms   | 1-2%       |
| Confirm Return   | 300ms  | 1000ms  | 4000ms  | 35-45%     |
|------------------|--------|---------|---------|------------|
| TOTAL            | 620ms  | 2070ms  | 8400ms  | 100%       |
```

### 4.3 Latency Calculation Code

```python
# clients/models.py

class TrackedMessage(models.Model):
    """Message with full latency tracking."""
    
    # Identifiers
    tracking_id = models.UUIDField(unique=True)
    sender = models.ForeignKey('SimplexClient', on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey('SimplexClient', on_delete=models.CASCADE, related_name='received_messages')
    
    # Timestamps (all UTC)
    send_initiated_at = models.DateTimeField(null=True, blank=True)
    send_confirmed_at = models.DateTimeField(null=True, blank=True)
    received_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    # Calculated Latencies (milliseconds)
    send_latency_ms = models.IntegerField(null=True, blank=True)
    delivery_latency_ms = models.IntegerField(null=True, blank=True)
    total_latency_ms = models.IntegerField(null=True, blank=True)
    
    def calculate_latencies(self):
        """Calculate all latency segments."""
        
        # Send latency: initiation to send confirmed
        if self.send_initiated_at and self.send_confirmed_at:
            delta = self.send_confirmed_at - self.send_initiated_at
            self.send_latency_ms = int(delta.total_seconds() * 1000)
        
        # Delivery latency: send confirmed to delivered
        if self.send_confirmed_at and self.delivered_at:
            delta = self.delivered_at - self.send_confirmed_at
            self.delivery_latency_ms = int(delta.total_seconds() * 1000)
        
        # Total latency: initiation to delivered
        if self.send_initiated_at and self.delivered_at:
            delta = self.delivered_at - self.send_initiated_at
            self.total_latency_ms = int(delta.total_seconds() * 1000)
        
        self.save(update_fields=[
            'send_latency_ms', 
            'delivery_latency_ms', 
            'total_latency_ms'
        ])
```

### 4.4 Real-Time Latency Tracking

```python
# clients/services/event_bridge.py

class SimplexEventBridge:
    """Event bridge with latency tracking."""
    
    # In-memory tracking for pending messages
    pending_messages: Dict[str, PendingMessage] = {}
    
    async def _handle_send_event(self, client: dict, event: dict):
        """Handle message send confirmation."""
        tracking_id = self._extract_tracking_id(event)
        
        # Record send time
        self.pending_messages[tracking_id] = PendingMessage(
            tracking_id=tracking_id,
            sender_slug=client['slug'],
            send_confirmed_at=datetime.now(timezone.utc),
        )
    
    async def _handle_delivery_event(self, client: dict, event: dict):
        """Handle delivery confirmation."""
        tracking_id = self._extract_tracking_id(event)
        
        if tracking_id in self.pending_messages:
            pending = self.pending_messages[tracking_id]
            delivered_at = datetime.now(timezone.utc)
            
            # Calculate latency
            latency_ms = int(
                (delivered_at - pending.send_confirmed_at).total_seconds() * 1000
            )
            
            # Store in database
            await self._store_latency(tracking_id, latency_ms)
            
            # Push to browsers
            await self._push_latency_event(tracking_id, latency_ms)
            
            # Cleanup
            del self.pending_messages[tracking_id]
```

---

## 5. Accuracy Analysis

### 5.1 Error Sources

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ERROR SOURCE ANALYSIS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ERROR SOURCE 1: Clock Drift                                           │
│   ───────────────────────────────                                       │
│                                                                         │
│   Container A Clock: 14:30:00.000                                       │
│   Container B Clock: 14:30:00.050  (50ms ahead)                         │
│   Event Bridge Clock: 14:30:00.020 (20ms ahead)                         │
│                                                                         │
│   Impact: ±50ms typical, ±500ms worst case                              │
│   Mitigation: NTP sync, relative measurements                           │
│                                                                         │
│                                                                         │
│   ERROR SOURCE 2: Event Processing Delay                                │
│   ──────────────────────────────────────                                │
│                                                                         │
│   Event occurs in container  ──► WebSocket transmit ──► Event Bridge    │
│                                        │                                │
│                                     1-10ms                              │
│                                                                         │
│   Impact: +1-10ms systematic bias                                       │
│   Mitigation: Consistent measurement point                              │
│                                                                         │
│                                                                         │
│   ERROR SOURCE 3: Python GIL / Event Loop                               │
│   ───────────────────────────────────────                               │
│                                                                         │
│   Event arrives ──► Wait for event loop ──► Handler called              │
│                            │                                            │
│                         0-50ms                                          │
│                         (under load)                                    │
│                                                                         │
│   Impact: +0-50ms variable                                              │
│   Mitigation: Dedicated event loop, asyncio optimization                │
│                                                                         │
│                                                                         │
│   ERROR SOURCE 4: Database Write Latency                                │
│   ──────────────────────────────────────                                │
│                                                                         │
│   Timestamp captured ──► Database INSERT ──► Committed                  │
│                                │                                        │
│                             1-20ms                                      │
│                                                                         │
│   Impact: None (timestamp captured before write)                        │
│   Mitigation: N/A - already handled correctly                           │
│                                                                         │
│                                                                         │
│   ERROR SOURCE 5: Network Jitter                                        │
│   ──────────────────────────────                                        │
│                                                                         │
│   WebSocket frame sent ──► Network transit ──► Received                 │
│                                  │                                      │
│                               0-5ms                                     │
│                            (Docker internal)                            │
│                                                                         │
│   Impact: +0-5ms                                                        │
│   Mitigation: Containers on same Docker network                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Error Budget

| Error Source | Minimum | Typical | Maximum | Mitigated? |
|--------------|---------|---------|---------|------------|
| Clock Drift | 0ms | 20ms | 500ms | Partially (NTP) |
| Event Processing | 1ms | 3ms | 10ms | Yes (consistent) |
| Python GIL | 0ms | 5ms | 50ms | Partially |
| Database Write | 0ms | 0ms | 0ms | Yes |
| Network Jitter | 0ms | 1ms | 5ms | Yes |
| **Total Systematic** | **1ms** | **9ms** | **65ms** | - |
| **Total Random** | **0ms** | **±20ms** | **±500ms** | - |

### 5.3 Accuracy by Latency Range

```
MEASUREMENT ACCURACY BY LATENCY RANGE
═════════════════════════════════════

Latency Range    │ Error Budget │ Accuracy │ Confidence
─────────────────┼──────────────┼──────────┼────────────
< 100ms          │ ±30ms        │ 70%      │ Low
100ms - 500ms    │ ±30ms        │ 90-94%   │ Medium
500ms - 2000ms   │ ±30ms        │ 97-99%   │ High
2000ms - 5000ms  │ ±30ms        │ 99%+     │ Very High
> 5000ms         │ ±30ms        │ 99.5%+   │ Excellent


VISUALIZATION:

    Accuracy %
    100% ┤                                    ●●●●●●●●●●●
         │                              ●●●●●
     95% ┤                        ●●●●●
         │                   ●●●●
     90% ┤              ●●●●
         │         ●●●●
     85% ┤    ●●●●
         │●●●
     80% ┼────┬────┬────┬────┬────┬────┬────┬────┬────┬───►
         0   500  1000 1500 2000 2500 3000 3500 4000 4500  Latency (ms)


KEY INSIGHT:
────────────
Tor latency (500-5000ms) >> Measurement error (±30ms)
Therefore, measurements are highly accurate for our use case!
```

### 5.4 Systematic vs Random Errors

```python
# Understanding error types

# SYSTEMATIC ERROR (Bias)
# ──────────────────────
# Consistent offset in same direction
# Example: Event Bridge always receives events 5ms after they occur
#
# measured_latency = true_latency + 5ms (always)
#
# Mitigation: Can be calibrated out
# Impact: Shifts all measurements by same amount
#         Relative comparisons still valid!


# RANDOM ERROR (Noise)
# ────────────────────
# Variable offset in random direction
# Example: Network jitter adds -2ms to +2ms randomly
#
# measured_latency = true_latency + random(-2ms, +2ms)
#
# Mitigation: Statistical averaging
# Impact: Individual measurements noisy
#         Aggregates (mean, median) are accurate


# WHY THIS MATTERS FOR FORENSICS:
# ───────────────────────────────
# We care about:
# 1. Comparing latencies between different paths → Systematic errors cancel!
# 2. Detecting anomalies (unusually high latency) → Random noise averages out!
# 3. Trends over time → Both error types become negligible!
```

---

## 6. Clock Synchronization

### 6.1 Clock Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CLOCK SYNCHRONIZATION                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                          ┌─────────────┐                                │
│                          │  NTP Server │                                │
│                          │ (Internet)  │                                │
│                          └──────┬──────┘                                │
│                                 │                                       │
│                                 │ NTP Sync                              │
│                                 │ (±10ms typical)                       │
│                                 │                                       │
│                                 ▼                                       │
│                     ┌───────────────────────┐                           │
│                     │     Host Machine      │                           │
│                     │   (Proxmox/Debian)    │                           │
│                     └───────────┬───────────┘                           │
│                                 │                                       │
│              ┌──────────────────┼──────────────────┐                    │
│              │                  │                  │                    │
│              ▼                  ▼                  ▼                    │
│      ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│      │  Container  │    │  Container  │    │  Container  │              │
│      │  (Django)   │    │  (SimpleX)  │    │  (Tor Node) │              │
│      └─────────────┘    └─────────────┘    └─────────────┘              │
│                                                                         │
│      All containers inherit host clock                                  │
│      No additional drift between containers                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 NTP Configuration

```bash
# Host machine NTP setup (Debian/Ubuntu)

# Install chrony (better than ntpd)
apt install chrony

# Configure /etc/chrony/chrony.conf
server 0.pool.ntp.org iburst
server 1.pool.ntp.org iburst
server 2.pool.ntp.org iburst
server 3.pool.ntp.org iburst

# For isolated networks, use local reference
local stratum 10

# Allow containers to query (if needed)
allow 172.16.0.0/12

# Check synchronization status
chronyc tracking
# Reference ID    : A9FEA9FE (time.cloudflare.com)
# Stratum         : 3
# Ref time (UTC)  : Fri Jan 17 14:30:00 2026
# System time     : 0.000001234 seconds fast of NTP time
# Last offset     : +0.000000567 seconds
```

### 6.3 Docker Time Handling

```yaml
# docker-compose.yml - Time configuration

services:
  app:
    # Containers use host clock by default
    # No special configuration needed
    
    # If you need explicit timezone:
    environment:
      - TZ=UTC
    
    # For containers that need NTP access:
    # (Not recommended - use host sync instead)
    # cap_add:
    #   - SYS_TIME
```

### 6.4 Verifying Clock Sync

```bash
# Check host time
date -u
# Fri Jan 17 14:30:00 UTC 2026

# Check container time
docker exec simplex-monitor-app date -u
# Fri Jan 17 14:30:00 UTC 2026

# Check time difference between containers
docker exec simplex-client-alice date +%s.%N
docker exec simplex-client-bob date +%s.%N
# Should be identical (same host clock)

# Check NTP sync status
timedatectl status
# System clock synchronized: yes
# NTP service: active
```

---

## 7. Metrics Reference

### 7.1 Message Metrics

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| `message.send_latency` | Histogram | ms | Time from send initiation to send confirmed |
| `message.delivery_latency` | Histogram | ms | Time from send confirmed to delivered |
| `message.total_latency` | Histogram | ms | End-to-end latency |
| `message.sent_count` | Counter | count | Total messages sent |
| `message.received_count` | Counter | count | Total messages received |
| `message.failed_count` | Counter | count | Failed message deliveries |
| `message.pending_count` | Gauge | count | Messages awaiting delivery confirmation |

### 7.2 Connection Metrics

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| `connection.established_count` | Counter | count | New connections created |
| `connection.failed_count` | Counter | count | Connection attempts failed |
| `connection.active_count` | Gauge | count | Currently active connections |
| `connection.handshake_latency` | Histogram | ms | Time to establish connection |

### 7.3 Tor Network Metrics

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| `tor.circuit.build_time` | Histogram | ms | Time to build a circuit |
| `tor.circuit.active_count` | Gauge | count | Currently active circuits |
| `tor.circuit.failed_count` | Counter | count | Circuit build failures |
| `tor.bandwidth.read` | Counter | bytes | Total bytes read |
| `tor.bandwidth.written` | Counter | bytes | Total bytes written |
| `tor.consensus.fetch_time` | Histogram | ms | Time to fetch consensus |
| `tor.descriptor.fetch_time` | Histogram | ms | Time to fetch descriptors |

### 7.4 System Metrics

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| `bridge.connected_clients` | Gauge | count | Containers monitored by Event Bridge |
| `bridge.events_processed` | Counter | count | Total events processed |
| `bridge.event_processing_time` | Histogram | ms | Time to process each event |
| `websocket.connections` | Gauge | count | Active browser connections |
| `websocket.messages_sent` | Counter | count | Messages sent to browsers |

### 7.5 Metric Labels

```python
# All metrics should include relevant labels

message_latency.labels(
    sender="alice",
    recipient="bob",
    connection_mode="chutnex_internal",  # or "clearnet", "tor"
    network="berlin",                     # ChutneX network name
).observe(latency_ms)

circuit_build_time.labels(
    node_type="client",      # da, guard, middle, exit, client
    network="berlin",
    purpose="general",       # general, hs_client, hs_service
).observe(build_time_ms)
```

---

## 8. Data Flow Timing

### 8.1 Complete Timing Breakdown

```
EVENT TIMING BREAKDOWN (Microsecond Precision)
══════════════════════════════════════════════

T+0.000ms     │ SimpleX container processes message
              │ Internal event generated
              │
T+0.100ms     │ WebSocket frame created
              │ JSON serialization
              │
T+0.500ms     │ WebSocket frame sent
              │ TCP transmission to Event Bridge
              │
T+1.000ms     │ Event Bridge receives frame
              │ Network latency (~0.5ms Docker internal)
              │
T+1.100ms     │ JSON deserialization
              │ Event parsing begins
              │
T+1.500ms     │ Event handler called
              │ >>> TIMESTAMP CAPTURED HERE <<<
              │
T+2.000ms     │ Database query prepared
              │ Connection pool acquisition
              │
T+3.000ms     │ Database INSERT executed
              │ PostgreSQL write
              │
T+5.000ms     │ Redis PUBLISH executed
              │ Channel layer group_send
              │
T+5.500ms     │ Consumer receives from Redis
              │ Pub/Sub delivery
              │
T+6.000ms     │ WebSocket frame sent to browser
              │ JSON serialization + TCP
              │
T+10.000ms    │ Browser receives frame
              │ Network latency to client
              │
T+10.500ms    │ React state updated
              │ UI render scheduled
              │
T+15.000ms    │ UI updated
              │ User sees new data


TOTAL PROCESSING OVERHEAD: ~15ms
MEASUREMENT CAPTURED AT: T+1.5ms
MEASUREMENT ERROR: ±1.5ms (systematic)
```

### 8.2 Timing Diagram

```
Container          Event Bridge           Redis            Browser
    │                   │                   │                 │
    │   WebSocket       │                   │                 │
    │   Event           │                   │                 │
    ├──────────────────►│                   │                 │
    │     ~1ms          │                   │                 │
    │                   │                   │                 │
    │                   │ ──► Timestamp     │                 │
    │                   │     captured      │                 │
    │                   │     (t=1.5ms)     │                 │
    │                   │                   │                 │
    │                   │   group_send()    │                 │
    │                   ├──────────────────►│                 │
    │                   │     ~3.5ms        │                 │
    │                   │                   │                 │
    │                   │                   │   Pub/Sub       │
    │                   │                   ├────────────────►│
    │                   │                   │     ~5ms        │
    │                   │                   │                 │
    │                   │                   │                 │ UI Update
    │                   │                   │                 │ (t=15ms)
    │                   │                   │                 │
```

---

## 9. Calibration Procedures

### 9.1 Baseline Calibration

```python
# scripts/calibrate_telemetry.py

"""
Telemetry Calibration Script

Purpose: Measure systematic timing offsets in the measurement pipeline.

Method:
1. Send messages with known timing
2. Compare measured latency to expected latency
3. Calculate systematic offset
4. Store calibration factor
"""

import asyncio
from datetime import datetime, timezone
from statistics import mean, stdev

async def calibration_test(num_samples: int = 100):
    """
    Run calibration test.
    
    Sends messages through local loopback (no Tor)
    to measure pure system overhead.
    """
    results = []
    
    for i in range(num_samples):
        # Record precise send time
        send_time = datetime.now(timezone.utc)
        
        # Send message through system
        tracking_id = await send_test_message()
        
        # Wait for delivery confirmation
        delivery_time = await wait_for_delivery(tracking_id)
        
        # Calculate measured latency
        measured_ms = (delivery_time - send_time).total_seconds() * 1000
        
        # Expected latency for loopback: ~10ms
        expected_ms = 10
        
        # Record offset
        offset = measured_ms - expected_ms
        results.append(offset)
        
        await asyncio.sleep(0.1)  # Avoid flooding
    
    # Calculate calibration factors
    mean_offset = mean(results)
    std_offset = stdev(results)
    
    print(f"Calibration Results (n={num_samples}):")
    print(f"  Mean offset: {mean_offset:.2f}ms")
    print(f"  Std deviation: {std_offset:.2f}ms")
    print(f"  95% CI: {mean_offset - 2*std_offset:.2f}ms to {mean_offset + 2*std_offset:.2f}ms")
    
    return {
        'mean_offset_ms': mean_offset,
        'std_offset_ms': std_offset,
        'samples': num_samples,
        'calibrated_at': datetime.now(timezone.utc).isoformat(),
    }
```

### 9.2 Network-Specific Calibration

```python
# Calibration for different network types

CALIBRATION_OFFSETS = {
    # Network type: (mean_offset_ms, std_offset_ms)
    'loopback': (2.5, 0.5),        # Same container
    'docker_internal': (5.0, 1.0), # Docker bridge network
    'chutnex': (8.0, 2.0),         # ChutneX private Tor
    'public_tor': (15.0, 5.0),     # Public Tor network
}

def apply_calibration(raw_latency_ms: int, network_type: str) -> int:
    """Apply calibration offset to raw measurement."""
    if network_type in CALIBRATION_OFFSETS:
        offset, _ = CALIBRATION_OFFSETS[network_type]
        return max(0, raw_latency_ms - int(offset))
    return raw_latency_ms
```

### 9.3 Periodic Recalibration

```python
# Automated recalibration schedule

from celery import shared_task
from celery.schedules import crontab

@shared_task
def recalibrate_telemetry():
    """
    Run weekly recalibration.
    
    Schedule: Every Sunday at 3:00 AM UTC
    """
    results = asyncio.run(calibration_test(num_samples=500))
    
    # Store results
    CalibrationResult.objects.create(
        network_type='chutnex',
        mean_offset_ms=results['mean_offset_ms'],
        std_offset_ms=results['std_offset_ms'],
        samples=results['samples'],
    )
    
    # Update active calibration
    update_calibration_config(results)

# Celery beat schedule
CELERY_BEAT_SCHEDULE = {
    'recalibrate-telemetry-weekly': {
        'task': 'telemetry.tasks.recalibrate_telemetry',
        'schedule': crontab(hour=3, minute=0, day_of_week=0),
    },
}
```

---

## 10. Statistical Analysis

### 10.1 Latency Distribution

```
TYPICAL LATENCY DISTRIBUTION (ChutneX Network)
══════════════════════════════════════════════

Frequency
    │
 15%┤        ████
    │       ██████
 12%┤      ████████
    │     ██████████
  9%┤    ████████████
    │   ██████████████
  6%┤  ████████████████
    │ ██████████████████
  3%┤████████████████████████
    │██████████████████████████████
  0%┼──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──►
    0  500 1000 1500 2000 2500 3000 3500 4000 4500 5000  Latency (ms)

Distribution: Log-normal (typical for network latencies)
Mode: ~1200ms
Median (p50): ~1500ms
Mean: ~1800ms
p95: ~3500ms
p99: ~5000ms
```

### 10.2 Statistical Queries

```python
# clients/services/analytics.py

from django.db.models import Avg, Min, Max, StdDev, Count
from django.db.models.functions import Percentile

class LatencyAnalytics:
    """Statistical analysis of latency measurements."""
    
    def get_summary_stats(
        self, 
        client_slug: str = None,
        time_range: timedelta = timedelta(hours=24)
    ) -> dict:
        """Get summary statistics for latency."""
        
        queryset = TrackedMessage.objects.filter(
            total_latency_ms__isnull=False,
            delivered_at__gte=timezone.now() - time_range,
        )
        
        if client_slug:
            queryset = queryset.filter(
                Q(sender__slug=client_slug) | Q(recipient__slug=client_slug)
            )
        
        stats = queryset.aggregate(
            count=Count('id'),
            mean=Avg('total_latency_ms'),
            min=Min('total_latency_ms'),
            max=Max('total_latency_ms'),
            stddev=StdDev('total_latency_ms'),
        )
        
        # Calculate percentiles
        latencies = list(queryset.values_list('total_latency_ms', flat=True))
        latencies.sort()
        
        if latencies:
            stats['p50'] = latencies[len(latencies) // 2]
            stats['p90'] = latencies[int(len(latencies) * 0.90)]
            stats['p95'] = latencies[int(len(latencies) * 0.95)]
            stats['p99'] = latencies[int(len(latencies) * 0.99)]
        
        return stats
    
    def detect_anomalies(
        self,
        threshold_stddev: float = 3.0
    ) -> QuerySet:
        """Detect anomalous latencies using Z-score method."""
        
        stats = self.get_summary_stats()
        
        if not stats['mean'] or not stats['stddev']:
            return TrackedMessage.objects.none()
        
        upper_bound = stats['mean'] + (threshold_stddev * stats['stddev'])
        
        return TrackedMessage.objects.filter(
            total_latency_ms__gt=upper_bound,
            delivered_at__gte=timezone.now() - timedelta(hours=24),
        )
```

### 10.3 Time Series Analysis

```python
# Latency trends over time

def get_latency_timeseries(
    bucket_size: str = '1h',
    time_range: timedelta = timedelta(days=7)
) -> list:
    """
    Get latency statistics bucketed by time.
    
    Args:
        bucket_size: '1m', '5m', '15m', '1h', '6h', '1d'
        time_range: How far back to look
    
    Returns:
        List of {timestamp, mean, p50, p95, count}
    """
    
    # PostgreSQL time bucket query
    sql = """
        SELECT 
            date_trunc(%s, delivered_at) as bucket,
            COUNT(*) as count,
            AVG(total_latency_ms) as mean,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_latency_ms) as p50,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_latency_ms) as p95
        FROM clients_trackedmessage
        WHERE delivered_at >= %s
          AND total_latency_ms IS NOT NULL
        GROUP BY bucket
        ORDER BY bucket
    """
    
    bucket_map = {
        '1m': 'minute',
        '5m': 'minute',  # Will need additional grouping
        '15m': 'minute',
        '1h': 'hour',
        '6h': 'hour',
        '1d': 'day',
    }
    
    with connection.cursor() as cursor:
        cursor.execute(sql, [bucket_map[bucket_size], timezone.now() - time_range])
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]
```

---

## 11. Storage & Retention

### 11.1 Data Storage Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DATA STORAGE STRATEGY                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   HOT DATA (0-24 hours)                                                 │
│   ═════════════════════                                                 │
│   Storage: PostgreSQL + Redis                                           │
│   Granularity: Individual events                                        │
│   Access: Real-time queries, WebSocket updates                          │
│   Retention: 24-48 hours                                                │
│                                                                         │
│                                                                         │
│   WARM DATA (1-30 days)                                                 │
│   ═════════════════════                                                 │
│   Storage: PostgreSQL                                                   │
│   Granularity: Individual events                                        │
│   Access: API queries, reports                                          │
│   Retention: 30 days                                                    │
│                                                                         │
│                                                                         │
│   COLD DATA (30+ days)                                                  │
│   ════════════════════                                                  │
│   Storage: InfluxDB (time-series) or PostgreSQL archive                 │
│   Granularity: Hourly/Daily aggregates                                  │
│   Access: Historical analysis, trend reports                            │
│   Retention: 1 year                                                     │
│                                                                         │
│                                                                         │
│   ARCHIVE (1+ years)                                                    │
│   ═══════════════════                                                   │
│   Storage: Compressed exports (CSV/Parquet)                             │
│   Granularity: Daily aggregates                                         │
│   Access: Offline analysis                                              │
│   Retention: Indefinite                                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Database Schema

```python
# clients/models.py - Telemetry models

class TrackedMessage(models.Model):
    """Individual message with full telemetry."""
    
    class Meta:
        indexes = [
            models.Index(fields=['delivered_at']),
            models.Index(fields=['sender', 'delivered_at']),
            models.Index(fields=['total_latency_ms']),
        ]
    
    # ... fields defined earlier ...


class LatencyAggregate(models.Model):
    """
    Hourly latency aggregates for long-term storage.
    
    Created by periodic aggregation job.
    Used for historical analysis after raw data is archived.
    """
    
    class Meta:
        unique_together = ['hour', 'sender', 'recipient', 'network']
        indexes = [
            models.Index(fields=['hour']),
            models.Index(fields=['network', 'hour']),
        ]
    
    hour = models.DateTimeField()  # Truncated to hour
    sender = models.ForeignKey('SimplexClient', on_delete=models.CASCADE, related_name='+')
    recipient = models.ForeignKey('SimplexClient', on_delete=models.CASCADE, related_name='+')
    network = models.ForeignKey('chutney.TorNetwork', on_delete=models.CASCADE, null=True)
    
    # Aggregated metrics
    message_count = models.IntegerField()
    latency_sum_ms = models.BigIntegerField()  # For calculating mean
    latency_min_ms = models.IntegerField()
    latency_max_ms = models.IntegerField()
    latency_p50_ms = models.IntegerField()
    latency_p95_ms = models.IntegerField()
    latency_p99_ms = models.IntegerField()
    
    @property
    def latency_mean_ms(self) -> float:
        return self.latency_sum_ms / self.message_count if self.message_count else 0
```

### 11.3 Retention Policies

```python
# telemetry/tasks.py

from celery import shared_task
from datetime import timedelta

@shared_task
def aggregate_old_latency_data():
    """
    Aggregate raw latency data older than 30 days into hourly buckets.
    
    Schedule: Daily at 2:00 AM UTC
    """
    cutoff = timezone.now() - timedelta(days=30)
    
    # Get data to aggregate
    old_messages = TrackedMessage.objects.filter(
        delivered_at__lt=cutoff,
        total_latency_ms__isnull=False,
    )
    
    # Group by hour, sender, recipient, network
    # Calculate aggregates
    # Insert into LatencyAggregate
    # Delete from TrackedMessage
    
    logger.info(f"Aggregated {old_messages.count()} messages")


@shared_task  
def cleanup_expired_data():
    """
    Remove data beyond retention period.
    
    Schedule: Weekly on Sunday at 4:00 AM UTC
    """
    
    # Delete aggregates older than 1 year
    year_ago = timezone.now() - timedelta(days=365)
    deleted, _ = LatencyAggregate.objects.filter(hour__lt=year_ago).delete()
    logger.info(f"Deleted {deleted} old aggregate records")
    
    # Delete orphaned tracking records
    week_ago = timezone.now() - timedelta(days=7)
    deleted, _ = TrackedMessage.objects.filter(
        delivered_at__isnull=True,  # Never delivered
        created_at__lt=week_ago,
    ).delete()
    logger.info(f"Deleted {deleted} orphaned tracking records")
```

---

## 12. Visualization & Reporting

### 12.1 Dashboard Widgets

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TELEMETRY DASHBOARD                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────┐  ┌─────────────────────┐  ┌───────────────┐   │
│   │   CURRENT LATENCY   │  │  MESSAGE THROUGHPUT │  │    HEALTH     │   │
│   │                     │  │                     │  │               │   │
│   │      1,247 ms       │  │     127 msg/min     │  │   ● HEALTHY   │   │
│   │        p50          │  │                     │  │               │   │
│   │                     │  │     ▄▄▄█▄▄▄         │  │  99.2% success│   │
│   │   ▼ 12% vs 1h ago   │  │                     │  │               │   │
│   └─────────────────────┘  └─────────────────────┘  └───────────────┘   │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    LATENCY OVER TIME (24h)                      │   │
│   │                                                                 │   │
│   │  3000ms ┤                                                       │   │
│   │         │    ╭─╮                              ╭╮                │   │
│   │  2000ms ┤   ╭╯ ╰╮    ╭──╮            ╭──╮   ╭╯╰╮                │   │
│   │         │ ╭─╯   ╰────╯  ╰────────────╯  ╰───╯  ╰───────         │   │
│   │  1000ms ┤─╯                                                     │   │
│   │         │                                                       │   │
│   │     0ms ┼────┬────┬────┬────┬────┬────┬────┬────┬────┬────►     │   │
│   │         00   03   06   09   12   15   18   21   24   Time       │   │
│   │                                                                 │   │
│   │   ── p50    ── p95    ▬▬ p99                                    │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│   ┌───────────────────────────────┐  ┌──────────────────────────────┐   │
│   │    LATENCY DISTRIBUTION       │  │    TOP SLOW ROUTES           │   │
│   │                               │  │                              │   │
│   │   ████████████  45%  0-1s     │  │  alice → bob      2,340ms    │   │
│   │   ██████████    35%  1-2s     │  │  charlie → dave   2,180ms    │   │
│   │   ████          12%  2-3s     │  │  bob → alice      1,980ms    │   │
│   │   ██             5%  3-4s     │  │  eve → frank      1,850ms    │   │
│   │   █              3%  >4s      │  │  dave → charlie   1,720ms    │   │
│   │                               │  │                              │   │
│   └───────────────────────────────┘  └──────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Grafana Integration

```yaml
# grafana/dashboards/telemetry.json (excerpt)

{
  "panels": [
    {
      "title": "Message Latency (p50, p95, p99)",
      "type": "timeseries",
      "datasource": "PostgreSQL",
      "targets": [
        {
          "rawSql": "SELECT delivered_at as time, total_latency_ms as p50 FROM clients_trackedmessage WHERE $__timeFilter(delivered_at)",
          "format": "time_series"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "unit": "ms",
          "thresholds": {
            "steps": [
              {"value": 0, "color": "green"},
              {"value": 2000, "color": "yellow"},
              {"value": 5000, "color": "red"}
            ]
          }
        }
      }
    }
  ]
}
```

### 12.3 Export Formats

```python
# telemetry/exports.py

class TelemetryExporter:
    """Export telemetry data in various formats."""
    
    def export_csv(
        self, 
        queryset: QuerySet, 
        filepath: str
    ) -> None:
        """Export to CSV."""
        import csv
        
        with open(filepath, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                'tracking_id', 'sender', 'recipient',
                'send_initiated_at', 'delivered_at',
                'total_latency_ms', 'network'
            ])
            
            for msg in queryset.iterator():
                writer.writerow([
                    msg.tracking_id,
                    msg.sender.slug,
                    msg.recipient.slug,
                    msg.send_initiated_at.isoformat(),
                    msg.delivered_at.isoformat() if msg.delivered_at else '',
                    msg.total_latency_ms or '',
                    msg.network.slug if msg.network else '',
                ])
    
    def export_json(self, queryset: QuerySet, filepath: str) -> None:
        """Export to JSON Lines format."""
        import json
        
        with open(filepath, 'w') as f:
            for msg in queryset.iterator():
                f.write(json.dumps({
                    'tracking_id': str(msg.tracking_id),
                    'sender': msg.sender.slug,
                    'recipient': msg.recipient.slug,
                    'timestamps': {
                        'send_initiated': msg.send_initiated_at.isoformat(),
                        'delivered': msg.delivered_at.isoformat() if msg.delivered_at else None,
                    },
                    'latency_ms': msg.total_latency_ms,
                    'network': msg.network.slug if msg.network else None,
                }) + '\n')
```

---

## 13. Performance Impact

### 13.1 Overhead Analysis

```
TELEMETRY OVERHEAD BUDGET
═════════════════════════

Component                    │ CPU Impact │ Memory  │ Latency Add
─────────────────────────────┼────────────┼─────────┼─────────────
Event Bridge (per event)     │ ~0.1ms     │ ~1KB    │ ~0.5ms
Timestamp capture            │ ~0.001ms   │ ~100B   │ ~0.001ms
Database INSERT              │ ~1ms       │ ~500B   │ ~0ms (async)
Redis PUBLISH                │ ~0.5ms     │ ~200B   │ ~0ms (async)
Statistics calculation       │ ~0.1ms     │ ~1KB    │ ~0ms (async)
─────────────────────────────┼────────────┼─────────┼─────────────
TOTAL per message            │ ~2ms       │ ~3KB    │ ~0.5ms


ACCEPTABLE OVERHEAD:
───────────────────
- Tor latency: 500-5000ms
- Measurement overhead: 0.5ms
- Overhead ratio: 0.01% - 0.1%

CONCLUSION: Negligible impact on measured values.
```

### 13.2 Scaling Considerations

```
MESSAGE RATE SCALING
════════════════════

Rate         │ Event Bridge │ PostgreSQL  │ Redis      │ Status
─────────────┼──────────────┼─────────────┼────────────┼────────
1 msg/s      │ Idle         │ Idle        │ Idle       │ ✅ OK
10 msg/s     │ ~1% CPU      │ ~100 IOPS   │ ~100 ops/s │ ✅ OK
100 msg/s    │ ~5% CPU      │ ~1000 IOPS  │ ~1000 ops/s│ ✅ OK
1000 msg/s   │ ~30% CPU     │ ~10K IOPS   │ ~10K ops/s │ ⚠️ Monitor
10000 msg/s  │ ~100% CPU    │ ~100K IOPS  │ ~100K ops/s│ ❌ Scale out


BOTTLENECKS BY RATE:
───────────────────
< 100 msg/s:   No bottlenecks (current design handles easily)
100-1000:      PostgreSQL write throughput (add connection pooling)
1000-10000:    Event Bridge CPU (add worker processes)
> 10000:       Redis throughput (add clustering)
```

### 13.3 Optimization Techniques

```python
# Bulk insert for high-volume scenarios

class OptimizedEventBridge:
    """Event bridge with bulk operations for high throughput."""
    
    def __init__(self):
        self.pending_inserts = []
        self.insert_batch_size = 100
        self.insert_interval_ms = 100
    
    async def _buffer_insert(self, message: TrackedMessage):
        """Buffer inserts for bulk operation."""
        self.pending_inserts.append(message)
        
        if len(self.pending_inserts) >= self.insert_batch_size:
            await self._flush_inserts()
    
    async def _flush_inserts(self):
        """Bulk insert buffered messages."""
        if not self.pending_inserts:
            return
        
        # Bulk create is much faster than individual inserts
        TrackedMessage.objects.bulk_create(
            self.pending_inserts,
            ignore_conflicts=True
        )
        
        self.pending_inserts = []
```

---

## 14. Troubleshooting

### 14.1 Common Issues

| Symptom | Possible Cause | Solution |
|---------|---------------|----------|
| Latency always 0ms | Timestamps not captured | Check event parsing |
| Latency negative | Clock sync issue | Verify NTP on all containers |
| Missing measurements | Event Bridge disconnected | Check WS connections |
| High variance | Network instability | Check Tor circuit health |
| Sudden spike | Circuit rebuild | Normal Tor behavior |

### 14.2 Diagnostic Commands

```bash
# Check Event Bridge status
docker compose logs app | grep -i "latency\|event\|bridge"

# Check timestamp precision
docker compose exec app python manage.py shell -c "
from datetime import datetime, timezone
import time

for _ in range(5):
    print(datetime.now(timezone.utc).isoformat())
    time.sleep(0.001)
"

# Check database timestamp storage
docker compose exec db psql -U postgres -d simplex -c "
SELECT 
    tracking_id,
    send_initiated_at,
    delivered_at,
    total_latency_ms,
    delivered_at - send_initiated_at as calculated_diff
FROM clients_trackedmessage
ORDER BY delivered_at DESC
LIMIT 5;
"

# Check NTP sync
timedatectl status
chronyc tracking

# Check Redis pub/sub activity
docker exec simplex-monitor-redis redis-cli MONITOR | grep -i latency
```

### 14.3 Validation Queries

```sql
-- Check for anomalies
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN total_latency_ms < 0 THEN 1 END) as negative,
    COUNT(CASE WHEN total_latency_ms > 30000 THEN 1 END) as very_high,
    COUNT(CASE WHEN total_latency_ms IS NULL THEN 1 END) as missing
FROM clients_trackedmessage
WHERE delivered_at > NOW() - INTERVAL '24 hours';

-- Check timestamp consistency
SELECT 
    tracking_id,
    send_initiated_at,
    send_confirmed_at,
    delivered_at,
    CASE 
        WHEN send_confirmed_at < send_initiated_at THEN 'INVALID: confirmed before initiated'
        WHEN delivered_at < send_confirmed_at THEN 'INVALID: delivered before confirmed'
        ELSE 'OK'
    END as validation
FROM clients_trackedmessage
WHERE delivered_at > NOW() - INTERVAL '1 hour'
  AND (
    send_confirmed_at < send_initiated_at
    OR delivered_at < send_confirmed_at
  );
```

---

## 15. Future Improvements

### 15.1 Planned Enhancements

| Enhancement | Priority | Complexity | Status |
|-------------|----------|------------|--------|
| OpenTelemetry integration | High | Medium | Planned |
| Distributed tracing | High | High | Planned |
| ML anomaly detection | Medium | High | Research |
| Prometheus metrics export | Medium | Low | Planned |
| Real-time alerting | Medium | Medium | Planned |
| Geographic latency analysis | Low | Medium | Backlog |
| Cross-network comparison | Low | Medium | Backlog |

### 15.2 OpenTelemetry Roadmap

```python
# Future: OpenTelemetry integration

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Initialize tracing
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

# Instrument message sending
async def send_message_with_tracing(client, recipient, content):
    with tracer.start_as_current_span("message.send") as span:
        span.set_attribute("sender", client.slug)
        span.set_attribute("recipient", recipient.slug)
        span.set_attribute("content_length", len(content))
        
        # Send message
        tracking_id = await send_message(client, recipient, content)
        
        span.set_attribute("tracking_id", str(tracking_id))
        return tracking_id
```

### 15.3 Advanced Analytics Roadmap

```
PHASE 1 (Current): Basic Latency Measurement
├── End-to-end latency
├── Message counters
└── Simple statistics

PHASE 2 (Q2 2026): Enhanced Analytics
├── Segment latency breakdown
├── Path analysis
├── Anomaly detection (statistical)
└── Automated alerting

PHASE 3 (Q3 2026): ML Integration
├── Predictive latency modeling
├── Anomaly detection (ML-based)
├── Traffic pattern recognition
└── Automatic root cause analysis

PHASE 4 (Q4 2026): Enterprise Features
├── Multi-network correlation
├── SLA monitoring
├── Capacity planning
└── Compliance reporting
```

---

## Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         KEY TAKEAWAYS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. MEASUREMENT ACCURACY: ±30ms typical, 99%+ accurate for Tor latency  │
│                                                                         │
│  2. TIMESTAMP SOURCE: Event Bridge captures timestamps before Redis     │
│                                                                         │
│  3. CLOCK SYNC: All containers use host clock via Docker (no drift)     │
│                                                                         │
│  4. STORAGE: PostgreSQL for raw data, aggregates for long-term          │
│                                                                         │
│  5. PERFORMANCE: <0.1% overhead on measured latency                     │
│                                                                         │
│  6. SCALING: Current design handles 100+ msg/s easily                   │
│                                                                         │
│  7. CALIBRATION: Weekly automated calibration recommended               │
│                                                                         │
│  8. FORENSICS: Measurement precision far exceeds Tor variance           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

*Document Version: 1.0*  
*Last Updated: January 17, 2026*  
*Author: cannatoshi*

**🔬 SimpleX SMP Monitor - Telemetry & Measurement Guide**