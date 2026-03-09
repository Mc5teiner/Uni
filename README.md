# FernUni Hagen Study Organizer

Studienorganisations-Tool für das Fernstudium an der FernUniversität Hagen – speziell für Berufstätige, die nebenberuflich studieren. Self-hosted als einzelner Docker-Container.

---

## Features

| Bereich | Highlights |
|---|---|
| **Dashboard** | Tagesübersicht, Lernstreak, Wochengrafik, fällige Karteikarten, Begrüßung nach Tageszeit |
| **Module** | FernUni-Modulnummer, ECTS, Semester, Prüfungsdatum, Farbkodierung, Statusfilter |
| **Studienbriefe** | PDF-Upload & -Viewer, Lesefortschritt, Lesezeichen, Notizen pro Seite |
| **Karteikarten** | SM-2 Spaced-Repetition (wie Anki), 6-stufige Bewertung, Tags, Lernmodus |
| **Kalender** | Prüfungen, Abgaben, Lernblöcke, Präsenzveranstaltungen, Mentoriat-Termine mit Detail-Overlay |
| **Mentoriate** | Bulk-Import aus HTML-Tabelle, optionaler Name, anklickbare Kalendertermine |
| **Multi-User** | Eigene Accounts, Benutzerverwaltung durch Admin, individuelle Storage-Limits |
| **Einstellungen** | Profil, Passwort ändern, CalDAV-Kalenderintegration, Storage-Übersicht |
| **Admin-Konsole** | CRUD-Benutzerverwaltung, Ban/Unban, SMTP-Konfiguration, E-Mail-Templates |
| **Admin-Backup** | Vollständiges System-Backup, Einstellungs-Backup, Benutzer-Export, Einzelnutzer-Export (inkl. PDFs) |

---

## Hosting auf Proxmox

Die empfohlene Methode ist ein **LXC-Container** (geringer Overhead). Alternativ funktioniert auch eine VM.

### Voraussetzungen

- Proxmox VE 7.x oder 8.x
- Internetzugang vom Container/VM
- Optional: eigene Domain + SSL-Zertifikat (Let's Encrypt)

---

### Schritt 1 – LXC-Container erstellen

Im Proxmox-Webinterface:

1. **CT Template herunterladen**: `Datacenter → Storage (z.B. local) → CT Templates → Templates → debian-12-standard` herunterladen
2. **Container erstellen** (`Create CT`):

| Feld | Empfohlener Wert |
|---|---|
| Hostname | `study-organizer` |
| Password | sicheres Root-Passwort setzen |
| Template | `debian-12-standard_*.tar.zst` |
| Disk | mind. **10 GB** (für PDFs mehr einplanen) |
| CPU | 2 Cores |
| Memory | 512 MB (RAM) + 512 MB (Swap) |
| Network | DHCP oder feste IP (empfohlen) |
| DNS | Standard (Proxmox-Host) |

> **Feste IP empfohlen:** Im Netzwerk-Tab z.B. `192.168.1.50/24`, Gateway `192.168.1.1`.

3. Container **starten** und per Shell öffnen (`pct enter <CTID>` oder Proxmox-Konsole).

---

### Schritt 2 – System vorbereiten & Docker installieren

```bash
# System aktualisieren
apt update && apt upgrade -y

# Abhängigkeiten
apt install -y ca-certificates curl gnupg git

# Docker-Repository einrichten
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker installieren
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Docker-Dienst aktivieren
systemctl enable --now docker

# Test
docker run --rm hello-world
```

> **Hinweis für LXC:** Falls Docker im unprivilegierten Container Fehler wirft (`CLONE_NEWUSER`), entweder den Container **privilegiert** erstellen oder in Proxmox unter `Options → Features` die Optionen `keyctl` und `Nesting` aktivieren.

---

### Schritt 3 – Anwendung klonen und starten

```bash
# Ins gewünschte Verzeichnis wechseln
mkdir -p /opt/apps && cd /opt/apps

# Repository klonen
git clone https://github.com/Mc5teiner/Uni.git study-organizer
cd study-organizer

# Container bauen und starten (dauert beim ersten Mal 3–5 Minuten)
docker compose up -d --build

# Logs live verfolgen
docker compose logs -f
```

Die Anwendung ist nun unter `http://<Container-IP>:3000` erreichbar.

Beim ersten Aufruf erscheint der **Setup-Wizard**: Admin-Account anlegen, fertig.

---

### Schritt 4 – Nginx als Reverse Proxy (empfohlen)

Nginx leitet eingehende HTTP/HTTPS-Anfragen an den Docker-Container weiter und übernimmt die TLS-Terminierung.

```bash
apt install -y nginx
```

Konfigurationsdatei anlegen:

```bash
nano /etc/nginx/sites-available/study-organizer
```

```nginx
server {
    listen 80;
    server_name study.example.com;          # eigene Domain eintragen

    # Weiterleitung auf HTTPS (nach Zertifikat einrichten)
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name study.example.com;          # eigene Domain eintragen

    ssl_certificate     /etc/letsencrypt/live/study.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/study.example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Sicherheits-Header
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    # Größeres Limit für PDF-Uploads
    client_max_body_size 100M;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_read_timeout 120s;
    }
}
```

```bash
# Konfiguration aktivieren
ln -s /etc/nginx/sites-available/study-organizer /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Damit Nginx die `X-Forwarded-*`-Header auch auswertet, in der `docker-compose.yml` die Umgebungsvariable setzen:

```yaml
environment:
  TRUST_PROXY: "true"
```

---

### Schritt 5 – SSL-Zertifikat mit Let's Encrypt

Voraussetzung: Die Domain zeigt per DNS-A-Record auf die öffentliche IP des Proxmox-Hosts (mit Port-Weiterleitung auf den LXC-Container, siehe unten).

```bash
apt install -y certbot python3-certbot-nginx

# Zertifikat ausstellen (HTTP-Challenge, Port 80 muss erreichbar sein)
certbot --nginx -d study.example.com

# Automatische Erneuerung testen
certbot renew --dry-run
```

Certbot richtet einen Cron-Job / Systemd-Timer für die automatische Erneuerung ein.

#### Selbstsigniertes Zertifikat (ohne Domain / für internes Netz)

```bash
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 3650 -newkey rsa:4096 \
  -keyout /etc/nginx/ssl/selfsigned.key \
  -out    /etc/nginx/ssl/selfsigned.crt \
  -subj "/CN=study-organizer/O=HomeServer"
```

In der Nginx-Konfiguration dann:

```nginx
ssl_certificate     /etc/nginx/ssl/selfsigned.crt;
ssl_certificate_key /etc/nginx/ssl/selfsigned.key;
```

---

### Schritt 6 – Port-Weiterleitung im Router / Proxmox-Firewall

#### Router (Zugriff aus dem Internet)

Im Heimrouter eine Port-Weiterleitung einrichten:

| Protokoll | Externer Port | Internes Ziel | Interner Port |
|---|---|---|---|
| TCP | 443 | `<Container-IP>` | 443 |
| TCP | 80 | `<Container-IP>` | 80 |

#### Proxmox-Firewall (optional)

Falls die Proxmox-Firewall aktiviert ist, Regeln für den Container hinzufügen:

```
Datacenter → <Node> → <CTID> → Firewall → Add Rule
```

| Richtung | Protokoll | Zielport | Kommentar |
|---|---|---|---|
| IN | TCP | 80 | HTTP (Let's Encrypt Challenge) |
| IN | TCP | 443 | HTTPS |
| IN | TCP | 3000 | App direkt (nur LAN, optional) |

---

### Umgebungsvariablen

In der `docker-compose.yml` können folgende Variablen gesetzt werden:

```yaml
environment:
  NODE_ENV: production
  PORT: "3000"
  DATA_DIR: /data

  # Proxysituation (Nginx davor): unbedingt setzen!
  TRUST_PROXY: "true"

  # CORS (nur nötig falls Frontend separat gehostet)
  ALLOWED_ORIGIN: "https://study.example.com"

  # Secrets manuell setzen (sonst auto-generiert beim ersten Start)
  # JWT_SECRET: "64-stelliger-hex-wert"
  # ENCRYPTION_SECRET: "64-stelliger-hex-wert"
```

Eigene Secrets generieren (einmalig, sicher aufbewahren!):

```bash
openssl rand -hex 32   # einmal für JWT_SECRET
openssl rand -hex 32   # einmal für ENCRYPTION_SECRET
```

> Die Secrets werden automatisch beim ersten Start in `/data/.secrets.json` gespeichert (Modus 600). Nur relevant, wenn der Container neu erstellt wird – solange das Volume erhalten bleibt, bleiben die Secrets erhalten.

---

### Datensicherung

Alle persistenten Daten (SQLite-Datenbank, Secrets, ggf. Upload-Cache) liegen im Docker-Volume `study_data`, das auf `/data` im Container gemountet ist.

#### Volume-Backup

```bash
# Backup erstellen (tar-Archiv)
docker run --rm \
  -v study_data:/data \
  -v $(pwd):/backup \
  alpine \
  tar czf /backup/study-backup-$(date +%Y%m%d).tar.gz -C /data .

# Backup einspielen
docker compose down
docker run --rm \
  -v study_data:/data \
  -v $(pwd):/backup \
  alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/study-backup-YYYYMMDD.tar.gz -C /data"
docker compose up -d
```

#### Proxmox-Snapshot / -Backup

Alternativ über Proxmox Backup Server (PBS) oder die integrierte Backup-Funktion:

```
Datacenter → Backup → Add
```

Dort den LXC-Container auswählen und einen Zeitplan einrichten (z.B. täglich 03:00 Uhr). Das sichert den gesamten Container inklusive aller Daten.

---

## Daten auf Synology NAS ablegen (NFS – höchste Performance)

Statt Daten lokal im LXC-Container zu speichern, lassen sie sich direkt auf einem **Synology NAS** ablegen. Das empfohlene Protokoll ist **NFS v4** (geringste Latenz, kein SMB-Overhead, keine Passwort-Authentifizierung nötig im LAN).

### Warum NFS?

| Protokoll | Latenz | Durchsatz | Anmerkung |
|---|---|---|---|
| **NFS v4.1/v4.2** | sehr niedrig | sehr hoch | Empfohlen für Linux-Hosts |
| SMB 3.x | niedrig | hoch | Gut für Windows-Clients |
| iSCSI | minimal | maximal | Block-Level, komplexer einzurichten |
| rsync/SFTP | — | — | Nur für Backups, kein Live-Mount |

> NFS v4.2 unterstützt `server-side copy` und Sparse Files – ideal für große SQLite-Datenbanken.

---

### Schritt 1 – NFS auf der Synology einrichten

**DSM (DiskStation Manager):**

1. `Systemsteuerung → Dateidienste → NFS` → NFS aktivieren, NFS-Version: **NFSv4.1** aktivieren
2. Ordner anlegen: `File Station → Neuer Ordner` → z.B. `/volume1/study-organizer-data`
3. Ordner freigeben: `Systemsteuerung → Freigegebene Ordner → study-organizer-data → Bearbeiten → NFS-Berechtigungen → Erstellen`

| Feld | Wert |
|---|---|
| Hostname oder IP | `<IP des Proxmox-Containers>` (z.B. `192.168.1.50`) |
| Privilege | Lesen/Schreiben |
| Squash | Kein Squashing (oder `root → admin` je nach UID) |
| Sicherheit | `sys` |
| NFS-Version | NFSv4 |
| Asynchron | Nein (Sync = sicherer für SQLite) |

```
Ergebnis: NFS-Pfad auf der Synology: 192.168.1.10:/volume1/study-organizer-data
```

---

### Schritt 2 – NFS-Mount im Proxmox-LXC einrichten

```bash
# NFS-Client installieren
apt install -y nfs-common

# Mountpunkt erstellen
mkdir -p /mnt/synology-study

# Einmalig testen:
mount -t nfs4 -o vers=4.1,rsize=1048576,wsize=1048576,timeo=600,retrans=3 \
  192.168.1.10:/volume1/study-organizer-data /mnt/synology-study

# Dauerhaft in /etc/fstab eintragen:
echo "192.168.1.10:/volume1/study-organizer-data  /mnt/synology-study  nfs4  \
  vers=4.1,rsize=1048576,wsize=1048576,timeo=600,retrans=3,_netdev,nofail  0 0" \
  >> /etc/fstab

# Mount aktivieren:
systemctl daemon-reload
mount -a

# Testen:
df -h | grep synology
touch /mnt/synology-study/test.txt && echo "NFS funktioniert"
```

**Wichtige Mount-Optionen:**

| Option | Bedeutung |
|---|---|
| `vers=4.1` | NFS v4.1 (Performanceoptimierung) |
| `rsize=1048576` | Lesepuffer 1 MB |
| `wsize=1048576` | Schreibpuffer 1 MB |
| `timeo=600` | 60s Timeout vor Retry |
| `retrans=3` | 3 Wiederholungsversuche |
| `_netdev` | Warten bis Netzwerk verfügbar |
| `nofail` | Kein Boot-Fehler wenn NAS nicht erreichbar |

---

### Schritt 3 – Docker-Daten auf NFS-Share legen

Die `docker-compose.yml` anpassen, sodass das Volume direkt auf den NFS-Mount zeigt:

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: fernuni-study-organizer
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /mnt/synology-study:/data   # NFS-Share direkt mounten statt Docker-Volume
    environment:
      NODE_ENV: production
      DATA_DIR: /data
      PORT: "3000"
      TRUST_PROXY: "true"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/auth/check-setup"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
```

> **Wichtig:** Das lokale `study_data` Docker-Volume wird nicht mehr benötigt. Alle Daten landen direkt auf der Synology.

---

### Schritt 4 – Automatische Backups auf der Synology

#### Option A: Synology Hyper Backup (einfachste Lösung)

Auf dem NAS: `Hyper Backup → Backup-Aufgabe erstellen`

- **Quelle:** Ordner `study-organizer-data`
- **Ziel:** Lokales Laufwerk, externes USB, Cloud (z.B. Backblaze B2, AWS S3)
- **Zeitplan:** Täglich 02:00 Uhr
- **Versionen:** 30 Tage Aufbewahrung

Hyper Backup erstellt inkrementelle Backups und ermöglicht Wiederherstellung einzelner Dateiversionen.

#### Option B: rsync-Task (Synology → Zweites NAS)

`Systemsteuerung → Aufgabenplaner → Erstellen → Geplante Aufgabe → Benutzerdefiniertes Skript`:

```bash
#!/bin/bash
# Täglich um 03:00 Uhr ausführen
rsync -av --delete \
  /volume1/study-organizer-data/ \
  rsync://backup-nas.local/study-organizer-backup/
```

#### Option C: Admin-Backup-UI (in-App)

Über `Admin-Konsole → Backup` können jederzeit manuell Backups erstellt werden:

| Backup-Typ | Inhalt | Typische Größe |
|---|---|---|
| **Vollständiges System-Backup** | Alle Einstellungen + alle Nutzer + alle Daten (inkl. PDFs als Base64) | 100 MB – mehrere GB |
| **Einstellungen** | SMTP, E-Mail-Templates, System-Config | < 1 KB |
| **Benutzer-Export** | Alle Accounts (ohne Passwort-Hashes) | < 100 KB |
| **Einzelnutzer** | Komplette Daten eines Nutzers | 10–500 MB |

Die JSON-Dateien können direkt in einen Synology-Ordner gespeichert werden.

---

### Schritt 5 – Komplette Wiederherstellung (Disaster Recovery)

```bash
# 1. Neuen LXC-Container auf Proxmox erstellen (wie Schritt 1-2 der Hosting-Anleitung)

# 2. NFS-Share einrichten (wie Schritt 2 dieser Anleitung)

# 3. Anwendung klonen:
git clone https://github.com/Mc5teiner/Uni.git /opt/apps/study-organizer
cd /opt/apps/study-organizer

# 4. docker-compose.yml: Volume auf NFS-Share zeigen lassen (Schritt 3)

# 5. Container starten — alle Daten sind bereits auf dem NAS vorhanden:
docker compose up -d --build

# Fertig! Keine Wiederherstellung der DB nötig, da die .db-Datei auf dem NAS liegt.
```

> Bei 50–500 Benutzern liegen Datenbank und PDFs auf dem NAS. Ein Neustart des LXC-Containers
> (oder ein neuer Container auf einem anderen Proxmox-Host) greift sofort auf alle Daten zu.

---

### Performance-Hinweise

- SQLite hat kein Problem mit NFS, solange nur **ein Container** gleichzeitig schreibt (kein Multi-Writer-Szenario)
- WAL-Modus (bereits aktiviert) reduziert Lock-Konflikte
- NFS-`sync`-Mount verhindert Datenverlust bei NAS-Neustart
- Bei sehr vielen Nutzern (> 100 gleichzeitig aktiv): erwäge PostgreSQL statt SQLite

---

### Anwendung aktualisieren

```bash
cd /opt/apps/study-organizer

# Neue Version holen
git pull

# Container neu bauen und starten (Downtime: ~30 Sekunden)
docker compose up -d --build

# Alte Images aufräumen
docker image prune -f
```

---

### Entwicklungsmodus (lokal ohne Docker)

```bash
# Terminal 1: Backend
cd server
npm install
npm run dev        # läuft auf http://localhost:3001

# Terminal 2: Frontend
cd study-tool
npm install
npm run dev        # läuft auf http://localhost:5173
                   # /api wird automatisch auf :3001 proxied
```

---

### Architektur & Sicherheit

```
Browser
  └── HTTPS (TLS 1.2/1.3)
       └── Nginx (Reverse Proxy, TLS-Terminierung)
            └── Docker: node:22-alpine (non-root: appuser)
                 ├── Express API  (/api/*)
                 │    ├── Auth:    Argon2id · JWT HS256 · Token-Rotation
                 │    ├── Data:    SQLite WAL · AES-256-GCM Feldbeschleunigung
                 │    ├── Admin:   Benutzerverwaltung · Audit-Log
                 │    └── CalDAV:  REPORT/PROPFIND-Proxy
                 └── Static Files (React SPA, /*)
```

| Sicherheitsmerkmal | Details |
|---|---|
| Passwort-Hashing | Argon2id · 64 MB · 3 Iterationen · 4 Lanes (BSI/OWASP) |
| Token-Speicherung | Access-Token: JS-Memory · Refresh-Token: HttpOnly-Cookie |
| Token-Rotation | Jedes Refresh revokiert das alte Token |
| Timing-Schutz | Dummy-Hash für unbekannte Nutzer · `timingSafeEqual` für Tokens |
| Kein Enumeration-Leak | Identische Fehlermeldungen für falsche E-Mail/Passwort |
| Feldverschlüsselung | AES-256-GCM + HKDF-SHA256 (CalDAV-Passwort, SMTP-Passwort) |
| Rate-Limiting | 20 Req/15 min auf Auth · 5 Req/h auf Passwort-Vergessen |
| HTTP-Header | Helmet CSP · HSTS · X-Frame-Options |
| Datenbank | SQLite WAL · Foreign Keys · Secure Delete |

---

### Troubleshooting

**Container startet nicht:**
```bash
docker compose logs app
```

**LXC: `iptables`-Fehler beim Docker-Start:**
```bash
# In Proxmox für den Container aktivieren:
# Options → Features → "Nesting" ✓ und "keyctl" ✓
```

**Port 3000 von außen nicht erreichbar:**
```bash
# Firewall im Container prüfen
iptables -L -n
# Proxmox-Firewall prüfen (Datacenter → Firewall)
# Router-Port-Weiterleitung prüfen
```

**Passwort vergessen (Admin):**
```bash
# Direkt in die SQLite-Datenbank eingreifen
docker exec -it fernuni-study-organizer sh
apk add sqlite  # einmalig
sqlite3 /data/app.db "SELECT id, username, role FROM users;"

# Neues Passwort-Hash generieren (Node.js):
node -e "require('argon2').hash('NeuesPasswort123!', {type: 2, memoryCost: 65536, timeCost: 3, parallelism: 4}).then(h => console.log(h))"

# Hash in DB schreiben:
sqlite3 /data/app.db "UPDATE users SET password_hash='<hash>' WHERE username='admin';"
```

**Daten nach Container-Neustart weg:**
Sicherstellen, dass das Volume korrekt gemountet ist:
```bash
docker volume ls | grep study_data
docker inspect fernuni-study-organizer | grep -A5 Mounts
```

# 1. Neues Image bauen
docker compose build

# 2. Nur den App-Container ersetzen (Volumes bleiben erhalten)
docker compose up -d --no-deps app

# Oder alles auf einmal:
docker compose pull && docker compose up -d
