# Legal Information / Rechtliche Informationen

> **SimpleX SMP Monitor** - Legal Documentation Overview

---

## English

### Legal Documents

This project maintains the following legal documentation:

| Document | Description |
|----------|-------------|
| [LICENSE](LICENSE) | GNU Affero General Public License v3.0 (AGPL-3.0) |
| [TRADEMARK.md](TRADEMARK.md) | Trademark notice and third-party trademark information |
| [DISCLAIMER.md](DISCLAIMER.md) | Liability disclaimer and limitation of warranties |
| [TESTING_POLICY.md](TESTING_POLICY.md) | Testing guidelines and permitted use |

### Quick Summary

- **License:** This software is licensed under AGPL-3.0. You may use, modify, and distribute it under the terms of this license.
- **Trademarks:** "SimpleX" and "SimpleX Chat" are trademarks of SimpleX Chat Ltd. This project is **not affiliated with or endorsed by** SimpleX Chat Ltd.
- **Liability:** This software is provided "AS IS" without warranty. See [DISCLAIMER.md](DISCLAIMER.md) for full details.
- **Testing:** See [TESTING_POLICY.md](TESTING_POLICY.md) for what testing is permitted on own vs. third-party infrastructure.

---

### Third-Party Software

This project includes or uses the following third-party software:

#### SimpleX Software (AGPL-3.0)

The Docker images provided by this project contain **unmodified binaries** from official SimpleX GitHub releases. These binaries are:

| Software | Description | License | Source |
|----------|-------------|---------|--------|
| **simplex-chat** (CLI) | SimpleX Chat command-line client | AGPL-3.0 | [simplex-chat](https://github.com/simplex-chat/simplex-chat) |
| **smp-server** | SimpleX Messaging Protocol relay server | AGPL-3.0 | [simplexmq](https://github.com/simplex-chat/simplexmq) |
| **xftp-server** | SimpleX File Transfer Protocol server | AGPL-3.0 | [simplexmq](https://github.com/simplex-chat/simplexmq) |
| **ntf-server** | SimpleX Push Notification server (iOS) | AGPL-3.0 | [simplexmq](https://github.com/simplex-chat/simplexmq) |

**Important Notes:**

1. **No Modifications:** We do NOT modify the SimpleX binaries. We download official releases directly from GitHub and include them in our Docker images for convenience.

2. **Source Code Availability:** The complete source code for all SimpleX software is available at:
   - https://github.com/simplex-chat/simplex-chat (CLI client)
   - https://github.com/simplex-chat/simplexmq (SMP, XFTP, NTF servers)

3. **AGPL-3.0 Compliance:** Under AGPL-3.0, you have the right to:
   - Use the software for any purpose
   - Study and modify the source code
   - Distribute the software
   - Run the software and access it over a network

4. **Our Contribution:** Our Docker images add convenience (easier deployment) but do not modify the underlying SimpleX software.

#### Tor Software (BSD-3-Clause)

This project includes the Tor anonymity software for private network simulation (ChutneX).

| Software | Description | License | Source |
|----------|-------------|---------|--------|
| **Tor** | The Onion Router anonymity network | BSD-3-Clause | [torproject/tor](https://github.com/torproject/tor) |

**ChutneX - Private Tor Network:**

ChutneX is our custom implementation for creating isolated private Tor networks. It uses the official Tor software but runs in a completely isolated Docker environment.

| Aspect | Description |
|--------|-------------|
| **Purpose** | Forensic analysis and security testing |
| **Isolation** | 100% network isolation from public Tor |
| **Components** | Directory Authorities, Guard/Middle/Exit relays, Clients |
| **Legal Status** | Private networks for testing purposes |

**Important Notes:**

1. **No Public Tor Traffic:** ChutneX networks are completely isolated. Traffic never touches the public Tor network.

2. **Source Code:** Tor source code is available at https://github.com/torproject/tor

3. **BSD-3-Clause Compliance:** The Tor license permits:
   - Use for any purpose
   - Modification and distribution
   - Commercial and non-commercial use
   - No requirement to share modifications (permissive license)

4. **Trademark:** "Tor" and the Tor logo are trademarks of The Tor Project, Inc. This project is **not affiliated with or endorsed by** The Tor Project.

#### Other Dependencies

| Component | License | Usage |
|-----------|---------|-------|
| Django | BSD-3-Clause | Web framework |
| Django REST Framework | BSD-3-Clause | API framework |
| Django Channels | BSD-3-Clause | WebSocket support |
| React | MIT | Frontend framework |
| Vite | MIT | Build tool |
| Tailwind CSS | MIT | Styling |
| Redis | BSD-3-Clause | Message broker |
| PostgreSQL | PostgreSQL License | Database |
| Nginx | BSD-2-Clause | Reverse proxy |
| InfluxDB | MIT | Time-series metrics |
| Grafana | AGPL-3.0 | Dashboards |
| Docker | Apache-2.0 | Containerization |

---

### Docker Images and Binary Distribution

#### What We Distribute

| Image | Contents | License Compliance |
|-------|----------|-------------------|
| `simplex-smp-monitor-app` | Django + React application | AGPL-3.0 (our code) |
| `simplex-smp-monitor-nginx` | Nginx reverse proxy | BSD-2-Clause |
| `simplex-smp` | smp-server binary | AGPL-3.0 (SimpleX) |
| `simplex-smp-tor` | smp-server + Tor | AGPL-3.0 + BSD-3-Clause |
| `simplex-xftp` | xftp-server binary | AGPL-3.0 (SimpleX) |
| `simplex-ntf` | ntf-server binary | AGPL-3.0 (SimpleX) |
| `simplex-cli` | simplex-chat binary | AGPL-3.0 (SimpleX) |
| `chutnex` | Tor + ChutneX scripts | BSD-3-Clause (Tor) + AGPL-3.0 (our scripts) |

#### Your Rights Under AGPL-3.0

When using our Docker images containing SimpleX software:

1. **Source Code Access:** You can obtain the complete source code from the links above.

2. **No Additional Restrictions:** We do not add any restrictions beyond AGPL-3.0.

3. **Network Use:** If you modify and run SimpleX software accessible over a network, AGPL-3.0 requires you to provide source code access to users.

4. **Attribution:** We provide proper attribution to SimpleX Chat Ltd as the original authors.

---

### Legal Status of Tor Operation

#### Germany / European Union

Operating Tor software is **legal** in Germany and the European Union:

| Activity | Legal Status | Reference |
|----------|--------------|-----------|
| Running Tor client | ✅ Legal | General freedom of communication |
| Running Tor relay | ✅ Legal | BGH I ZR 64/17 (2018) |
| Running Tor exit node | ✅ Legal (with risks) | TMG §8 (provider privilege) |
| Private Tor network | ✅ Legal | No public traffic involved |
| Security research | ✅ Legal | BVerfG 2009 (dual-use tools) |

**Important:** This applies to your own infrastructure. Testing third-party systems requires authorization.

#### Key Legal Precedents (Germany)

| Case | Year | Ruling |
|------|------|--------|
| **BGH I ZR 64/17** | 2018 | Tor relay operators are not liable for user traffic |
| **BVerfG** | 2009 | Development of dual-use security tools is legal |
| **TMG §8** | 2007 | Provider privilege for transit traffic |

#### ChutneX Specific

ChutneX private Tor networks are **explicitly legal** because:

1. **No public traffic** - Completely isolated from public Tor
2. **Own infrastructure** - All nodes run on your own systems
3. **Research purpose** - Security testing and forensic analysis
4. **No third-party impact** - No external systems involved

---

### Contact

For legal inquiries: [GitHub Issues](https://github.com/cannatoshi/simplex-smp-monitor/issues)

For SimpleX trademark inquiries: chat@simplex.chat

For SimpleX licensing questions: https://github.com/simplex-chat/simplex-chat/blob/stable/LICENSE

For Tor trademark inquiries: https://www.torproject.org/about/trademark/

---

## Deutsch

### Rechtliche Dokumente

| Dokument | Beschreibung |
|----------|--------------|
| [LICENSE](LICENSE) | GNU Affero General Public License v3.0 (AGPL-3.0) |
| [TRADEMARK.md](TRADEMARK.md) | Markenrechtliche Hinweise |
| [DISCLAIMER.md](DISCLAIMER.md) | Haftungsausschluss |
| [TESTING_POLICY.md](TESTING_POLICY.md) | Test-Richtlinien |

### Kurzzusammenfassung

- **Lizenz:** AGPL-3.0
- **Markenrecht:** "SimpleX" ist eine Marke der SimpleX Chat Ltd. "Tor" ist eine Marke von The Tor Project, Inc. Dieses Projekt ist **nicht mit SimpleX Chat Ltd oder The Tor Project verbunden**.
- **Haftung:** "WIE BESEHEN" ohne Gewährleistung.
- **Tests:** Siehe [TESTING_POLICY.md](TESTING_POLICY.md)

---

### Drittanbieter-Software

#### SimpleX Software (AGPL-3.0)

Die Docker-Images dieses Projekts enthalten **unveränderte Binärdateien** aus offiziellen SimpleX GitHub-Releases:

| Software | Beschreibung | Lizenz | Quelle |
|----------|--------------|--------|--------|
| **simplex-chat** (CLI) | Kommandozeilen-Client | AGPL-3.0 | [simplex-chat](https://github.com/simplex-chat/simplex-chat) |
| **smp-server** | Messaging-Relay-Server | AGPL-3.0 | [simplexmq](https://github.com/simplex-chat/simplexmq) |
| **xftp-server** | Dateitransfer-Server | AGPL-3.0 | [simplexmq](https://github.com/simplex-chat/simplexmq) |
| **ntf-server** | Push-Benachrichtigungs-Server | AGPL-3.0 | [simplexmq](https://github.com/simplex-chat/simplexmq) |

**Wichtige Hinweise:**

1. **Keine Modifikationen:** Wir modifizieren die SimpleX-Binärdateien NICHT. Wir laden offizielle Releases direkt von GitHub herunter.

2. **Quellcode-Verfügbarkeit:** Der komplette Quellcode ist verfügbar unter:
   - https://github.com/simplex-chat/simplex-chat
   - https://github.com/simplex-chat/simplexmq

3. **AGPL-3.0 Konformität:** Unter AGPL-3.0 haben Sie das Recht:
   - Die Software für jeden Zweck zu nutzen
   - Den Quellcode zu studieren und zu modifizieren
   - Die Software zu verteilen
   - Die Software über ein Netzwerk zu betreiben

#### Tor Software (BSD-3-Clause)

Dieses Projekt enthält die Tor-Anonymisierungssoftware für private Netzwerksimulation (ChutneX).

| Software | Beschreibung | Lizenz | Quelle |
|----------|--------------|--------|--------|
| **Tor** | The Onion Router Anonymisierungsnetzwerk | BSD-3-Clause | [torproject/tor](https://github.com/torproject/tor) |

**ChutneX - Privates Tor-Netzwerk:**

ChutneX ist unsere eigene Implementierung zur Erstellung isolierter privater Tor-Netzwerke für forensische Analyse und Sicherheitstests.

| Aspekt | Beschreibung |
|--------|--------------|
| **Zweck** | Forensische Analyse und Sicherheitstests |
| **Isolation** | 100% Netzwerkisolation vom öffentlichen Tor |
| **Komponenten** | Directory Authorities, Guard/Middle/Exit-Relays, Clients |
| **Rechtsstatus** | Private Netzwerke für Testzwecke |

**Wichtige Hinweise:**

1. **Kein öffentlicher Tor-Verkehr:** ChutneX-Netzwerke sind vollständig isoliert. Der Verkehr berührt niemals das öffentliche Tor-Netzwerk.

2. **Quellcode:** Tor-Quellcode ist verfügbar unter https://github.com/torproject/tor

3. **Markenrecht:** "Tor" und das Tor-Logo sind Marken von The Tor Project, Inc. Dieses Projekt ist **nicht mit The Tor Project verbunden**.

---

### Docker-Images und Binärverteilung

#### Was wir verteilen

| Image | Inhalt | Lizenz |
|-------|--------|--------|
| `simplex-smp-monitor-app` | Django + React Anwendung | AGPL-3.0 (unser Code) |
| `simplex-smp-monitor-nginx` | Nginx Reverse Proxy | BSD-2-Clause |
| `simplex-smp` | smp-server Binärdatei | AGPL-3.0 (SimpleX) |
| `simplex-smp-tor` | smp-server + Tor | AGPL-3.0 + BSD-3-Clause |
| `simplex-xftp` | xftp-server Binärdatei | AGPL-3.0 (SimpleX) |
| `simplex-ntf` | ntf-server Binärdatei | AGPL-3.0 (SimpleX) |
| `simplex-cli` | simplex-chat Binärdatei | AGPL-3.0 (SimpleX) |
| `chutnex` | Tor + ChutneX-Skripte | BSD-3-Clause (Tor) + AGPL-3.0 (unsere Skripte) |

---

### Rechtliche Lage des Tor-Betriebs

#### Deutschland / Europäische Union

Der Betrieb von Tor-Software ist in Deutschland und der EU **legal**:

| Aktivität | Rechtsstatus | Referenz |
|-----------|--------------|----------|
| Tor-Client betreiben | ✅ Legal | Allgemeine Kommunikationsfreiheit |
| Tor-Relay betreiben | ✅ Legal | BGH I ZR 64/17 (2018) |
| Tor-Exit-Node betreiben | ✅ Legal (mit Risiken) | TMG §8 (Providerprivileg) |
| Privates Tor-Netzwerk | ✅ Legal | Kein öffentlicher Verkehr |
| Sicherheitsforschung | ✅ Legal | BVerfG 2009 (Dual-Use-Tools) |

**Wichtig:** Dies gilt für Ihre eigene Infrastruktur. Tests an Drittanbieter-Systemen erfordern eine Genehmigung.

#### Wichtige Rechtsprechung (Deutschland)

| Fall | Jahr | Urteil |
|------|------|--------|
| **BGH I ZR 64/17** | 2018 | Tor-Relay-Betreiber haften nicht für Nutzerverkehr |
| **BVerfG** | 2009 | Entwicklung von Dual-Use-Sicherheitstools ist legal |
| **TMG §8** | 2007 | Providerprivileg für Durchleitungsverkehr |

#### ChutneX Spezifisch

ChutneX private Tor-Netzwerke sind **ausdrücklich legal**, weil:

1. **Kein öffentlicher Verkehr** - Vollständig vom öffentlichen Tor isoliert
2. **Eigene Infrastruktur** - Alle Nodes laufen auf eigenen Systemen
3. **Forschungszweck** - Sicherheitstests und forensische Analyse
4. **Keine Drittbetroffenheit** - Keine externen Systeme involviert

---

### Kontakt

Rechtliche Anfragen: [GitHub Issues](https://github.com/cannatoshi/simplex-smp-monitor/issues)

SimpleX Markenrecht: chat@simplex.chat

SimpleX Lizenzfragen: https://github.com/simplex-chat/simplex-chat/blob/stable/LICENSE

Tor Markenrecht: https://www.torproject.org/about/trademark/

---

*Last updated: January 2026*
