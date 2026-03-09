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
