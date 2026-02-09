# Gemini Project Context: AVE CRM

This document provides a comprehensive overview of the AVE CRM project to be used as context for future AI interactions.

## 1. Project Overview

AVE CRM is a web application designed as a Customer Relationship Management (CRM) system, likely for the recruitment industry. It features a multi-tenant architecture, allowing different organizations to manage their own data securely.

The project is structured as a modern web application with:

- **Backend:** A RESTful API built with **PHP** and the **Laravel 12** framework. It handles business logic, data persistence, and authentication.
- **Frontend:** A single-page application (SPA) built with **React** and **TypeScript**. It utilizes **Material-UI (MUI)** for its component library and **Vite** for the build toolchain.
- **Database:** A **PostgreSQL** database is used for data storage.
- **Infrastructure:** The development environment is orchestrated using **Docker Compose**, which manages the backend services (PHP-FPM, Nginx, PostgreSQL, Redis).

Key entities in the application appear to be `Accounts`, `Candidates`, `Assignments`, and `Users`.

## 2. Huidige Status
*Laatst bijgewerkt: 02-02-2026*

Het project bevindt zich in een gevorderde validatiefase waarbij de technische architectuur grotendeels staat en de focus verschuift naar business-implementatie en schaalbaarheid.
- **Techniek:** Core functionaliteit (Multi-tenancy, AI parsing, Cloudflare R2 opslag) is technisch gevalideerd.
- **Business:** Pricing strategie en verdienmodel zijn vastgesteld op basis van marktonderzoek en kostenanalyse.
- **Volgende Stappen:** Implementatie van betalingsmodules (Stripe?), inrichten van productie-omgeving en onboarding-flow voor bureaus.

## 3. Building and Running

The project uses a combination of Docker for the backend and local Node.js for the frontend.

### Backend (Docker)

The backend services are managed by Docker Compose.

- **To start all services (in detached mode):**

  ```bash
  docker-compose up -d
  ```

- **To install/update PHP dependencies:**

  ```bash
  docker-compose exec backend-php composer install
  ```

- **To run backend tests:**

  ```bash
  docker-compose exec backend-php php artisan test
  ```

- **To view logs for a service (e.g., the backend):**

  ```bash
  docker-compose logs -f backend-php
  ```

- **Access Ports:**
  - **Web Application:** `http://localhost:8080` (via Nginx)
  - **Database Admin (Adminer):** `http://localhost:8081`

### Frontend (Local Node.js)

The frontend is developed on the host machine. You must be in the `frontend` directory to run these commands.

- **To install/update Node.js dependencies:**

  ```bash
  cd frontend
  npm install
  ```

- **To run the development server:**

  ```bash
  npm run dev
  ```

- **To build the frontend for production:**

  ```bash
  npm run build
  ```

- **To run the linter:**
  ```bash
  npm run lint
  ```

## 4. Development Conventions

### Backend (Laravel)

- **Multi-Tenancy:** The application is multi-tenant. The project uses Spatie's Multitenancy package. Models like `Account` and `User` use the `Spatie\Multitenancy\Models\Concerns\UsesTenantConnection` trait. Migrations are separated into `database/migrations/landlord` and `database/migrations/tenant`.
- **Authentication:** API authentication is handled using Laravel Sanctum.
- **API Design:** The API is versioned under the `/api/v1` prefix. It largely follows RESTful principles, using `apiResource` controllers where appropriate.
- **Routing:** API routes are defined in `routes/api.php`.
- **Database:** Database migrations manage the schema. Models use ULIDs (`uid`) as the public-facing identifier for routes (`getRouteKeyName()`).

## 5. Recente Besluiten & Architectuur

### Business & Pricing (02-02-2026)
- **Model:** 'Challenger' pricing vastgesteld op **€29 per gebruiker/maand** om agressief marktaandeel te pakken t.o.v. Bullhorn/Salesforce.
- **Upsell:** Bulk AI-parsing wordt een betaalde add-on (€20 voor 500 CV's). Marge hierop is >60% (kosten <€8).
- **Schaalbaarheid:** Bij 5% marktaandeel (575 bureaus) wordt een nettowinst van ~€48k/maand geprojecteerd. Hostingkosten zijn verwaarloosbaar t.o.v. de user-omzet.

### E-mail & Agenda Migratie
- **Besluit:** Migratie van Vimexx naar Microsoft 365 voor professionele agenda-synchronisatie met het CRM.
- **Alternatief:** Gratis Hotmail-accounts zijn technisch mogelijk voor agenda-koppeling (via Microsoft Graph), maar tonen een onprofessioneel verzendadres.
- **CalDAV:** CalDAV (Vimexx) is de budget-optie maar wordt afgeraden wegens complexiteit in Outlook/Mobiel en gebrekkige stabiliteit.

### AI & CV Parsing (Bulk Import)
- **Modellen:** 
    - **Gemini 3 Pro (AI Studio API):** Voor real-time verwerking van individuele CV's.
    - **Google Cloud Vertex AI (Batch Prediction):** Voor bulkverwerking van duizenden CV's (3500+).
- **Infrastructuur:** Gebruikt `google-credentials.json` (Service Account) in `backend/storage/app/`. Verwerking vindt plaats in regio `europe-west4` (Nederland) voor AVG/GDPR compliance.
- **Storage:** Cloudflare R2 wordt gebruikt met een **Folder-per-Tenant** strategie (`{tenant_id}/contacts/...`) voor maximale schaalbaarheid.

### Frontend State Management
- **Library:** TanStack Query (v5) is gekozen boven SWR en RTK Query.
- **Onderbouwing:** Focus op 'Functional Suitability' en 'Maintainability' conform **ISO/IEC 25010**. TanStack biedt de meest complete feature-set (mutations, devtools, optimistic updates) out-of-the-box.
- **Citaties:** Het onderzoeksrapport maakt gebruik van IEEE-verwijzingen en het DOT-framework voor onderbouwing (Juiste Kennis Ontwikkelen).

## 6. Belangrijke Bestanden
- `IMPLEMENTATIEPLAN_CV_GEMINI.md`: Plan voor de AI bulk import.
- `M365_MIGRATION_PLAN.md`: Stappenplan voor de mail-verhuizing.
- `DataFetching_State_Management_Plan.md`: Onderzoek en verantwoording frontend architectuur.
- `backend/storage/app/google-credentials.json`: Google Cloud Service Account keys.

### Frontend (React)

- **Language:** The frontend is written in **TypeScript**.
- **Component Library:** The project uses **Material-UI (MUI)** for UI components.
- **State Management & Data Fetching:** Data is fetched from the backend API using custom hooks (e.g., `useAccounts`). These hooks encapsulate logic for making API calls with `axios`, and managing loading, data, and error states.
- **Routing:** Client-side routing is managed by `react-router-dom`. Routes are defined in `src/router.tsx`.
- **Code Style:** ESLint is configured to enforce code style. Run `npm run lint` to check.

## 7. Historie

### 02-02-2026: Pricing & Business Case Analyse
- **Activiteit:** Onderzoek gedaan naar prijsstelling van concurrenten (Salesforce, HubSpot, Bullhorn) en analyse van interne kosten voor hosting en AI.
- **Besluit:** Pricing model vastgesteld op €29/user/maand + betaalde add-ons voor bulk AI.
- **Inzicht:** Winstgevendheid is extreem hoog bij schaalvergroting (break-even bij 2 users). Bij 1150 aangesloten bureaus (10% markt) is de potentiële winst ~€100k/maand.