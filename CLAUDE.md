# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AVE CRM is a multi-tenant SaaS CRM system for the recruitment industry. It uses a database-per-tenant architecture with Spatie Laravel Multitenancy for complete data isolation.

- **Backend:** Laravel 12 + PHP 8.3 (RESTful API under `/api/v1`)
- **Frontend:** React 19 + TypeScript + Material-UI (MUI)
- **Database:** PostgreSQL 16 (separate databases per tenant)
- **Infrastructure:** Docker Compose (backend services), local Node.js (frontend)

## Build & Run Commands

### Backend (Docker)

```bash
docker-compose up -d                                    # Start all services
docker-compose exec backend-php composer install        # Install PHP dependencies
docker-compose exec backend-php php artisan test        # Run tests
docker-compose exec backend-php php artisan migrate     # Run migrations
docker-compose logs -f backend-php                      # View logs
```

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

## Architecture

### Multi-Tenancy

- **Tenant resolution:** Domain-based (`DomainTenantFinder`)
- **Database strategy:** Separate PostgreSQL database per tenant
- **Migrations:** Split into `database/migrations/landlord/` (tenant metadata) and `database/migrations/tenant/` (per-tenant schema)
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
- **Authorization:** Laravel Policies with gates (e.g., `can:manage-users`)
- **Form handling:** React Hook Form + Zod validation
- **Data fetching:** Custom hooks (`useAccounts`, `useContacts`, etc.) wrapping Axios
- **IDs:** ULIDs for all public-facing identifiers (prevents enumeration)
- **Soft deletes:** Enabled on sensitive models (Account, Candidate/Contact)

### Core Entities

- **Tenant** (landlord DB): Organization with own database
- **User** (tenant): Roles: `admin`, `recruiter`, `viewer`
- **Account**: Client companies
- **Contact**: Candidates/people (formerly called Candidate)
- **Assignment**: Links accounts to contacts
- **AccountActivity**: Activity log for accounts
