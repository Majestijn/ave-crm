# AVE CRM - Deployment Readiness Rapport

**Datum:** 11 januari 2026  
**Status:** ⚠️ Gereed voor deployment met enkele aandachtspunten

---

## 📋 Inhoudsopgave

1. [Executive Summary](#1-executive-summary)
2. [Architectuur Overzicht](#2-architectuur-overzicht)
3. [Deployment Readiness Checklist](#3-deployment-readiness-checklist)
4. [Vereiste Accounts & Services](#4-vereiste-accounts--services)
5. [Environment Variabelen](#5-environment-variabelen)
6. [Aanbevolen Deployment Strategie](#6-aanbevolen-deployment-strategie)
7. [Security Overwegingen](#7-security-overwegingen)
8. [Aandachtspunten & Risico's](#8-aandachtspunten--risicos)
9. [Post-Deployment Taken](#9-post-deployment-taken)
10. [Kostenraming](#10-kostenraming)

---

## 1. Executive Summary

### Huidige Status

Het AVE CRM is **functioneel compleet** voor de kernfunctionaliteiten:

- ✅ Multi-tenant architectuur (database-per-tenant)
- ✅ Gebruikersbeheer met rollen (admin, recruiter, viewer)
- ✅ Contacten/Kandidaten beheer
- ✅ Klantenbeheer (Accounts)
- ✅ Opdrachten beheer met arbeidsvoorwaarden
- ✅ Kandidaat-opdracht koppeling met status tracking
- ✅ CV Import (Smart AI + Bulk ZIP)
- ✅ Agenda functionaliteit met iCal feeds
- ✅ Document opslag (Cloudflare R2)

### Gereedheid voor Productie

| Aspect                   | Status                  | Toelichting                          |
| ------------------------ | ----------------------- | ------------------------------------ |
| Backend functionaliteit  | ✅ Gereed               | Alle API endpoints functioneel       |
| Frontend functionaliteit | ✅ Gereed               | UI volledig geïmplementeerd          |
| Database schema          | ✅ Gereed               | Migraties up-to-date                 |
| Security                 | ⚠️ Aandacht nodig       | CORS, HTTPS, secrets management      |
| Performance              | ⚠️ Aandacht nodig       | Queue workers, caching               |
| Monitoring               | ❌ Niet geïmplementeerd | Logging/alerting nog te configureren |

---

## 2. Architectuur Overzicht

### Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 19 + TypeScript + Material-UI + TanStack Query       │
│  Build: Vite 7                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP/REST API
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  Laravel 12 + PHP 8.3 + Sanctum (Auth)                      │
│  Multi-tenancy: Spatie Laravel Multitenancy                 │
└─────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ PostgreSQL  │ │    Redis    │ │Cloudflare R2│ │  Google AI  │
│ (DB/tenant) │ │   (Cache)   │ │  (Storage)  │ │   (Gemini)  │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### Multi-Tenancy Model

- **Tenant Resolution:** Domain-based (`tenant1.ave-crm.nl`)
- **Database Isolation:** Aparte PostgreSQL database per tenant
- **Landlord Database:** Centrale database voor tenant metadata + queue jobs

---

## 3. Deployment Readiness Checklist

### ✅ Volledig Gereed

- [x] Alle CRUD operaties voor core entities
- [x] Authenticatie & autorisatie (Sanctum + Policies)
- [x] Multi-tenant isolatie
- [x] CV parsing met AI (Gemini)
- [x] Bestandsopslag (R2)
- [x] Queue jobs voor async processing
- [x] iCal feed generatie

### ⚠️ Productie-aanpassingen Nodig

- [ ] CORS configuratie beperken (nu `*`)
- [ ] APP_DEBUG uitschakelen
- [ ] APP_ENV naar `production`
- [ ] HTTPS forceren
- [ ] Rate limiting finetunen
- [ ] Frontend API URL dynamisch maken
- [ ] Error logging naar extern systeem
- [ ] Health checks uitbreiden

### ❌ Nog Te Implementeren (optioneel voor MVP)

- [ ] E-mail notificaties
- [ ] Backup strategie
- [ ] Monitoring & alerting
- [ ] CI/CD pipeline
- [ ] Geautomatiseerde tests uitbreiden

---

## 4. Vereiste Accounts & Services

### 🔴 KRITIEK - Zonder deze werkt de applicatie niet

| Service                   | Doel                                 | Actie voor Opdrachtgever           |
| ------------------------- | ------------------------------------ | ---------------------------------- |
| **Cloudflare**            | DNS, R2 Storage, (optioneel) Hosting | Account aanmaken op cloudflare.com |
| **Google Cloud Platform** | AI (Gemini/Vertex), Cloud Storage    | Project aanmaken in GCP Console    |
| **PostgreSQL Hosting**    | Database                             | Supabase, Neon, of eigen server    |

### 🟡 AANBEVOLEN - Voor productie kwaliteit

| Service              | Doel                      | Actie voor Opdrachtgever                 |
| -------------------- | ------------------------- | ---------------------------------------- |
| **Domain Registrar** | Domein (bijv. ave-crm.nl) | Domein registreren                       |
| **SSL Certificate**  | HTTPS                     | Via Cloudflare (gratis) of Let's Encrypt |
| **Redis Hosting**    | Cache & Sessions          | Upstash, Redis Cloud, of eigen server    |
| **Logging Service**  | Error tracking            | Sentry, LogRocket, of Papertrail         |
| **E-mail Service**   | Transactionele emails     | Resend, Postmark, of Mailgun             |

### 🟢 OPTIONEEL - Nice-to-have

| Service               | Doel                          |
| --------------------- | ----------------------------- |
| **Uptime Monitoring** | Pingdom, UptimeRobot          |
| **Analytics**         | Plausible, PostHog            |
| **Backup Service**    | Automatische database backups |

---

## 5. Environment Variabelen

### Backend (.env) - Productie Template

```env
# ─────────────────────────────────────────────────
# APPLICATION
# ─────────────────────────────────────────────────
APP_NAME="AVE CRM"
APP_ENV=production
APP_KEY=base64:GENERATE_NEW_KEY_WITH_php_artisan_key:generate
APP_DEBUG=false
APP_URL=https://api.ave-crm.nl
APP_FEED_URL=https://api.ave-crm.nl
TENANT_DOMAIN_SUFFIX=ave-crm.nl

# ─────────────────────────────────────────────────
# DATABASE (PostgreSQL)
# ─────────────────────────────────────────────────
DB_CONNECTION=pgsql
DB_HOST=your-postgres-host.com
DB_PORT=5432
DB_DATABASE=avecrm_landlord
DB_USERNAME=avecrm_user
DB_PASSWORD=STRONG_PASSWORD_HERE

# ─────────────────────────────────────────────────
# CACHE & SESSIONS
# ─────────────────────────────────────────────────
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=database
REDIS_HOST=your-redis-host.com
REDIS_PASSWORD=REDIS_PASSWORD_HERE
REDIS_PORT=6379

# ─────────────────────────────────────────────────
# CLOUDFLARE R2 (File Storage)
# ─────────────────────────────────────────────────
FILESYSTEM_DISK=r2
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET=ave-crm-files
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_REGION=auto

# ─────────────────────────────────────────────────
# GOOGLE AI (Gemini - Smart CV Import)
# ─────────────────────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

# ─────────────────────────────────────────────────
# GOOGLE CLOUD (Vertex AI - Bulk CV Import)
# ─────────────────────────────────────────────────
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_BUCKET=your-gcs-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=gcp-service-account.json
VERTEX_AI_LOCATION=europe-west4
VERTEX_AI_MODEL=gemini-2.0-flash-001

# ─────────────────────────────────────────────────
# SECURITY
# ─────────────────────────────────────────────────
SANCTUM_STATEFUL_DOMAINS=ave-crm.nl,*.ave-crm.nl
SESSION_DOMAIN=.ave-crm.nl
```

### Frontend - Productie Aanpassingen

De frontend API URL is momenteel hardcoded op poort 8080:

```typescript
// frontend/src/api/client.ts - MOET WORDEN AANGEPAST
baseURL: `${window.location.protocol}//${window.location.hostname}:8080/api/v1`;

// PRODUCTIE VERSIE:
baseURL: `${window.location.protocol}//api.${window.location.hostname.replace(
  /^[^.]+\./,
  ""
)}/api/v1`;
// OF met environment variable via Vite:
baseURL: import.meta.env.VITE_API_URL || "/api/v1";
```

---

## 6. Aanbevolen Deployment Strategie

### 🏆 Optie A: Laravel Forge + DigitalOcean (AANBEVOLEN)

**Voordelen:** Alles bij 2 partijen, specifiek voor Laravel, minimale configuratie

Laravel Forge is gemaakt door Taylor Otwell (de maker van Laravel) en is de standaard voor Laravel deployments. Het beheert automatisch:

- ✅ Nginx configuratie
- ✅ PHP-FPM met juiste versie
- ✅ Queue workers (Supervisor)
- ✅ SSL certificaten (Let's Encrypt)
- ✅ Git push-to-deploy
- ✅ Database backups
- ✅ Server monitoring
- ✅ Cron jobs (Laravel scheduler)

```
┌─────────────────────────────────────────────────────────────────┐
│                    LARAVEL FORGE (Beheerpanel)                  │
│  • 1-click server provisioning                                  │
│  • Automatische deployments bij git push                        │
│  • SSL, queues, scheduler out-of-the-box                        │
└─────────────────────────────────────────────────────────────────┘
                              │ beheert
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 DIGITALOCEAN DROPLET ($24/maand)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Nginx   │ │ PHP 8.3  │ │PostgreSQL│ │  Redis   │           │
│  │          │ │ + Laravel│ │    16    │ │          │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────────────────────────────────────────────┐           │
│  │         React Frontend (gebuild, static files)   │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

**Kosten:**

| Service                        | Kosten         |
| ------------------------------ | -------------- |
| Laravel Forge                  | $12/maand      |
| DigitalOcean Droplet (4GB RAM) | $24/maand      |
| **Totaal**                     | **~€33/maand** |

**Stappen:**

1. DigitalOcean account aanmaken → [digitalocean.com](https://digitalocean.com)
2. Laravel Forge account aanmaken → [forge.laravel.com](https://forge.laravel.com)
3. Forge koppelen aan DigitalOcean (API token)
4. "Create Server" klikken in Forge (kies 4GB droplet)
5. Forge installeert automatisch Nginx, PHP, PostgreSQL, Redis
6. GitHub/GitLab repository koppelen
7. Environment variables instellen in Forge
8. "Deploy Now" klikken
9. Done! 🎉

---

### 🥈 Optie B: Railway (Nog simpeler, iets duurder)

**Voordelen:** Letterlijk alles in 1 platform, zero config, GitHub integratie

Railway detecteert automatisch dat het een Laravel project is en configureert alles.

```
┌─────────────────────────────────────────────────────────────────┐
│                        RAILWAY.APP                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │ Laravel App   │  │  PostgreSQL   │  │    Redis      │        │
│  │ (auto-detect) │  │  (1-click)    │  │   (1-click)   │        │
│  └───────────────┘  └───────────────┘  └───────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

**Kosten:** ~$20-50/maand (usage-based, hangt af van traffic)

**Stappen:**

1. Railway account aanmaken → [railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub repo"
3. "Add Service" → PostgreSQL
4. "Add Service" → Redis
5. Environment variables kopiëren (Railway geeft je de database URLs)
6. Push naar GitHub → Automatisch deployed!

---

### 🥉 Optie C: Ploi + Hetzner (Budget optie)

**Voordelen:** Zelfde concept als Forge, maar goedkoper

```
┌─────────────────────────────────────────────────────────────────┐
│                      PLOI.IO (€8/maand)                          │
│  Zelfde functionaliteit als Forge                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 HETZNER VPS (€6/maand voor 4GB)                  │
│  Dezelfde stack als bij Forge                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Kosten:** ~€14/maand totaal

---

### 📊 Vergelijking All-in-One Oplossingen

| Oplossing              | Accounts nodig | Setup tijd | Kosten/maand | Laravel Support |
| ---------------------- | -------------- | ---------- | ------------ | --------------- |
| **Laravel Forge + DO** | 2              | ~30 min    | €33          | ⭐⭐⭐ Perfect  |
| **Railway**            | 1              | ~10 min    | €20-50       | ⭐⭐ Goed       |
| **Ploi + Hetzner**     | 2              | ~30 min    | €14          | ⭐⭐⭐ Perfect  |
| **Render**             | 1              | ~15 min    | €25-50       | ⭐⭐ Goed       |

### ✅ Mijn Aanbeveling: Laravel Forge + DigitalOcean

**Waarom dit de beste keuze is:**

1. **Specifiek voor Laravel** - Queue workers, scheduler, Horizon werken direct
2. **1 dashboard** - Alles beheren vanuit Forge interface
3. **Push-to-deploy** - `git push` → automatische deployment
4. **SSL automatisch** - Let's Encrypt certificaten gratis en auto-renew
5. **Database backups ingebouwd** - Dagelijkse backups naar S3/Spaces
6. **Uitstekende documentatie** - Veel tutorials en community support
7. **Schaalbaar** - Later makkelijk naar grotere server of load balancer

### 🖥️ Waar draait de Frontend?

**Aanbevolen: Op dezelfde server als de backend**

De React frontend wordt gebouwd (`npm run build`) en de resulterende static files worden geserveerd door Nginx op dezelfde DigitalOcean server. Dit is de simpelste setup:

```
ave-crm.nl/          → React frontend (static files)
ave-crm.nl/api/      → Laravel backend (PHP)
tenant1.ave-crm.nl/  → React frontend (zelfde files)
tenant1.ave-crm.nl/api/ → Laravel backend (tenant context)
```

**Deploy proces:**

1. Git push naar repository
2. Forge runt automatisch:
   - `cd frontend && npm install && npm run build`
   - `cd backend && composer install && php artisan migrate`
3. Nginx serveert de nieuwe files

**Alternatief: Cloudflare Pages (gratis)**

Als je de frontend liever apart host:

- Frontend op Cloudflare Pages (gratis, met CDN)
- Backend op DigitalOcean
- Vereist CORS configuratie voor cross-origin API calls

---

## 7. Security Overwegingen

### 🔴 Kritieke Aanpassingen voor Productie

#### 1. CORS Beperken

```php
// config/cors.php - HUIDIGE (ONVEILIG)
'allowed_origins' => ['*'],

// PRODUCTIE
'allowed_origins' => [
    'https://ave-crm.nl',
    'https://*.ave-crm.nl',
],
```

#### 2. Debug Mode Uitschakelen

```env
APP_DEBUG=false
APP_ENV=production
```

#### 3. HTTPS Forceren

```php
// app/Providers/AppServiceProvider.php
public function boot(): void
{
    if (config('app.env') === 'production') {
        URL::forceScheme('https');
    }
}
```

#### 4. Secrets Management

- Gebruik **GEEN** `.env` file in productie containers
- Gebruik environment variables via hosting platform
- Of secrets manager (AWS Secrets Manager, Vault)

#### 5. Database Credentials

- Aparte read-only user voor queries
- Sterke wachtwoorden (32+ karakters)
- SSL verbinding naar database

### 🟡 Aanbevolen Security Maatregelen

- [ ] Content Security Policy headers
- [ ] Rate limiting per tenant
- [ ] Input validation uitbreiden
- [ ] SQL injection testing (al beschermd via Eloquent)
- [ ] XSS testing (React escaped by default)
- [ ] CSRF tokens (Sanctum handled)

---

## 8. Aandachtspunten & Risico's

### ⚠️ Bekende Issues

| Issue                        | Ernst  | Oplossing                            |
| ---------------------------- | ------ | ------------------------------------ |
| Mock data in assignments.tsx | Laag   | Kan verwijderd worden, niet gebruikt |
| Frontend hardcoded port 8080 | Medium | Aanpassen voor productie             |
| Geen email functionaliteit   | Medium | Nog te implementeren indien nodig    |
| Geen backup strategie        | Hoog   | Moet geconfigureerd worden           |

### 🔄 Queue Workers

De applicatie gebruikt queue jobs voor:

- Smart CV Import (ProcessCvImport)
- Batch CV Import status checking

**Met Laravel Forge:** ✅ Automatisch geconfigureerd!

Forge maakt automatisch een Supervisor configuratie aan. Je hoeft alleen in Forge onder "Queue" de worker aan te zetten.

**Handmatig (zonder Forge):**

```bash
# Supervisor configuratie voor queue worker
php artisan queue:work --queue=default --tries=3 --timeout=120
```

### 📊 Performance Overwegingen

1. **Database Indexen:** Controleren of alle foreign keys geïndexeerd zijn
2. **N+1 Queries:** Eager loading is geïmplementeerd, maar review aanbevolen
3. **Redis Caching:** Tenant switching cache is geconfigureerd
4. **CDN:** Frontend static assets via Cloudflare

---

## 9. Post-Deployment Taken

### Week 1: Stabilisatie

- [ ] Monitoring opzetten (uptime, errors)
- [ ] Eerste tenant aanmaken en testen
- [ ] Backup schedule configureren
- [ ] Log aggregatie opzetten

### Week 2-4: Optimalisatie

- [ ] Performance baseline meten
- [ ] Query optimalisatie indien nodig
- [ ] Rate limits finetunen
- [ ] Security scan uitvoeren

### Ongoing

- [ ] Regelmatige security updates
- [ ] Database maintenance (vacuum, reindex)
- [ ] Log review
- [ ] Tenant onboarding proces documenteren

---

## 10. Kostenraming

### 🏆 Aanbevolen: Laravel Forge + DigitalOcean

| Service                    | Kosten            | Toelichting            |
| -------------------------- | ----------------- | ---------------------- |
| Laravel Forge              | €11/maand         | Server management      |
| DigitalOcean Droplet (4GB) | €22/maand         | Alles draait hierop    |
| Cloudflare R2              | €5-15/maand       | CV/document opslag     |
| Google AI (Gemini)         | €10-30/maand      | CV parsing             |
| Domein (.nl)               | €10/jaar          | -                      |
| **Totaal**                 | **~€50-80/maand** | Voor gemiddeld gebruik |

### Budget Optie: Ploi + Hetzner

| Service            | Kosten            |
| ------------------ | ----------------- |
| Ploi               | €8/maand          |
| Hetzner VPS (4GB)  | €6/maand          |
| Cloudflare R2      | €5-15/maand       |
| Google AI (Gemini) | €10-30/maand      |
| **Totaal**         | **~€30-60/maand** |

### Google AI Kosten (Detail)

| Feature                   | Verwacht Gebruik | Kosten/maand |
| ------------------------- | ---------------- | ------------ |
| Gemini API (Smart Import) | ~500 CV's        | ~€5-15       |
| Vertex AI (Bulk Import)   | ~200 CV's        | ~€10-30      |
| Cloud Storage (temp)      | ~5GB             | ~€1          |

---

## 📞 Overzicht Accounts voor Opdrachtgever

### Bij Aanbevolen Setup (Forge + DigitalOcean) - slechts 4 accounts nodig:

| #   | Account           | Website                  | Waarvoor                        |
| --- | ----------------- | ------------------------ | ------------------------------- |
| 1   | **DigitalOcean**  | digitalocean.com         | Server hosting (alles-in-1)     |
| 2   | **Laravel Forge** | forge.laravel.com        | Server management & deployments |
| 3   | **Cloudflare**    | cloudflare.com           | DNS + R2 storage voor bestanden |
| 4   | **Google Cloud**  | console.cloud.google.com | AI (Gemini) voor CV parsing     |

### Stap-voor-stap account setup:

#### 1. DigitalOcean Account

- Ga naar [digitalocean.com](https://digitalocean.com)
- Account aanmaken met creditcard
- Genereer een API token (Settings → API → Generate New Token)
- Bewaar dit token voor Forge

#### 2. Laravel Forge Account

- Ga naar [forge.laravel.com](https://forge.laravel.com)
- Account aanmaken ($12/maand)
- Koppel DigitalOcean via het API token
- Forge kan nu servers voor je aanmaken

#### 3. Cloudflare Account

- Ga naar [cloudflare.com](https://cloudflare.com)
- Gratis account aanmaken
- Domein toevoegen en DNS instellen
- R2 bucket aanmaken voor bestandsopslag
- API credentials genereren voor R2

#### 4. Google Cloud Account

- Ga naar [console.cloud.google.com](https://console.cloud.google.com)
- Account aanmaken (creditcard vereist, maar gratis credits beschikbaar)
- Nieuw project aanmaken
- Gemini API inschakelen (AI Studio)
- API key genereren
- Cloud Storage bucket aanmaken (voor Vertex AI bulk import)
- Service Account aanmaken met juiste rechten

### Over te dragen van jouw accounts:

| Item                 | Actie                                              |
| -------------------- | -------------------------------------------------- |
| **R2 data**          | Bestanden exporteren en importeren naar hun bucket |
| **Database**         | SQL dump maken en importeren op nieuwe server      |
| **Environment vars** | .env template delen (zonder secrets)               |
| **Gemini API key**   | Zij maken nieuwe key in hun project                |
| **GCP credentials**  | Zij maken nieuwe service account                   |

### Checklist voor overdracht:

- [ ] Opdrachtgever heeft DigitalOcean account met betaalmethode
- [ ] Opdrachtgever heeft Forge account
- [ ] Opdrachtgever heeft Cloudflare account met domein
- [ ] Opdrachtgever heeft GCP account met billing
- [ ] API keys zijn gegenereerd en gedeeld
- [ ] Database is geëxporteerd
- [ ] R2 bestanden zijn gemigreerd
- [ ] DNS is geconfigureerd naar nieuwe server

---

## ✅ Conclusie

Het AVE CRM is **gereed voor deployment**.

### Aanbevolen aanpak:

1. **Laravel Forge + DigitalOcean** gebruiken (~€35/maand)
2. Slechts **4 accounts** nodig (DigitalOcean, Forge, Cloudflare, Google Cloud)
3. Deployment tijd: **~1 uur** voor eerste setup

### Nog te doen voor productie:

| Prioriteit    | Taak                                 | Wie       |
| ------------- | ------------------------------------ | --------- |
| 🔴 Kritiek    | Environment variabelen configureren  | Developer |
| 🔴 Kritiek    | CORS beperken tot productie domein   | Developer |
| 🔴 Kritiek    | Frontend API URL dynamisch maken     | Developer |
| 🟡 Aanbevolen | Monitoring opzetten                  | Na launch |
| 🟡 Aanbevolen | Backup schedule instellen (in Forge) | Na launch |

### Geschatte tijdsinvestering:

- **Code aanpassingen:** ~2 uur (CORS, API URL, env cleanup)
- **Account setup opdrachtgever:** ~1 uur
- **Deployment via Forge:** ~30 minuten
- **Testen & finetuning:** ~2 uur

**Totaal: ~1 werkdag** om van development naar productie te gaan.

---

_Document gegenereerd door Claude - 11 januari 2026_
