# AVE CRM - Deployment Stappenplan

**Methode:** Laravel Forge + DigitalOcean  
**Geschatte tijd:** ~1-2 uur  
**Kosten:** ~€35/maand

> **Note:** We gebruiken voorlopig jouw bestaande keys voor R2, Gemini en Vertex AI.  
> Later deze week migreren we naar de keys van de opdrachtgever.

---

## 📋 Overzicht

```
[x] 1. Code voorbereiden (al gedaan)
[ ] 2. Accounts aanmaken - alleen DO + Forge (15 min)
[ ] 3. Server opzetten via Forge (15 min)
[ ] 4. Applicatie deployen (15 min)
[ ] 5. SSL & Domein instellen (10 min)
[ ] 6. Testen (15 min)
[ ] 7. Later: Migreren naar opdrachtgever's accounts
```

---

## 1. Code Voorbereiden ✅

**Al gedaan!** De volgende wijzigingen zijn doorgevoerd:

- ✅ `frontend/src/api/client.ts` - Dynamische API URL
- ✅ `backend/config/cors.php` - Production-ready CORS
- ✅ `backend/.env.production.example` - Template
- ✅ `deploy.sh` - Deployment script

**Commit & Push:**

```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

---

## 2. Accounts Aanmaken

### 2.1 DigitalOcean

1. Ga naar [digitalocean.com](https://digitalocean.com)
2. Account aanmaken
3. Betaalmethode toevoegen
4. Ga naar **API** → **Generate New Token**
5. Naam: `forge-token`, Scope: Read + Write
6. **Kopieer en bewaar het token!**

### 2.2 Laravel Forge

1. Ga naar [forge.laravel.com](https://forge.laravel.com)
2. Account aanmaken ($12/maand)
3. Ga naar **Server Providers** → **Add Provider**
4. Kies **DigitalOcean**
5. Plak je API token
6. Klik **Add Provider**

### 2.3 Cloudflare (domein) ✅

**Al gedaan!** Nameservers zijn ingesteld voor `sparxsoftware.nl`.

---

## 3. Server Opzetten via Forge

### 3.1 Server Aanmaken

1. In Forge: **Create Server**
2. Provider: **DigitalOcean**
3. Server Settings:
   - Name: `avecrm-production`
   - Region: **Amsterdam** (AMS3)
   - Server Size: **4GB RAM / 2 CPU** ($24/month)
   - PHP Version: **8.3**
   - Database: **PostgreSQL 16**
4. Klik **Create Server**
5. **Wacht 5-10 minuten** tot de server klaar is

### 3.2 Database Aanmaken

1. Ga naar server → **Database**
2. **Add Database**
   - Name: `avecrm`
   - User: `forge`

### 3.3 Site Toevoegen

1. Ga naar server → **Sites** → **New Site**
   - Domain: `avecrm.nl`
   - Project Type: **General PHP / Laravel**
   - **Advanced Settings**:
     - Root Directory: `/backend`
     - Web Directory: `/public`
2. Klik **Add Site**

### 3.4 Shared paths (zero-downtime)

Zorg dat **storage** in de shared paths staat. Voeg eventueel expliciet toe:
- **From:** `storage`
- **To:** `backend/storage`

Dit zorgt dat temp-bestanden voor CV-import (`storage/app/temp/imports/`) beschikbaar zijn voor workers.

### 3.5 poppler-utils (voor PDF-extractie)

CV-parsing gebruikt `pdftotext` voor betere PDF-extractie. Installeer op de server:

```bash
ssh forge@SERVER_IP
sudo apt-get update && sudo apt-get install -y poppler-utils
```

### 3.6 Repository Koppelen

1. Ga naar site → **Git Repository**
2. Provider: **GitHub**
3. Repository: `jouw-username/ave-crm`
4. Branch: `main`
5. Klik **Install Repository**

---

## 4. Configuratie

### 4.1 Environment Variables

Ga naar site → **Environment** en plak:

```env
APP_NAME="AVE CRM"
APP_ENV=production
APP_KEY=base64:LAAT_FORGE_DIT_GENEREREN
APP_DEBUG=false
APP_URL=https://avecrm.nl
APP_FEED_URL=https://avecrm.nl

TENANT_DOMAIN_SUFFIX=avecrm.nl

# Database (Forge vult wachtwoord in)
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=avecrm
DB_USERNAME=forge
DB_PASSWORD=_KIJK_BOVENAAN_ENV_FILE_

# Cache & Queue & Session
CACHE_STORE=redis
SESSION_DRIVER=redis
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=.avecrm.nl
QUEUE_CONNECTION=redis
REDIS_HOST=127.0.0.1

# CORS
CORS_ALLOWED_ORIGIN=https://avecrm.nl
CORS_PATTERN=https?://.*\.avecrm\.nl
SANCTUM_STATEFUL_DOMAINS=avecrm.nl,*.avecrm.nl

#------------------------------------------------------------------------------
# KEYS & SERVICES
#------------------------------------------------------------------------------

# Mail (Log for now, configure SMTP later)
MAIL_MAILER=log
MAIL_FROM_ADDRESS="hello@avecrm.nl"
MAIL_FROM_NAME="${APP_NAME}"

# Cloudflare R2
FILESYSTEM_DISK=r2
R2_ACCESS_KEY_ID=f43cd12871b8f33b259bc2e7b49ed084
R2_SECRET_ACCESS_KEY=648bc807b7a5566a5f554a732858f893a6804faab29d60d8a33fb779a48969ed
R2_BUCKET=ave-crm-files
R2_ENDPOINT=https://91f0cf05c483e12f43ff9dd3a258e3d7.eu.r2.cloudflarestorage.com
R2_REGION=auto

# Google Cloud / Vertex AI (gebruikt voor zowel Smart Import als Bulk)
GOOGLE_CLOUD_PROJECT=ave-crm
GOOGLE_CLOUD_BUCKET=ave-crm-cv-import
# Upload dit bestand naar /home/forge/avecrm.nl/ (naast de .env)
GOOGLE_APPLICATION_CREDENTIALS=/home/forge/avecrm.nl/gcp-credentials.json
VERTEX_AI_LOCATION=europe-west4
VERTEX_AI_MODEL=gemini-2.0-flash-001

# Maps
GOOGLE_GEOCODING_API_KEY=AIzaSyACEOHJT1d7TzUdS0A5HP9V1SjjJs1g3f4
```

### 4.2 GCP Credentials Uploaden

SSH naar de server:

```bash
ssh forge@JOUW_SERVER_IP
cd /home/forge/avecrm.nl
nano gcp-credentials.json
# Plak je bestaande GCP service account JSON
# Ctrl+X, Y, Enter
chmod 600 gcp-credentials.json
```

### 4.3 Deploy Script

Ga naar site → **Deployment** en vervang met dit script. **Belangrijk:** `$ACTIVATE_RELEASE()` zorgt dat de nieuwe release live gaat; zonder dit blijft de oude versie actief.

```bash
$CREATE_RELEASE()

cd $FORGE_RELEASE_DIRECTORY

# Backend
cd backend
$FORGE_COMPOSER install --no-dev --no-interaction --prefer-dist --optimize-autoloader
$FORGE_PHP artisan config:cache
$FORGE_PHP artisan route:cache
$FORGE_PHP artisan view:cache
$FORGE_PHP artisan storage:link

# Migrations (landlord eerst!)
$FORGE_PHP artisan migrate --path=database/migrations/landlord --force
$FORGE_PHP artisan migrate --force

# Frontend – absolute paden (voorkomt pad-problemen bij zero-downtime)
cd $FORGE_RELEASE_DIRECTORY/frontend
npm ci
npm run build

# Copy frontend naar public (expliciet met absolute paden)
rm -rf $FORGE_RELEASE_DIRECTORY/backend/public/assets
cp -r $FORGE_RELEASE_DIRECTORY/frontend/dist/* $FORGE_RELEASE_DIRECTORY/backend/public/

# Activeer nieuwe release VÓÓR queue restart
$ACTIVATE_RELEASE()

$RESTART_QUEUES()
```

### 4.4 Nginx Configuratie

Ga naar site → **Nginx Configuration**.
Zoek het block `location / { ... }` en vervang dit (en voeg `/app` toe) zodat React Routing werkt:

```nginx
# API requests altijd naar Laravel
location /api {
    try_files $uri $uri/ /index.php?$query_string;
}

# Frontend requests (SPA handling)
location / {
    # Probeer bestand, dan map, dan index.html (React), dan pas Laravel (404)
    try_files $uri $uri/ /index.html /index.php?$query_string;
}
```

---

## 5. Deployen

### 5.1 Eerste Deployment

1. Ga naar site → **Deployment** → **Deploy Now**
2. Bekijk output (~2-5 min)

### 5.2 Queue Worker

1. Ga naar server → **Daemons** → **New Daemon**
   - Command: `php artisan queue:work --sleep=3 --tries=3`
   - Directory: `/home/forge/avecrm.nl/backend`
   - User: `forge`
2. Klik **Create**

### 5.3 Scheduler

1. Ga naar server → **Scheduler** → **New Scheduled Job**
   - Command: `php artisan schedule:run`
   - Frequency: **Every Minute**
   - Directory: `/home/forge/avecrm.nl/backend`

---

## 6. SSL & Domein

### 6.1 DNS Instellen (Cloudflare)

Zodra de server klaar is, noteer het IP en stel in bij Cloudflare:

| Type | Name | Content        | Proxy       |
| ---- | ---- | -------------- | ----------- |
| A    | @    | JOUW_SERVER_IP | DNS only ⚪ |
| A    | \*   | JOUW_SERVER_IP | DNS only ⚪ |

⚠️ **Proxy UIT** (grijs wolkje) voor SSL!

### 6.2 SSL Certificaat

1. Ga naar site → **SSL** → **LetsEncrypt**
2. Domain: `avecrm.nl`
3. Klik **Obtain Certificate**

### 6.3 Wildcard SSL (voor tenants)

1. Nog in SSL → nieuwe certificate
2. Domain: `*.avecrm.nl`
3. Volg DNS challenge instructies

---

## 7. Testen

- [ ] Homepage laadt (`https://avecrm.nl`)
- [ ] Login werkt
- [ ] Tenant registratie werkt
- [ ] Tenant subdomain werkt (`https://test.avecrm.nl`)
- [ ] CV Smart Import werkt
- [ ] Bestanden uploaden naar R2 werkt

---

## 8. Later: Migreren naar Opdrachtgever's Accounts

Wanneer de opdrachtgever zijn eigen accounts heeft:

### Cloudflare R2

1. Opdrachtgever maakt Cloudflare account + R2 bucket
2. Exporteer bestaande files: `rclone sync r2:oude-bucket r2:nieuwe-bucket`
3. Update `.env` met nieuwe R2 keys in Forge

### Google Cloud

1. Opdrachtgever maakt GCP project
2. Enable APIs: Gemini, Vertex AI, Cloud Storage
3. Maak nieuwe API key en Service Account
4. Update `.env` en upload nieuwe `gcp-credentials.json`

### Checklist voor overdracht

- [ ] Nieuwe Cloudflare R2 bucket + keys
- [ ] Nieuwe GCP project + API key
- [ ] Nieuwe GCP service account JSON
- [ ] Data gemigreerd van oude naar nieuwe buckets
- [ ] `.env` bijgewerkt in Forge
- [ ] Applicatie getest met nieuwe keys

---

## 🆘 Troubleshooting

### Smart CV Import faalt (3/4 mislukt)

1. **Check de foutreden** – Klik "Bekijk mislukte imports" in de UI; de `reason` per bestand is de foutmelding.
2. **Laravel logs** – `tail -f /home/forge/avecrm.nl/current/backend/storage/logs/laravel.log` (zoek op ProcessCvImport, Vertex AI).
3. **pdftotext** – Installeer `poppler-utils`: `sudo apt-get install -y poppler-utils`
4. **Workers** – Controleer of workers draaien: Forge → Daemons, connection: `redis`, directory: `.../current/backend`
5. **GCP credentials** – Zorg dat `GOOGLE_APPLICATION_CREDENTIALS` naar een bestaand, leesbaar bestand wijst.

### 500 errors

```bash
ssh forge@SERVER_IP
tail -f /home/forge/avecrm.nl/current/backend/storage/logs/laravel.log
```

### Deployment mislukt

```bash
cd /home/forge/avecrm.nl/current/backend
php artisan config:clear
php artisan cache:clear
composer install
```

### Frontend laadt niet

```bash
ls -la /home/forge/avecrm.nl/current/backend/public/
```

---

_Laatst bijgewerkt: 11 januari 2026_
