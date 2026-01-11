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
   - Name: `sparxsoftware-production`
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
   - Domain: `sparxsoftware.nl`
   - Project Type: **General PHP / Laravel**
   - Web Directory: `/backend/public`
2. Klik **Add Site**

### 3.4 Repository Koppelen

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
APP_URL=https://sparxsoftware.nl
APP_FEED_URL=https://sparxsoftware.nl

TENANT_DOMAIN_SUFFIX=sparxsoftware.nl

# Database (Forge vult wachtwoord in)
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=avecrm
DB_USERNAME=forge
DB_PASSWORD=_KIJK_BOVENAAN_ENV_FILE_

# Cache & Queue
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=database
REDIS_HOST=127.0.0.1

# CORS
CORS_ALLOWED_ORIGIN=https://sparxsoftware.nl
CORS_PATTERN=https?://.*\.sparxsoftware\.nl

#------------------------------------------------------------------------------
# JOUW BESTAANDE KEYS (later te vervangen)
#------------------------------------------------------------------------------

# Cloudflare R2 - jouw bestaande bucket
FILESYSTEM_DISK=r2
R2_ACCESS_KEY_ID=<jouw_huidige_r2_key>
R2_SECRET_ACCESS_KEY=<jouw_huidige_r2_secret>
R2_BUCKET=<jouw_bucket_naam>
R2_ENDPOINT=https://<jouw_account_id>.r2.cloudflarestorage.com
R2_REGION=auto

# Google AI Studio - jouw bestaande key
GEMINI_API_KEY=<jouw_huidige_gemini_key>
GEMINI_MODEL=gemini-2.5-flash

# Google Cloud / Vertex AI - jouw bestaande project
GOOGLE_CLOUD_PROJECT=<jouw_project_id>
GOOGLE_CLOUD_BUCKET=<jouw_gcs_bucket>
GOOGLE_APPLICATION_CREDENTIALS=gcp-credentials.json
VERTEX_AI_LOCATION=europe-west4
```

### 4.2 GCP Credentials Uploaden

SSH naar de server:

```bash
ssh forge@JOUW_SERVER_IP
cd /home/forge/sparxsoftware.nl/backend
nano gcp-credentials.json
# Plak je bestaande GCP service account JSON
# Ctrl+X, Y, Enter
chmod 600 gcp-credentials.json
```

### 4.3 Deploy Script

Ga naar site → **Deployment** en vervang met:

```bash
cd /home/forge/sparxsoftware.nl

# Backend
cd backend
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force

# Frontend
cd ../frontend
npm ci
npm run build

# Copy build to backend
rm -rf ../backend/public/app
cp -r dist ../backend/public/app

# Restart queue
cd ../backend
php artisan queue:restart

echo "Deployed at $(date)"
```

### 4.4 Nginx Configuratie

Ga naar site → **Nginx Configuration** en voeg toe in de server block:

```nginx
location / {
    try_files $uri $uri/ /app/index.html /index.php?$query_string;
}

location /api {
    try_files $uri $uri/ /index.php?$query_string;
}

location /app {
    alias /home/forge/sparxsoftware.nl/backend/public/app;
    try_files $uri $uri/ /app/index.html;
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
   - Directory: `/home/forge/sparxsoftware.nl/backend`
   - User: `forge`
2. Klik **Create**

### 5.3 Scheduler

1. Ga naar server → **Scheduler** → **New Scheduled Job**
   - Command: `php artisan schedule:run`
   - Frequency: **Every Minute**
   - Directory: `/home/forge/sparxsoftware.nl/backend`

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
2. Domain: `sparxsoftware.nl`
3. Klik **Obtain Certificate**

### 6.3 Wildcard SSL (voor tenants)

1. Nog in SSL → nieuwe certificate
2. Domain: `*.sparxsoftware.nl`
3. Volg DNS challenge instructies

---

## 7. Testen

- [ ] Homepage laadt (`https://sparxsoftware.nl`)
- [ ] Login werkt
- [ ] Tenant registratie werkt
- [ ] Tenant subdomain werkt (`https://test.sparxsoftware.nl`)
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

### 500 errors

```bash
ssh forge@SERVER_IP
tail -f /home/forge/sparxsoftware.nl/backend/storage/logs/laravel.log
```

### Deployment mislukt

```bash
cd /home/forge/sparxsoftware.nl/backend
php artisan config:clear
php artisan cache:clear
composer install
```

### Frontend laadt niet

```bash
ls -la /home/forge/sparxsoftware.nl/backend/public/app/
```

---

_Laatst bijgewerkt: 11 januari 2026_
