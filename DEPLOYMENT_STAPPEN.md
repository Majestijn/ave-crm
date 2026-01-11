# AVE CRM - Deployment Stappenplan

**Methode:** Laravel Forge + DigitalOcean  
**Geschatte tijd:** ~2-3 uur  
**Kosten:** ~€35/maand

---

## 📋 Overzicht

```
[ ] 1. Code voorbereiden (30 min)
[ ] 2. Accounts aanmaken (20 min)
[ ] 3. Server opzetten via Forge (15 min)
[ ] 4. Database & Redis configureren (10 min)
[ ] 5. Applicatie deployen (15 min)
[ ] 6. SSL & Domein instellen (10 min)
[ ] 7. Externe services koppelen (20 min)
[ ] 8. Testen (30 min)
```

---

## 1. Code Voorbereiden

### 1.1 Frontend API URL dynamisch maken

Bewerk `frontend/src/api/client.ts`:

```typescript
// VOOR (development)
baseURL: `${window.location.protocol}//${window.location.hostname}:8080/api/v1`;

// NA (production-ready)
const getBaseUrl = () => {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Development: localhost met poort 8080
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return `${protocol}//${hostname}:8080/api/v1`;
  }

  // Production: zelfde domein, geen poort
  return `${protocol}//${hostname}/api/v1`;
};

const axiosInstance = axios.create({
  baseURL: getBaseUrl(),
  // ... rest
});
```

### 1.2 CORS beperken

Bewerk `backend/config/cors.php`:

```php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],

    // Production: vervang ave-crm.nl met jouw domein
    'allowed_origins' => [
        env('APP_URL'),
    ],
    'allowed_origins_patterns' => [
        env('CORS_PATTERN', '.*\.localhost'),  // fallback voor dev
    ],

    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

### 1.3 Environment template maken

Maak `backend/.env.production.example`:

```env
APP_NAME="AVE CRM"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://ave-crm.nl

# Tenant configuratie
TENANT_DOMAIN_SUFFIX=ave-crm.nl

# Database (Forge vult dit automatisch in)
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=avecrm
DB_USERNAME=forge
DB_PASSWORD=

# Cache & Queue
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=database
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# Cloudflare R2
FILESYSTEM_DISK=r2
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=ave-crm-files
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_REGION=auto

# Google AI
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

# Google Cloud (voor bulk import)
GOOGLE_CLOUD_PROJECT=
GOOGLE_CLOUD_BUCKET=
GOOGLE_APPLICATION_CREDENTIALS=gcp-credentials.json
VERTEX_AI_LOCATION=europe-west4
```

### 1.4 Deploy script maken

Maak `deploy.sh` in de root:

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Backend
cd /home/forge/ave-crm.nl/backend
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force

# Frontend
cd /home/forge/ave-crm.nl/frontend
npm ci
npm run build

# Copy frontend build to public
rm -rf /home/forge/ave-crm.nl/backend/public/app
cp -r /home/forge/ave-crm.nl/frontend/dist /home/forge/ave-crm.nl/backend/public/app

# Restart queue workers
php artisan queue:restart

echo "✅ Deployment complete!"
```

### 1.5 Commit & Push

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
6. **Kopieer en bewaar het token!** (je ziet het maar 1x)

### 2.2 Laravel Forge

1. Ga naar [forge.laravel.com](https://forge.laravel.com)
2. Account aanmaken ($12/maand)
3. Ga naar **Server Providers** → **Add Provider**
4. Kies **DigitalOcean**
5. Plak je API token
6. Klik **Add Provider**

### 2.3 Cloudflare

1. Ga naar [cloudflare.com](https://cloudflare.com)
2. Gratis account aanmaken
3. **Add Site** → voer je domein in
4. Kies **Free plan**
5. Volg de instructies om nameservers te wijzigen bij je registrar
6. Ga naar **R2** → **Create Bucket**
   - Naam: `ave-crm-files`
   - Location: EU
7. Ga naar **R2** → **Manage R2 API Tokens** → **Create API Token**
   - Permissions: Object Read & Write
   - Bucket: `ave-crm-files`
   - **Kopieer Access Key ID en Secret!**

### 2.4 Google Cloud

1. Ga naar [console.cloud.google.com](https://console.cloud.google.com)
2. Account aanmaken of inloggen
3. **New Project** → Naam: `ave-crm`
4. **APIs & Services** → **Enable APIs**:
   - Generative Language API (Gemini)
   - Vertex AI API
   - Cloud Storage API
5. **APIs & Services** → **Credentials** → **Create Credentials** → **API Key**
   - **Kopieer de API key!**
6. **Cloud Storage** → **Create Bucket**:
   - Naam: `ave-crm-cv-processing`
   - Location: `europe-west4`
7. **IAM** → **Service Accounts** → **Create**:
   - Naam: `ave-crm-backend`
   - Roles: Storage Admin, Vertex AI User
   - **Create Key** → JSON → Download

---

## 3. Server Opzetten via Forge

### 3.1 Server Aanmaken

1. In Forge: **Create Server**
2. Provider: **DigitalOcean**
3. Credentials: (automatisch geselecteerd)
4. Server Settings:
   - Name: `ave-crm-production`
   - Region: **Amsterdam** (AMS3)
   - Server Size: **4GB RAM / 2 CPU** ($24/month)
   - PHP Version: **8.3**
   - Database: **PostgreSQL 16**
5. Klik **Create Server**
6. **Wacht 5-10 minuten** tot de server klaar is

### 3.2 Database Aanmaken

1. In Forge: ga naar je server → **Database**
2. Klik **Add Database**
3. Name: `avecrm`
4. User: `forge` (standaard)

### 3.3 Site Toevoegen

1. In Forge: ga naar je server → **Sites**
2. **New Site**:
   - Domain: `ave-crm.nl` (of jouw domein)
   - Project Type: **General PHP / Laravel**
   - Web Directory: `/backend/public`
3. Klik **Add Site**

### 3.4 Repository Koppelen

1. Ga naar de site → **Git Repository**
2. Provider: **GitHub** (of GitLab/Bitbucket)
3. Repository: `jouw-username/ave-crm`
4. Branch: `main`
5. **Vink NIET aan**: Install Composer Dependencies (we doen dit handmatig)
6. Klik **Install Repository**

---

## 4. Configuratie

### 4.1 Environment Variables

1. Ga naar site → **Environment**
2. Bewerk het `.env` bestand:

```env
APP_NAME="AVE CRM"
APP_ENV=production
APP_KEY=base64:LAAT_FORGE_DIT_GENEREREN
APP_DEBUG=false
APP_URL=https://ave-crm.nl
APP_FEED_URL=https://ave-crm.nl

TENANT_DOMAIN_SUFFIX=ave-crm.nl

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=avecrm
DB_USERNAME=forge
DB_PASSWORD=FORGE_HEEFT_DIT_GEGENEREERD

CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=database
REDIS_HOST=127.0.0.1

# Cloudflare R2 - vul in met jouw keys
FILESYSTEM_DISK=r2
R2_ACCESS_KEY_ID=jouw_r2_access_key
R2_SECRET_ACCESS_KEY=jouw_r2_secret_key
R2_BUCKET=ave-crm-files
R2_ENDPOINT=https://JOUW_ACCOUNT_ID.r2.cloudflarestorage.com
R2_REGION=auto

# Google AI - vul in met jouw keys
GEMINI_API_KEY=jouw_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

# Google Cloud - vul in
GOOGLE_CLOUD_PROJECT=ave-crm
GOOGLE_CLOUD_BUCKET=ave-crm-cv-processing
GOOGLE_APPLICATION_CREDENTIALS=gcp-credentials.json
VERTEX_AI_LOCATION=europe-west4
```

3. Klik **Save**

### 4.2 GCP Credentials Uploaden

1. SSH naar de server (Forge → Server → Terminal, of eigen terminal):

```bash
ssh forge@JOUW_SERVER_IP
cd /home/forge/ave-crm.nl/backend
nano gcp-credentials.json
# Plak de inhoud van je gedownloade JSON file
# Ctrl+X, Y, Enter om op te slaan
chmod 600 gcp-credentials.json
```

### 4.3 Deploy Script Instellen

1. Ga naar site → **Deployment**
2. Vervang het deploy script met:

```bash
cd /home/forge/ave-crm.nl

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

# Copy build to backend public
rm -rf ../backend/public/app
cp -r dist ../backend/public/app

# Restart queue
cd ../backend
php artisan queue:restart

echo "Deployed at $(date)"
```

3. Klik **Save**

### 4.4 Nginx Configuratie

1. Ga naar site → **Nginx Configuration**
2. Vervang de location block met:

```nginx
location / {
    # Probeer eerst static files, dan Laravel, dan SPA fallback
    try_files $uri $uri/ /app/index.html /index.php?$query_string;
}

location /api {
    try_files $uri $uri/ /index.php?$query_string;
}

location /app {
    alias /home/forge/ave-crm.nl/backend/public/app;
    try_files $uri $uri/ /app/index.html;
}
```

3. Klik **Save** (Nginx herstart automatisch)

---

## 5. Deployen

### 5.1 Eerste Deployment

1. Ga naar site → **Deployment**
2. Klik **Deploy Now**
3. Bekijk de output - dit duurt ~2-5 minuten
4. Controleer of er geen errors zijn

### 5.2 Queue Worker Aanzetten

1. Ga naar server → **Daemons**
2. **New Daemon**:
   - Command: `php artisan queue:work --sleep=3 --tries=3 --max-time=3600`
   - Directory: `/home/forge/ave-crm.nl/backend`
   - User: `forge`
   - Processes: `1`
3. Klik **Create**

### 5.3 Scheduler Aanzetten

1. Ga naar server → **Scheduler**
2. **New Scheduled Job**:
   - Command: `php artisan schedule:run`
   - User: `forge`
   - Frequency: **Every Minute**
   - Directory: `/home/forge/ave-crm.nl/backend`
3. Klik **Create**

---

## 6. SSL & Domein

### 6.1 DNS Instellen (Cloudflare)

1. In Cloudflare → DNS Records:

```
Type  | Name          | Content           | Proxy
A     | @             | JOUW_SERVER_IP    | DNS only (grey cloud)
A     | *             | JOUW_SERVER_IP    | DNS only (grey cloud)
```

⚠️ **Belangrijk:** Zet proxy UIT (grey cloud) voor Forge SSL te laten werken

### 6.2 SSL Certificaat (Forge)

1. Ga naar site → **SSL**
2. Klik **LetsEncrypt**
3. Domains: `ave-crm.nl`
4. Klik **Obtain Certificate**
5. Wacht tot het certificaat is aangemaakt

### 6.3 Wildcard SSL (voor tenants)

1. Nog steeds in SSL → **LetsEncrypt**
2. Klik **Clone Certificate** of maak nieuwe
3. Domains: `*.ave-crm.nl`
4. ⚠️ Dit vereist DNS challenge - volg Forge instructies

---

## 7. Eerste Tenant Aanmaken

### 7.1 Landlord Database Migreren

SSH naar server:

```bash
cd /home/forge/ave-crm.nl/backend
php artisan migrate --path=database/migrations/landlord
```

### 7.2 Test Tenant Registreren

1. Ga naar `https://ave-crm.nl/register`
2. Vul de registratiegegevens in
3. Check of de tenant database is aangemaakt

---

## 8. Testen

### Checklist

- [ ] Homepage laadt (`https://ave-crm.nl`)
- [ ] Login werkt
- [ ] Tenant registratie werkt
- [ ] Tenant subdomain werkt (`https://tenant1.ave-crm.nl`)
- [ ] Contacten toevoegen werkt
- [ ] CV Smart Import werkt
- [ ] CV Bulk Import (ZIP) werkt
- [ ] Bestanden uploaden naar R2 werkt
- [ ] Agenda items aanmaken werkt

---

## 🎉 Done!

Je applicatie draait nu in productie op:

- **Hoofddomein:** https://ave-crm.nl
- **Tenant voorbeeld:** https://tenant1.ave-crm.nl

### Volgende stappen (optioneel):

- [ ] Monitoring opzetten (Forge heeft basic monitoring)
- [ ] Database backups configureren (Forge → Server → Backups)
- [ ] Custom error pages maken
- [ ] Rate limiting finetunen

---

## 🆘 Troubleshooting

### Deployment mislukt

```bash
ssh forge@SERVER_IP
cd /home/forge/ave-crm.nl/backend
php artisan config:clear
php artisan cache:clear
composer install
```

### 500 errors

```bash
tail -f /home/forge/ave-crm.nl/backend/storage/logs/laravel.log
```

### Queue werkt niet

```bash
php artisan queue:restart
# Check daemon in Forge
```

### Frontend laadt niet

Check of de build succeeded:

```bash
ls -la /home/forge/ave-crm.nl/backend/public/app/
```

---

_Laatst bijgewerkt: 11 januari 2026_
