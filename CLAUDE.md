# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AVE CRM is a multi-tenant SaaS CRM system for the recruitment industry. It uses a database-per-tenant architecture with Spatie Laravel Multitenancy for complete data isolation.

- **Backend:** Laravel 12 + PHP 8.3 (RESTful API under `/api/v1`)
- **Frontend:** React 19 + TypeScript + Material-UI (MUI)
- **Database:** PostgreSQL 16 (separate databases per tenant)
- **Infrastructure:** Docker Compose (backend services), local Node.js (frontend)

## Build & Run Commands

### First-time setup (new machine / fresh clone)

1. **Backend .env**: For Docker, copy `backend/.env.docker.example` to `backend/.env`, then run `docker-compose exec backend-php php artisan key:generate`. Ensure `APP_ENV=local` for CORS to allow localhost origins.
2. **Frontend**: `cd frontend && npm install`
3. **Docker**: `docker-compose up -d`
4. **Migrations**: See Migrations section below
5. If CORS errors persist: `docker-compose exec backend-php php artisan config:clear`

### Backend (Docker)

```bash
docker-compose up -d                                    # Start all services
docker-compose exec backend-php composer install        # Install PHP dependencies
docker-compose exec backend-php php artisan test        # Run tests
docker-compose logs -f backend-php                      # View logs
```

> **Lokale poort-override (deze machine):** een ander project (`htf-dashboard`) bezet de host-poorten **5432** (postgres) en **6379** (redis). Daarom staat er een **untracked** `docker-compose.override.yml` die db→**5433** en redis→**6380** remapt met de `!override` YAML-tag (Compose mergt `ports`-lijsten anders i.p.v. ze te vervangen). Intern blijft alles 5432/6379 (services praten via servicenaam over het docker-netwerk), dus géén `.env`-wijziging nodig. Host-tools (psql/TablePlus/Adminer-extern) op de ave-crm DB moeten poort **5433** gebruiken. App blijft op **8080**, Adminer op **8081**. Niet committen — machine-specifiek.

### Migrations (multi-tenant)

Migrations staan in `database/migrations/landlord/` en `database/migrations/tenant/`. Laravel kijkt standaard alleen in `database/migrations/` (geen subdirs), dus `migrate` zonder path vindt niets.

```bash
# Landlord (tenant-metadata)
docker-compose exec backend-php php artisan migrate --path=database/migrations/landlord

# Tenant-databases (per tenant, alleen nieuwe migraties)
docker-compose exec backend-php php artisan tenants:migrate
```

**Schema wijzigen = ALTIJD een nieuwe additieve migratie (productie is live!)** — sinds 2026-05-28 draait productie op Laravel Forge mét echte data. Het **bewerken van een bestaande create-migratie propageert NIET naar productie**: die migratie is daar al gedraaid en draait nooit opnieuw, dus de wijziging mist op productie. Dat gaf o.a. de ontbrekende `parent_logo_url`-kolom → 500 bij het opslaan van een account (zie migratie `2026_06_08_000001_add_parent_logo_url_to_accounts`). 

Een kolom-/schemawijziging is dus **altijd** een nieuw migratiebestand in `database/migrations/tenant/` (bv. `add_x_to_y`), idempotent met `Schema::hasColumn`/`hasTable`, zodat Forge het bij deploy via `tenants:migrate` toepast én het lokaal een no-op is. De create-migraties zijn gesquasht tot 4 bestanden — pas die **niet** meer aan voor wijzigingen.

> ⚠️ Tegen-intuïtief t.o.v. oudere instructies: vroeger was de regel "create-migratie bewerken + fresh migraten". Dat geldt **niet meer** nu productie live is — gebruik additieve migraties.

`migrate:fresh` is op productie destructief; gebruik het **alleen lokaal** voor een schone reset (en daarna `demo:seed-accounts`):

```bash
docker-compose exec backend-php php artisan tenants:artisan "migrate:fresh --path=database/migrations/tenant --database=tenant --force"
```

> **Productie** draait op Laravel Forge + DigitalOcean (site `/home/forge/avecrm.nl`, zero-downtime releases, landlord-DB `avecrm`, tenant-DB's `tenant_*`). Deploy = push naar de deploy-branch → Forge draait `migrate` + `tenants:migrate`. Zie `DEPLOYMENT_STAPPEN.md`.

### Demo-data seeden

```bash
# Dropdown-opties + demo-klanten/opdrachten/contacten + dashboard-demo
docker-compose exec backend-php php artisan demo:seed-accounts

# Reset: verwijdert ALLE tenants en hun databases (landlord wordt fresh gemigreerd)
docker-compose exec backend-php php artisan demo:reset
```

Demo-login na `demo:seed-accounts`: `stijn@aveconsult.nl` / `Aveconsult1!` (alle `@aveconsult.nl`-gebruikers; `@demo.nl`-gebruikers hebben wachtwoord `password`).

De canonieke dropdown-set (NL) staat in `Database\Seeders\DropdownOptionSeeder` (statische `seed()`, idempotent via `updateOrCreate` — voegt toe/werkt bij, verwijdert nooit); zowel `demo:seed-accounts` als de legacy-import delegeren ernaar. Dit is de enige bron van waarheid voor dropdown-opties.

**Dropdown-opties naar productie uitrollen** (bv. een nieuw dropdown-type toegevoegd aan de seeder): `php artisan dropdowns:sync [--tenant=]` draait alleen `DropdownOptionSeeder::seed()` per tenant — geen demo-data, geen import. Dit is dé manier om nieuwe opties op productie te krijgen, want de seeder draait niet vanzelf bij deploy.

**Legacy classificatie opschonen:** `php artisan classification:normalize [--tenant=] [--dry-run]` zet op bestaande accounts/contacten classificatie-*labels* om naar dropdown-*values* (label→value, plus `ClassificationRules::LEGACY_ALIASES` voor hernoemde waarden zoals `overig`→`andere`) en rapporteert orphans die nergens aan matchen. Zie de classificatie-gotcha hieronder.

### Legacy-data import

`php artisan legacy:import` zet de geëxporteerde JSON uit het oude `public`-schema (map `/old_data/`, gitignored — PII) terug in een tenant-DB onder verse ID's, met FK-remapping en behoud van `uid`. Opties: `--tenant`, `--path`, `--with-dropdowns`, `--force`. **Volledige productie-procedure (Forge): `docs/legacy-import.md`.** Op Forge wijst `storage_path()` naar de release-map, dus draai met `--path=/home/forge/avecrm.nl/shared/storage/app/legacy_import`.

### Frontend

```bash
cd frontend
npm install         # Install dependencies
npm run dev         # Development server (Vite)
npm run build       # Production build (tsc + vite build)
npm run lint        # ESLint
```

### Access Points

- Application: `http://localhost:8080`
- Adminer (DB admin): `http://localhost:8081`

### Production-readiness rapport

Een uitgebreide audit van het hele systeem (security, performance, UI/UX, devops) staat in `docs/production-readiness-2026-06-01.md` (bron) + `.docx` (pandoc). 10 critical blockers — pak file:line uit het rapport bij elke "fix X uit de audit"-vraag i.p.v. opnieuw scannen. Productie is live met klantdata sinds 2026-05-28; fixes moeten dat respecteren.

## Architecture

### Multi-Tenancy

- **Tenant resolution:** Domain-based (`DomainTenantFinder`)
- **Database strategy:** Separate PostgreSQL database per tenant
- **Migrations:** Split into `database/migrations/landlord/` (tenant metadata) and `database/migrations/tenant/` (per-tenant schema). Gebruik `tenants:migrate` voor tenant-migraties (niet `tenants:artisan migrate`).
- **Models:** Use `UsesTenantConnection` trait for tenant-scoped data
- **Middleware:** `NeedsTenant` enforces tenant context on protected routes

### Backend Structure

- Controllers: `backend/app/Http/Controllers/`
- Models: `backend/app/Models/` (use ULIDs as public identifiers via `getRouteKeyName()`)
- Policies: `backend/app/Policies/`
- Tasks: `backend/app/Tasks/` (tenant switching logic)
- Routes: `backend/routes/api.php`

### Frontend Structure

- Pages: `frontend/src/pages/`
- Components: `frontend/src/components/` (layout/, features/, ui/)
- Hooks: `frontend/src/hooks/` (data fetching with Axios)
- Types: `frontend/src/types/`
- Router: `frontend/src/router.tsx`

### Key Patterns

- **Authentication:** Laravel Sanctum (token-based)
- **Authorization:** Laravel Policies (auto-discovered: `App\Models\X` → `App\Policies\XPolicy`; only `UserPolicy` is explicitly mapped). Convention: write/delete allowed for `owner/admin/management/recruiter`, denied for `viewer`. Policies exist for Account, Contact, Assignment, User. NB: not all controllers gate every action yet — e.g. `AssignmentController::destroy` is gated (via `AssignmentPolicy`), but `store`/`update` there and several other controllers still lack checks.
- **Assignment status:** the active values are the `assignment_status` dropdown (recruitment-funnel stages: `1e_contact_moment` … `aangenomen`/`afgewezen`/`voltooid`), NOT the old lifecycle values (`active`/`hired`/`completed`/…). `App\Support\AssignmentStatus` is the single source of truth: `CLOSED`+`isClosed()` ("afgerond?"), `DEFAULT` (= `1e_contact_moment`, used as the store default), `LEGACY_MAP`+`normalize()` (legacy lifecycle → funnel; `store`/`update` self-heal incoming status before validation, and migration `2026_06_22_000001` backfilled existing rows). Don't hardcode status lists; the `statusOptions` in `frontend/.../assignments/types.ts` is fallback-only. Used by AccountController/LinkedInImportController/DashboardController/seeder.
- **Form handling:** React Hook Form + Zod validation
- **Data fetching:** Custom hooks (`useAccounts`, `useContacts`, etc.) wrapping Axios
- **IDs:** ULIDs for all public-facing identifiers (prevents enumeration)
- **Soft deletes:** Enabled on sensitive models (Account, Candidate/Contact)
- **Sector/classification fields:** `category`, `secondary_category`, `tertiary_category`, `merken`, `labels` exist on both Account and Contact, validated via `App\Support\ClassificationRules` against `sector_*` dropdown types. Frontend uses the shared `ClassificationFields` component (`components/features/`).
- **Conditional Contact fields:** `availability_date` is only rendered (and only sent to the API) when `network_roles` includes the interim role. In edit mode, unchecking interim clears the value on save.
- **Excel export:** `ExportController` (3 routes `GET /api/v1/exports/{contacts,accounts,assignments}`) streamt per entiteit een los `.xlsx` via **OpenSpout** (`OpenSpout\Writer\XLSX\Writer`). OpenSpout's XLSX-writer heeft een echt seekbaar bestand nodig (zip-container), dus schrijf naar een tempfile en `response()->download(...)->deleteFileAfterSend(true)` — niet naar `php://output`. Array-velden join met `; `, datums `Y-m-d`, `*_cents`→euro's. Gegate op `owner/admin/management` in de controller. Frontend: `api/exports.ts` (`downloadExport(kind)` blob-download) + sectie "Data exporteren" in de Overzicht-tab van `settings.tsx` (zelfde rol-gate, UI verborgen voor anderen).
- **Assignment deep-link:** vanaf de klant-detailpagina (`account-detail.tsx`) navigeert "Ga naar opdracht" naar `/assignments` met `location.state.assignmentUid`. `assignments.tsx` matcht op `uid`, klapt de kaart open én scrollt ernaartoe (elke kaart in een `Box` met `id="assignment-card-{id}"` + `scrollMarginTop`; scroll via kort-vertraagd effect). State wordt daarna gewist.
- **Contactpersoon-detail modal:** klik op een contactpersoon in `AccountContactsCard` opent `ContactPersonDetailDialog` (read-only, alle Contact-velden in secties, lege velden weggelaten). `AccountController@show` eager-loadt `contacts.contact.workExperiences` zodat het volledige contact (incl. werkervaring) al in de account-payload zit — geen extra request. Frontend-type `AccountContact.contact` = het volledige `Contact`-type (de backend stuurde dat al). Demo-seeder linkt 1–3 contacten per klant via `seedAccountContacts` (anders zijn er lokaal géén contactpersonen om te tonen).

### Known gotchas

- **Dropdown-value drift in `network.tsx:108`:** the static `networkRoleOptions` fallback list uses old values `"interim"` and `"candidate"`, but `DropdownOptionSeeder.php` seeds the DB with `"interimmer"` and `"kandidaat"`. Active code paths (filters, conditional rendering) match on the DB-seeded values. The fallback is only reached on a tenant with empty dropdowns. When writing any `network_roles?.includes(...)` check, always use the DB value — verify with `php artisan tinker` → `DropdownOption::where('type','network_role')->pluck('value')`.
- **Soft-delete leaves R2 files orphaned:** Assignment/Account soft-delete does not clean up `role_profile_path` / `notes_image_path` / contact CV documents in R2. Either acknowledge or fix per case.
- **Dropdown drift is a recurring prod-bug class (2026-06-08/09):** the frontend has hardcoded option lists that MUST stay fallbacks only — the DB dropdown set is the source of truth, and the backend validates against it (`DropdownOption::validationRule($type)`). When a status/classification UI sends a value, it has to come from the DB options, not a hardcoded list. Fixed cases: `AssignmentCard` status menu (sent English `hired` vs DB `aangenomen`), `AssignmentCandidatesDataGrid` candidate status (now reads `candidate_assignment_status` from DB), `getStatusColor` (covers NL assignment + EN candidate values). When adding any select that validates server-side, drive it from `useDropdownOptions(type)` and pass `{value,label,color}` down — never map a hardcoded list into a request.
- **Legacy classification stored as labels:** legacy-imported accounts/contacts stored classification as the display *label* ("Overig", "Non-food") while the canonical options use slug *values* ("andere", "non_food"). `ClassificationRules::normalize()` (called in Account/Contact store+update + `StoreContactRequest`) self-heals label→value before validation; renamed values need an entry in `LEGACY_ALIASES`. Run `classification:normalize` once per environment to clean stored data in bulk. NB `category "Overig"` was renamed to `andere` in the canonical set — not just a label diff.
- **Validation falls back to `max:255` for unseeded dropdown types:** `DropdownOption::validationRule($type)` returns `max:255` (accept anything) when a type has zero options. So an unseeded type silently accepts any value until it's seeded — then it starts enforcing `in:...`. Seed new types with values that MATCH existing stored data or you get surprise 422s (see `candidate_assignment_status`).

### Core Entities

- **Tenant** (landlord DB): Organization with own database
- **User** (tenant): Roles: `owner`, `admin`, `management`, `recruiter`, `viewer` (helpers `isAdmin/isManagement/isRecruiter/isViewer` on the model; new tenants register their first user as `owner`). The first four are "writers"; `viewer` is read-only.
- **Account**: Client companies. Holding-relatie via free-text `parent_company` + bijhorende `parent_logo_url` naast de eigen `logo_url`. `AccountHeader` rendert beide logo's naast elkaar met een grijze chevron `›` ertussen (holding 48px + opacity 0.85, brand 60px). Lijstkaart toont alleen de brand-logo. Geen FK-relatie tussen accounts — bewuste vrije-tekst keuze.
- **Contact**: Candidates/people (formerly called Candidate). Heeft `work_experiences` (hasMany `ContactWorkExperience`); `current_company` + `company_role` worden gesynct vanuit de meest recente werkervaring via `syncCurrentRoleFromWorkExperiences()`. Demo-seeder (`SeedAccountsAndAssignments::buildWorkExperiences`) geeft elk contact 2–4 werkervaringen uit een top-20 NL-bedrijven lijst — gedeeld met de Account-seeder zodat de "Heeft gewerkt bij"-filter op `/network` overlap heeft.
- **Assignment**: Links accounts to contacts. `salary_min/salary_max/total_fee/advance_fee` zijn **hele euro's** (geen `_cents`), in tegenstelling tot Account `revenue_cents` en Contact `annual_salary_cents/hourly_rate_cents` (centen). Belangrijk bij export/formatting.
- **AccountActivity**: Activity log for accounts
