# AVE CRM - Comprehensive Project Analysis

## **1. Project Overview**

AVE CRM is a multi-tenant SaaS (Software as a Service) Customer Relationship Management system specifically designed for the recruitment industry. The application features a sophisticated database-per-tenant architecture to ensure complete data isolation between different organizations, making it GDPR-compliant and suitable for handling sensitive candidate and client information.

---

## **2. Architecture & Tech Stack**

### **Backend Stack**
- **Framework:** Laravel 12.0 (latest version)
- **Language:** PHP 8.3 (FPM)
- **API Architecture:** RESTful API (versioned under `/api/v1`)
- **Authentication:** Laravel Sanctum 4.2 (token-based API authentication)
- **Multi-tenancy Package:** Spatie Laravel Multitenancy 4.0
  - Database-per-tenant strategy
  - Domain-based tenant resolution (`DomainTenantFinder`)
  - Tenant-aware caching and queue jobs
- **Database:** PostgreSQL 16
  - Separate landlord and tenant database connections
  - Migrations separated into `landlord/` and `tenant/` directories
- **Cache/Session Store:** Redis 7
- **Web Server:** Nginx 1.27 (Alpine-based)
- **Testing Framework:** PHPUnit 11.5.3
- **Code Quality:** Laravel Pint 1.24 (code formatter)

### **Frontend Stack**
- **Framework:** React 19.1.1
- **Language:** TypeScript 5.8.3
- **Build Tool:** Vite 7.1.2
- **UI Library:** Material-UI (MUI) 7.3.2
  - MUI Data Grid 8.11.1 (for tabular data)
  - MUI Icons Material 7.3.2
- **Routing:** React Router DOM 7.8.2
- **HTTP Client:** Axios 1.12.2
- **Form Management:** React Hook Form 7.64.0 + Zod 4.1.12 (validation)
- **Document Processing:** Mammoth 1.11.0 (Word document parsing)
- **Linting:** ESLint 9.33.0 + TypeScript ESLint 8.39.1
- **Styling:** Emotion (via MUI)

### **Infrastructure & DevOps**
- **Containerization:** Docker Compose
- **Services:**
  - `backend-php`: PHP 8.3-FPM Alpine container
  - `nginx`: Nginx 1.27 Alpine container
  - `db`: PostgreSQL 16 container
  - `redis`: Redis 7 container
  - `adminer`: Adminer 4 (database administration tool on port 8081)
- **Ports:**
  - `8080`: Nginx (main application)
  - `8081`: Adminer (database admin)
  - `5432`: PostgreSQL
  - `6379`: Redis

---

## **3. Project Structure**

```
ovk/
├── backend/              # Laravel application
│   ├── app/
│   │   ├── Http/Controllers/
│   │   ├── Models/
│   │   ├── Policies/
│   │   ├── Providers/
│   │   ├── Support/
│   │   └── Tasks/        # Tenant switching tasks
│   ├── config/
│   ├── database/
│   │   ├── migrations/landlord/  # Tenant management
│   │   └── migrations/tenant/    # Per-tenant schema
│   ├── routes/
│   ├── resources/
│   └── tests/
├── frontend/             # React SPA
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/
│   │   ├── types/
│   │   └── router.tsx
│   └── public/
├── docker/
│   ├── php/Dockerfile
│   ├── nginx/default.conf
│   └── node/Dockerfile
└── portfolio/            # Documentation/research
```

---

## **4. Core Domain Models**

### **Tenant (Landlord Database)**
- `uid` (ULID), `name`, `slug`, `domain`, `database`
- Stored in landlord database
- Each tenant has its own database

### **User (Tenant-scoped)**
- `uid` (ULID), `name`, `email`, `password`, `role`
- Roles: `admin`, `recruiter`, `viewer`
- Tenant-aware authentication
- Methods: `isAdmin()`, `isRecruiter()`, `isViewer()`

### **Candidate**
- `uid` (ULID), `first_name`, `last_name`, `gender`, `location`
- `current_role`, `current_company`, `current_salary_cents`
- `education`, `email`, `phone`, `linkedin_url`, `cv_url`, `notes`
- Soft deletes enabled

### **Account**
- `uid` (ULID), `name`, `logo_url`, `location`, `website`
- `revenue_cents`, `notes`
- Relationships: `contacts()`, `assignments()`, `activities()`
- Soft deletes enabled

### **AccountContact**
- Related to Account

### **Assignment**
- Related to Account
- Many-to-many relationship with Candidate (`assignment_candidate` pivot table)

### **AccountActivity**
- Activity log for accounts
- Tracks interactions and events

---

## **5. API Endpoints**

### **Authentication:**
- `POST /api/v1/auth/register-tenant` (throttled: 20 requests/minute)
- `POST /api/v1/auth/login` (tenant-aware)
- `GET /api/v1/auth/me` (protected)
- `POST /api/v1/auth/logout` (protected)

### **Users:**
- `GET /api/v1/users` (protected)
- `GET /api/v1/users/{user}` (protected)
- `POST /api/v1/users` (requires `manage-users` permission)
- `PUT/PATCH /api/v1/users/{user}` (requires `manage-users` permission)
- `DELETE /api/v1/users/{user}` (requires `manage-users` permission)

### **Candidates:**
- `GET /api/v1/candidates` (protected)
- `POST /api/v1/candidates` (protected)
- `GET /api/v1/candidates/{candidate}` (protected)
- `PUT /api/v1/candidates/{candidate}` (protected)
- `DELETE /api/v1/candidates/{candidate}` (protected)
- `POST /api/v1/candidates/bulk-import` (protected)
- `GET /api/v1/candidates/cv/{path}` (protected, file serving)

### **Accounts:**
- `GET /api/v1/accounts` (protected)
- `POST /api/v1/accounts` (protected)
- `GET /api/v1/accounts/{account}` (protected)
- `PUT /api/v1/accounts/{account}` (protected)
- `DELETE /api/v1/accounts/{account}` (protected)

### **Account Activities:**
- `GET /api/v1/accounts/{account}/activities` (protected)
- `POST /api/v1/accounts/{account}/activities` (protected)
- `DELETE /api/v1/activities/{accountActivity}` (protected)

### **Health Check:**
- `GET /api/health`

---

## **6. Frontend Pages & Routes**

### **Guest Routes:**
- `/` - Login page
- `/register` - Tenant registration page

### **Protected Routes (DefaultLayout):**
- `/dashboard` - Dashboard
- `/candidates` - Candidate management
- `/accounts` - Account list
- `/accounts/:uid` - Account detail
- `/assignments` - Assignment management
- `/agenda` - Agenda/calendar
- `/settings` - Settings page

### **404:**
- `*` - NotFound page

---

## **7. Multi-Tenancy Implementation**

### **Tenant Resolution:**
- Domain-based tenant finding (`DomainTenantFinder`)
- Tenant identified from request domain
- Middleware: `NeedsTenant` ensures tenant context

### **Database Strategy:**
- Separate database per tenant
- Landlord database stores tenant metadata
- Dynamic connection switching via `SwitchTenantDatabaseTask`

### **Cache Isolation:**
- Custom `SwitchTenantCacheTask`
- Redis keys prefixed per tenant
- Prevents cache bleeding between tenants

### **Queue Jobs:**
- Tenant-aware by default (`queues_are_tenant_aware_by_default: true`)
- Jobs automatically scoped to current tenant

### **Security Features:**
- ULIDs for public identifiers (prevents ID enumeration)
- Physical database separation
- Tenant context enforced at middleware level

---

## **8. Development Workflow**

### **Backend (Docker):**
```bash
docker-compose up -d                    # Start all services
docker-compose exec backend-php composer install
docker-compose exec backend-php php artisan test
docker-compose logs -f backend-php      # View logs
```

### **Frontend (Local):**
```bash
cd frontend
npm install
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Linting
```

### **Access Points:**
- Application: `http://localhost:8080`
- Adminer: `http://localhost:8081`

---

## **9. Security Features**

- **Authentication:** Laravel Sanctum token-based authentication
- **Authorization:** Laravel Policies (e.g., `manage-users` permission)
- **Rate Limiting:** Throttling on authentication endpoints
- **Data Isolation:** Database-per-tenant architecture
- **ID Obfuscation:** ULIDs instead of auto-increment IDs
- **Soft Deletes:** Enabled on sensitive models
- **CSRF Protection:** Via Sanctum middleware

---

## **10. Testing Configuration**

- **Framework:** PHPUnit 11.5.3
- **Test Environment:** SQLite in-memory database
- **Test Suites:** Unit & Feature tests
- **Coverage:** Source includes `app/` directory

---

## **11. Code Quality & Standards**

### **Backend:**
- Laravel Pint for code formatting
- PSR-4 autoloading
- Type hints and return types

### **Frontend:**
- TypeScript strict mode
- ESLint with React hooks and TypeScript rules
- React Hook Form + Zod validation

---

## **12. Notable Features**

1. **Bulk Import:** Candidate bulk import endpoint
2. **CV Management:** File storage and serving for candidate CVs
3. **Activity Logging:** Account activity tracking
4. **Role-Based Access:** Admin, Recruiter, Viewer roles
5. **Document Processing:** Mammoth for Word document parsing
6. **Data Grid:** MUI Data Grid for tabular data

---

## **13. Configuration Highlights**

### **Multi-tenancy Config:**
- **Tenant Finder:** Domain-based (`DomainTenantFinder`)
- **Cache Task:** Custom `SwitchTenantCacheTask`
- **Database Task:** `SwitchTenantDatabaseTask`
- **Tenant Model:** `App\Models\Tenant`
- **Connection Names:** `landlord` and `tenant`

### **Database Config:**
- **Landlord Connection:** PostgreSQL for tenant metadata
- **Tenant Connection:** Dynamic PostgreSQL per tenant
- **Default:** SQLite (for testing)

### **Sanctum Config:**
- **Stateful Domains:** localhost, 127.0.0.1, ::1
- **Guard:** web
- **Expiration:** null (no expiration)

---

## **14. Dependencies Summary**

### **Backend PHP (composer.json):**
- `laravel/framework`: ^12.0
- `laravel/sanctum`: ^4.2
- `spatie/laravel-multitenancy`: ^4.0
- `phpunit/phpunit`: ^11.5.3
- `fakerphp/faker`: ^1.23

### **Frontend (package.json):**
- `react`: ^19.1.1
- `@mui/material`: ^7.3.2
- `react-router-dom`: ^7.8.2
- `axios`: ^1.12.2
- `react-hook-form`: ^7.64.0
- `zod`: ^4.1.12
- `mammoth`: ^1.11.0

---

## **15. Project Purpose**

This CRM system is designed for recruitment agencies to:
- Manage candidates with CVs and detailed profiles
- Track client accounts and contacts
- Manage assignments linking candidates to accounts
- Maintain activity logs
- Support multiple organizations with complete data isolation

The multi-tenant architecture makes it suitable for SaaS deployment where each recruitment agency operates as an isolated tenant with its own database and domain.

---

## **16. Docker Configuration**

### **PHP Dockerfile:**
- Base: `php:8.3-fpm-alpine`
- Extensions: intl, mbstring, pdo, pdo_pgsql, zip, bcmath, opcache, redis
- Composer 2 included

### **Nginx Configuration:**
- Root: `/var/www/html/public`
- PHP-FPM: `backend-php:9000`
- Max upload: 20MB
- Storage alias configured

### **Node Dockerfile:**
- Base: `node:22-alpine`
- For frontend builds (currently commented out)

---

## **17. Frontend Architecture**

### **State Management:**
- Custom hooks for data fetching (`useAccounts`, `useCandidates`, `useUsers`)
- Axios interceptors for authentication tokens
- Local storage for token persistence

### **Component Structure:**
- `components/layout/` - Layout components (DefaultLayout, GuestLayout)
- `components/features/` - Feature-specific components
- `components/ui/` - Reusable UI components
- `pages/` - Page components

### **Theme:**
- Primary color: `#800400` (dark red)
- Font: Roboto
- Material-UI theme customization

---

## **18. Backend Architecture**

### **Controllers:**
- RESTful API controllers
- Resource controllers for CRUD operations
- Custom actions (bulk import, file serving)

### **Models:**
- Eloquent ORM
- ULID generation in model boot methods
- Soft deletes on sensitive models
- Tenant-aware via `UsesTenantConnection` trait

### **Policies:**
- Authorization policies (e.g., user management)
- Gate-based permissions

### **Tasks:**
- Custom tenant switching tasks
- Cache isolation task

---

## **19. Database Schema**

### **Landlord Migrations:**
- `tenants` table

### **Tenant Migrations:**
- `users` table
- `cache` table
- `jobs` table
- `accounts` table
- `account_contacts` table
- `candidates` table
- `assignments` table
- `assignment_candidate` pivot table
- `personal_access_tokens` table (Sanctum)
- `account_activities` table

---

## **20. Key Design Decisions**

1. **ULIDs over Auto-increment IDs:** Prevents ID enumeration attacks
2. **Database-per-Tenant:** Maximum data isolation for GDPR compliance
3. **Domain-based Tenant Resolution:** Clean URL structure per tenant
4. **Separate Frontend/Backend:** Modern SPA architecture
5. **Docker for Backend:** Consistent development environment
6. **Local Frontend Development:** Faster iteration with Vite HMR
7. **Material-UI:** Consistent, professional UI components
8. **TypeScript:** Type safety across frontend codebase

---

## **21. Development Notes**

- Backend uses Laravel 12 (latest version)
- Frontend uses React 19 (latest version)
- Strict TypeScript configuration
- ESLint configured for React and TypeScript
- PHP 8.3 with modern features
- PostgreSQL 16 for production-grade database

---

## **22. Future Considerations**

Based on the codebase structure, potential areas for expansion:
- Email notifications
- File upload handling (CVs)
- Advanced search/filtering
- Reporting and analytics
- Calendar/agenda integration
- Export functionality
- API documentation (Swagger/OpenAPI)

---

*This analysis was generated by scanning the entire codebase, configuration files, and project structure.*

