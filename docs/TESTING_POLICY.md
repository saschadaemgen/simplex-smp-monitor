# Testing Policy / Test-Richtlinien

> **SimpleX SMP Monitor** - Guidelines for Testing SimpleX Infrastructure

---

## English

### Overview

This document defines what testing activities are **permitted**, **restricted**, or **prohibited** when using SimpleX SMP Monitor.

### Three Testing Environments

| Environment | Description | Restrictions |
|-------------|-------------|--------------|
| **Own Infrastructure** | Servers you own and operate | No restrictions |
| **Public SimpleX Servers** | Official and community servers | Normal use only |
| **Third-Party Servers** | Any server without authorization | Prohibited |

---

### Own Infrastructure (No Restrictions)

When testing on servers you **own and operate**, you may perform:

- **Stress Testing** - High-volume message tests at any interval
- **Load Testing** - Simulating hundreds of concurrent clients
- **Penetration Testing** - Security assessments
- **Performance Testing** - Latency and throughput measurements
- **Reliability Testing** - Long-duration message delivery tests
- **Failure Testing** - Intentional server overload scenarios

**Example configurations for own infrastructure:**

| Test Type | Clients | Interval | Status |
|-----------|---------|----------|--------|
| Stress Test | 100 | 100ms | Allowed |
| Load Test | 500 | 1s | Allowed |
| Burst Test | 50 | 10ms | Allowed |

---

### Public SimpleX Servers (Normal Use Only)

When using **official SimpleX servers** or **community-operated servers**, you may perform:

#### Permitted Activities

- **Compatibility Testing** - Verify your client works with the server
- **Functional Testing** - Test message delivery, receipts, connections
- **Normal Message Traffic** - Messages at human-realistic intervals

#### Permitted Test Parameters

| Parameter | Recommended | Maximum | Rationale |
|-----------|-------------|---------|-----------|
| **Clients** | 2-5 | 10 | Simulates realistic user group |
| **Interval** | 30s | 10s | Normal conversation pace |
| **Duration** | 5-30 min | 2 hours | Sufficient for functional testing |
| **Messages/min** | 2-6 | 60 | Well below abuse thresholds |

#### Example: Acceptable Compatibility Test
```
Scenario: Verify fork client works with public SimpleX servers

Setup:
- 10 test clients
- 10-second message interval
- 30-minute test duration

Traffic calculation:
- 10 clients x 6 messages/minute = 60 messages/minute total
- This is equivalent to an active group chat
- Well within normal usage patterns

Result: ACCEPTABLE - This is functional testing, not stress testing
```

#### Prohibited Activities on Public Servers

- **Stress Testing** - High-volume, rapid-fire messages
- **Load Testing** - Simulating server capacity limits
- **DoS/DDoS** - Any attempt to disrupt service
- **Vulnerability Scanning** - Security probing without permission

---

### Third-Party Servers (Prohibited Without Authorization)

Testing servers you do **not own** and have **no explicit permission** to test is:

- **Legally prohibited** under German and EU law
- **Violation** of SimpleX Terms of Service
- **Potentially criminal** under Paragraph 303b StGB

---

### Legal Framework

#### Germany (Paragraph 303b StGB - Computersabotage)

Disrupting data processing operations is punishable by:
- Up to **3 years imprisonment** (standard cases)
- Up to **5 years imprisonment** (significant damage)
- Up to **10 years imprisonment** (critical infrastructure)

Even **temporary** service disruption can meet the threshold for prosecution.

#### EU Directive 2013/40/EU

Article 4 criminalizes seriously hindering or interrupting the functioning of an information system by transmitting data without authorization.

#### SimpleX Terms of Service

SimpleX Chat Ltd Conditions of Use prohibit:
- Disrupting the integrity or performance of infrastructure
- Unauthorized access to infrastructure systems
- Server overloading or attacks

Source: https://simplex.chat/privacy/

---

### Decision Flowchart
```
Is this YOUR server?
    |
    +-- YES --> Any testing permitted
    |
    +-- NO --> Is it a PUBLIC SimpleX server?
                   |
                   +-- YES --> Is this NORMAL USE testing?
                   |               |
                   |               +-- YES (10 clients, 10s interval) --> Permitted
                   |               |
                   |               +-- NO (stress/load testing) --> PROHIBITED
                   |
                   +-- NO --> Do you have WRITTEN PERMISSION?
                                  |
                                  +-- YES --> Follow permission scope
                                  |
                                  +-- NO --> PROHIBITED
```

---

### Summary Table

| Activity | Own Servers | Public Servers | Unauthorized |
|----------|-------------|----------------|--------------|
| Compatibility Test | Yes | Yes | No |
| Functional Test | Yes | Yes | No |
| Normal Messages | Yes | Yes | No |
| Stress Test | Yes | No | No |
| Load Test | Yes | No | No |
| Penetration Test | Yes | No | No |

---

## Deutsch

### Uebersicht

Dieses Dokument definiert welche Testaktivitaeten **erlaubt**, **eingeschraenkt** oder **verboten** sind.

### Drei Test-Umgebungen

| Umgebung | Beschreibung | Einschraenkungen |
|----------|--------------|------------------|
| **Eigene Infrastruktur** | Server die Sie besitzen | Keine |
| **Oeffentliche SimpleX-Server** | Offizielle und Community-Server | Nur normale Nutzung |
| **Drittanbieter-Server** | Server ohne Autorisierung | Verboten |

---

### Eigene Infrastruktur (Keine Einschraenkungen)

Auf Servern die Sie **besitzen und betreiben**:

- **Stresstests** - Hochvolumige Nachrichtentests
- **Lasttests** - Simulation vieler Clients
- **Penetrationstests** - Sicherheitsbewertungen
- **Performance-Tests** - Latenz- und Durchsatzmessungen

---

### Oeffentliche SimpleX-Server (Nur Normale Nutzung)

#### Erlaubte Aktivitaeten

- **Kompatibilitaetstests** - Pruefung ob Client funktioniert
- **Funktionstests** - Test von Nachrichtenzustellung
- **Normaler Nachrichtenverkehr** - Menschlich-realistische Intervalle

#### Erlaubte Testparameter

| Parameter | Empfohlen | Maximum |
|-----------|-----------|---------|
| **Clients** | 2-5 | 10 |
| **Intervall** | 30s | 10s |
| **Dauer** | 5-30 min | 2 Stunden |

#### Verboten auf oeffentlichen Servern

- **Stresstests** - Hochvolumige Nachrichten
- **Lasttests** - Server-Kapazitaetsgrenzen testen
- **DoS/DDoS** - Dienststoerung
- **Schwachstellen-Scanning** - Ohne Erlaubnis

---

### Drittanbieter-Server (Verboten)

Testen ohne Autorisierung ist:

- **Rechtlich verboten** nach deutschem und EU-Recht
- **Verstoss** gegen SimpleX-Nutzungsbedingungen
- **Potenziell strafbar** nach Paragraph 303b StGB

---

### Rechtlicher Rahmen

#### Deutschland (Paragraph 303b StGB)

Stoerung von Datenverarbeitungsvorgaengen:
- Bis zu **3 Jahre** Freiheitsstrafe (Standard)
- Bis zu **5 Jahre** (erheblicher Schaden)
- Bis zu **10 Jahre** (kritische Infrastruktur)

#### EU-Richtlinie 2013/40/EU

Artikel 4 stellt Stoerung von Informationssystemen unter Strafe.

---

### Zusammenfassung

| Aktivitaet | Eigene Server | Oeffentlich | Ohne Autorisierung |
|------------|---------------|-------------|-------------------|
| Kompatibilitaetstest | Ja | Ja | Nein |
| Funktionstest | Ja | Ja | Nein |
| Normale Nachrichten | Ja | Ja | Nein |
| Stresstest | Ja | Nein | Nein |
| Lasttest | Ja | Nein | Nein |
| Penetrationstest | Ja | Nein | Nein |

---

*Last updated: December 2025*
