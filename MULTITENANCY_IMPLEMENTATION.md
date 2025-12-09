# Multi-Tenancy Implementation Guide

## Table of Contents

1. [Introduction to Multi-Tenancy](#introduction-to-multi-tenancy)
2. [Why Multi-Tenancy for AVE CRM](#why-multi-tenancy-for-ave-crm)
3. [Architecture Choice: Database-Per-Tenant](#architecture-choice-database-per-tenant)
4. [Database Strategy: Alternative Approaches](#database-strategy-alternative-approaches)
5. [Tenant Resolution: Domain-Based Finding](#tenant-resolution-domain-based-finding)
6. [Tenant Resolution: Alternative Approaches](#tenant-resolution-alternative-approaches)
7. [Database Connection Switching](#database-connection-switching)
8. [Cache Isolation](#cache-isolation)
9. [Cache Isolation: Alternative Approaches](#cache-isolation-alternative-approaches)
10. [Queue Job Tenant Awareness](#queue-job-tenant-awareness)
11. [Queue Job Tenant Awareness: Alternative Approaches](#queue-job-tenant-awareness-alternative-approaches)
12. [Model Traits and Tenant Awareness](#model-traits-and-tenant-awareness)
13. [Middleware: NeedsTenant](#middleware-needstenant)
14. [Tenant Registration Process](#tenant-registration-process)
15. [Authentication Flow](#authentication-flow)
16. [Security Considerations](#security-considerations)
17. [Migration Strategy](#migration-strategy)
18. [ULID Strategy for Security](#ulid-strategy-for-security)
19. [ID Strategy: Alternative Approaches](#id-strategy-alternative-approaches)

---

## Introduction to Multi-Tenancy

Multi-tenancy is an architectural pattern where a single instance of an application serves multiple customers (tenants). Each tenant's data is isolated and remains invisible to other tenants, even though they share the same application infrastructure.

### Key Concepts:

- **Tenant**: A customer organization (e.g., a recruitment agency) that uses the CRM system
- **Landlord Database**: The central database that stores tenant metadata (which tenants exist, their domains, database names)
- **Tenant Database**: Each tenant has its own separate database containing all their business data
- **Tenant Context**: The runtime state that determines which tenant's data should be accessed

### Multi-Tenancy Strategies:

1. **Single Database with Discriminator Column**: All tenants share one database, separated by a `tenant_id` column

   - ❌ **Rejected**: Too error-prone. One forgotten `WHERE` clause and data leaks between tenants.

2. **Separate Schemas**: One database, but separate PostgreSQL schemas per tenant

   - ⚠️ **Considered**: Good isolation, but complex migrations with Eloquent ORM.

3. **Database Per Tenant**: Each tenant gets its own physical database
   - ✅ **Chosen**: Maximum isolation, easier GDPR compliance, better security.

---

## Why Multi-Tenancy for AVE CRM

AVE CRM is designed for the recruitment industry, which handles highly sensitive data:

- **Candidate personal information** (CVs, contact details, salary information)
- **Client account data** (company information, revenue, contacts)
- **Assignment data** (matches between candidates and clients)

### Business Requirements:

1. **Data Isolation**: Recruitment agencies are competitors. They must never see each other's data.
2. **GDPR Compliance**: The "Right to be Forgotten" requires easy deletion of all tenant data.
3. **Security**: If one tenant is compromised, others remain unaffected.
4. **Scalability**: Each tenant can scale independently.
5. **Customization**: Future feature: tenants may need custom configurations.

### Legal & Compliance:

- **GDPR Article 17**: Right to erasure - must be able to delete all data for a tenant
- **Data Protection**: Physical database separation provides stronger legal protection
- **Audit Trails**: Easier to audit and demonstrate data isolation

---

## Architecture Choice: Database-Per-Tenant

### Implementation Details

AVE CRM uses the **Spatie Laravel Multitenancy** package (`spatie/laravel-multitenancy` v4.0) to implement database-per-tenant architecture.

### How It Works:

1. **Landlord Database** (`landlord` connection):

   - Stores the `tenants` table
   - Contains metadata: `id`, `uid`, `name`, `slug`, `domain`, `database`
   - Example: `tenant_acme_recruitment` → database name

2. **Tenant Databases** (`tenant` connection):
   - Each tenant has its own PostgreSQL database
   - Contains all business data: `users`, `candidates`, `accounts`, `assignments`, etc.
   - Database name pattern: `tenant_{slug}` (e.g., `tenant_acme_recruitment`)

### Configuration (`config/multitenancy.php`):

```php
'landlord_database_connection_name' => 'landlord',
'tenant_database_connection_name' => 'tenant',
```

### Why This Matters:

- **Physical Isolation**: Data is physically separated at the database level
- **No Query Mistakes**: Impossible to accidentally query another tenant's data
- **Easy Deletion**: Drop the database to delete all tenant data (GDPR compliance)
- **Independent Backups**: Each tenant can have its own backup strategy
- **Performance**: No need for `WHERE tenant_id = X` in every query

---

## Database Strategy: Alternative Approaches

### Comparison of Multi-Tenant Database Strategies

AVE CRM uses **database-per-tenant**, but there are three main approaches to multi-tenant data isolation:

### 1. Database-Per-Tenant ✅ **CHOSEN**

**How It Works:**

- Each tenant has its own PostgreSQL database
- Landlord database stores tenant metadata
- Application switches database connection per request

**Pros:**

- ✅ **Maximum Isolation**: Physical separation at database level
- ✅ **Security**: Impossible to accidentally query another tenant's data
- ✅ **GDPR Compliance**: Easy data deletion (`DROP DATABASE tenant_x`)
- ✅ **Performance**: No `WHERE tenant_id = X` in every query
- ✅ **Independent Scaling**: Each tenant can scale independently
- ✅ **Backup Flexibility**: Per-tenant backup strategies
- ✅ **Schema Customization**: Each tenant can have custom schema (future)
- ✅ **Migration Control**: Migrate tenants independently
- ✅ **Disaster Recovery**: If one tenant's database fails, others unaffected

**Cons:**

- ❌ **Database Overhead**: Each database has overhead (connections, metadata)
- ❌ **Connection Limits**: PostgreSQL connection limits per database
- ❌ **Migration Complexity**: Must run migrations for each tenant
- ❌ **Resource Usage**: More memory and disk space per tenant
- ❌ **Cross-Tenant Queries**: Difficult to query across tenants (if needed)

**Resource Usage Example:**

- 100 tenants = 100 databases
- Each database: ~50MB overhead (metadata, indexes)
- Total overhead: ~5GB just for database structures
- Connection pool: 100 connections minimum (1 per tenant)

**Best For:**

- Enterprise SaaS with high data isolation requirements
- Applications handling sensitive data (healthcare, finance, recruitment)
- GDPR-compliant applications
- **AVE CRM Use Case**: ✅ Perfect - recruitment data is highly sensitive

---

### 2. Schema-Per-Tenant

**How It Works:**

- One PostgreSQL database, separate schemas per tenant
- Tenant A: `schema_acme`, Tenant B: `schema_beta`
- Application switches schema context: `SET search_path TO schema_acme`

**Implementation Example:**

```php
class SwitchTenantSchemaTask implements SwitchTenantTask
{
    public function makeCurrent(IsTenant $tenant): void
    {
        DB::statement("SET search_path TO schema_{$tenant->slug}");
    }
}
```

**Pros:**

- ✅ **Good Isolation**: Logical separation at schema level
- ✅ **Lower Overhead**: One database, multiple schemas
- ✅ **Easier Migrations**: Can migrate all schemas in one transaction
- ✅ **Cross-Tenant Queries**: Easier to query across tenants (if needed)
- ✅ **Resource Efficiency**: Less memory per tenant than separate databases
- ✅ **Connection Pooling**: Can share connection pool across tenants

**Cons:**

- ❌ **Less Isolation**: Still same database instance (shared resources)
- ❌ **Schema Management**: Must create/drop schemas programmatically
- ❌ **Laravel Complexity**: Eloquent doesn't natively support schema switching
- ❌ **Backup Complexity**: Harder to backup individual tenant data
- ❌ **GDPR Complexity**: Must drop schema, not just database
- ❌ **Security Risk**: Schema-level permissions more complex
- ❌ **Cross-Schema Leaks**: Risk of querying wrong schema if context not set

**Resource Usage Example:**

- 100 tenants = 1 database, 100 schemas
- Database overhead: ~500MB (single database)
- Schema overhead: ~1MB per schema
- Total overhead: ~600MB (vs 5GB for database-per-tenant)
- Connection pool: 10-20 connections shared

**Best For:**

- Applications with many small tenants
- Cost-sensitive deployments
- Applications where cross-tenant analytics are needed
- **AVE CRM Use Case**: ⚠️ Could work, but database-per-tenant provides better security

---

### 3. Shared Database with Discriminator Column

**How It Works:**

- One database, one schema, all tenants share tables
- Every table has `tenant_id` column
- Every query must include `WHERE tenant_id = X`

**Implementation Example:**

```php
class Candidate extends Model
{
    protected static function booted(): void
    {
        static::addGlobalScope('tenant', function ($query) {
            $query->where('tenant_id', Tenant::current()->id);
        });
    }
}
```

**Pros:**

- ✅ **Lowest Overhead**: One database, minimal resource usage
- ✅ **Simplest Setup**: No database/schema creation needed
- ✅ **Easy Cross-Tenant Queries**: Can query across tenants easily
- ✅ **Unified Backups**: One backup covers all tenants
- ✅ **Simple Migrations**: One migration affects all tenants
- ✅ **Cost Effective**: Cheapest option for many tenants

**Cons:**

- ❌ **High Risk**: One forgotten `WHERE` clause = data leak
- ❌ **Performance**: Every query must filter by `tenant_id`
- ❌ **Index Overhead**: Need composite indexes `(tenant_id, other_column)`
- ❌ **GDPR Complexity**: Must delete all rows with `tenant_id = X`
- ❌ **Security Risk**: Application bugs can leak data
- ❌ **No Physical Isolation**: All data in same tables
- ❌ **Scalability Issues**: Large tenants affect performance for all
- ❌ **Backup Complexity**: Cannot backup individual tenant easily

**Resource Usage Example:**

- 100 tenants = 1 database, shared tables
- Database overhead: ~500MB
- Table overhead: Minimal (just `tenant_id` columns)
- Total overhead: ~500MB
- Connection pool: 5-10 connections shared

**Query Performance Impact:**

```sql
-- Every query needs tenant_id filter
SELECT * FROM candidates WHERE tenant_id = 1 AND first_name = 'John';
-- vs Database-per-tenant (no filter needed)
SELECT * FROM candidates WHERE first_name = 'John';
```

**Best For:**

- Low-security applications
- Applications with thousands of very small tenants
- Prototypes and MVPs
- **AVE CRM Use Case**: ❌ Rejected - too risky for sensitive recruitment data

---

### Decision Matrix for AVE CRM

| Strategy                   | Security   | Performance | GDPR Compliance | Scalability | Cost       | **Score** |
| -------------------------- | ---------- | ----------- | --------------- | ----------- | ---------- | --------- |
| **Database-Per-Tenant** ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐      | ⭐⭐⭐⭐⭐  | ⭐⭐⭐     | **20/25** |
| Schema-Per-Tenant          | ⭐⭐⭐⭐   | ⭐⭐⭐⭐    | ⭐⭐⭐          | ⭐⭐⭐⭐    | ⭐⭐⭐⭐   | 18/25     |
| Shared Database            | ⭐⭐       | ⭐⭐⭐      | ⭐⭐            | ⭐⭐⭐      | ⭐⭐⭐⭐⭐ | 12/25     |

**Why Database-Per-Tenant Was Chosen:**

1. **Security First**: Recruitment data includes sensitive personal information (CVs, salaries, contact details). Physical isolation provides strongest protection.

2. **GDPR Compliance**: Article 17 (Right to Erasure) requires easy deletion. `DROP DATABASE tenant_x` is simpler and more auditable than deleting rows across multiple tables.

3. **Competitor Isolation**: Recruitment agencies are competitors. They must never see each other's data, even accidentally. Database-per-tenant makes this architecturally impossible.

4. **Performance**: No need for `tenant_id` in every query, no composite indexes, simpler query plans.

5. **Scalability**: Large tenants don't affect others. Can move large tenants to dedicated servers.

6. **Audit Trail**: Easier to demonstrate data isolation to auditors and clients.

**When to Consider Alternatives:**

- **Schema-Per-Tenant**: If you have 1000+ tenants and cost is critical, but security is still important.
- **Shared Database**: Only for non-sensitive data, prototypes, or when tenant count is extremely high (10,000+) and tenants are very small.

---

## Tenant Resolution: Domain-Based Finding

### How Tenants Are Identified

The system uses **domain-based tenant resolution** to determine which tenant should handle a request.

### Implementation:

**Configuration** (`config/multitenancy.php`):

```php
'tenant_finder' => Spatie\Multitenancy\TenantFinder\DomainTenantFinder::class,
```

### How It Works:

1. **Request Arrives**: User visits `acme.ave-crm.com`
2. **Domain Extraction**: Middleware extracts the domain from the HTTP request
3. **Tenant Lookup**: System queries the `tenants` table in the landlord database:
   ```sql
   SELECT * FROM tenants WHERE domain = 'acme.ave-crm.com'
   ```
4. **Tenant Context Set**: If found, the tenant is made "current" and all subsequent operations use that tenant's database

### Domain Structure:

- **Production**: `{slug}.ave-crm.com` (e.g., `acme.ave-crm.com`)
- **Development**: `{slug}.localhost` (native support in modern browsers) or `{slug}.lvh.me` (legacy workaround)

### Tenant Model (`app/Models/Tenant.php`):

```php
class Tenant extends SpatieTenant
{
    protected $fillable = [
        'uid',      // ULID for public identification
        'name',     // Display name
        'slug',     // URL-friendly identifier
        'domain',   // Full domain (e.g., 'acme.ave-crm.com')
        'database', // Database name (e.g., 'tenant_acme_recruitment')
    ];
}
```

### Why Domain-Based Resolution:

- **Clean URLs**: Each tenant has its own subdomain
- **User-Friendly**: Users know they're on their organization's instance
- **SEO**: Each tenant can have its own domain for branding
- **SSL**: Easy to configure SSL certificates per domain
- **No URL Parameters**: No need for `?tenant=acme` in URLs

---

## Tenant Resolution: Alternative Approaches

### Comparison of Tenant Identification Methods

AVE CRM uses **domain-based tenant resolution**, but there are several alternative approaches. Each has trade-offs:

### 1. Domain-Based Resolution ✅ **CHOSEN**

**How It Works:**

- Tenant identified from HTTP `Host` header: `acme.ave-crm.com`
- Lookup: `SELECT * FROM tenants WHERE domain = 'acme.ave-crm.com'`

**Pros:**

- ✅ **Clean URLs**: No tenant identifier in path or query string
- ✅ **User Experience**: Users see their organization's domain
- ✅ **Branding**: Each tenant can use custom domain (`acme.com` → `crm.acme.com`)
- ✅ **SSL**: Easy wildcard SSL (`*.ave-crm.com`) or per-domain certificates
- ✅ **Security**: Domain-based isolation, harder to accidentally access wrong tenant
- ✅ **SEO**: Each tenant can have its own domain for search engine optimization
- ✅ **Cookie Isolation**: Browser cookies are automatically scoped to domain
- ✅ **CDN Friendly**: Easy to configure CDN rules per domain

**Cons:**

- ❌ **DNS Configuration**: Requires DNS setup for each tenant (or wildcard DNS)
- ⚠️ **Development DNS**: Requires `*.localhost` support (native in modern browsers) or `lvh.me`/`/etc/hosts` for older setups
- ❌ **SSL Management**: More complex SSL certificate management (wildcard or multiple certs)
- ❌ **Subdomain Limits**: Some DNS providers limit subdomains

**Best For:**

- SaaS applications with dedicated tenant branding
- Applications where tenants want their own domain
- Production environments with proper DNS management
- **AVE CRM Use Case**: ✅ Perfect fit - recruitment agencies want professional branding

---

### 2. Path-Based Resolution

**How It Works:**

- Tenant identified from URL path: `ave-crm.com/acme/candidates`
- Lookup: Extract `acme` from path, query `SELECT * FROM tenants WHERE slug = 'acme'`

**Implementation Example:**

```php
// Route: /{tenant}/candidates
Route::get('/{tenant}/candidates', [CandidateController::class, 'index']);

// Middleware extracts tenant from route parameter
$tenant = Tenant::where('slug', $request->route('tenant'))->first();
```

**Pros:**

- ✅ **Simple DNS**: Only need one domain (`ave-crm.com`)
- ✅ **Easy Development**: No DNS configuration needed locally
- ✅ **Single SSL**: One SSL certificate covers all tenants
- ✅ **URL Sharing**: Easy to share URLs (tenant identifier visible)
- ✅ **No DNS Propagation**: Instant tenant activation (no DNS wait)

**Cons:**

- ❌ **URL Pollution**: Tenant identifier in every URL (`/acme/candidates`)
- ❌ **Less Professional**: Doesn't look like dedicated instance
- ❌ **SEO Issues**: All tenants share same domain (less SEO value per tenant)
- ❌ **Cookie Scope**: Cookies shared across tenants (need careful naming)
- ❌ **Security Risk**: Easy to change tenant by modifying URL (`/acme` → `/competitor`)
- ❌ **Route Complexity**: All routes need `{tenant}` parameter

**Best For:**

- Internal tools where branding doesn't matter
- Applications with thousands of tenants (DNS management overhead)
- Development/testing environments
- **AVE CRM Use Case**: ❌ Not suitable - recruitment agencies need professional branding

---

### 3. Subdomain-Based Resolution (Similar to Domain-Based)

**How It Works:**

- Similar to domain-based, but always uses subdomain pattern
- `acme.ave-crm.com` (always `{slug}.{base-domain}`)
- No custom domains allowed

**Pros:**

- ✅ **Simpler**: No custom domain support needed
- ✅ **Wildcard DNS**: One DNS entry (`*.ave-crm.com`) covers all tenants
- ✅ **Wildcard SSL**: One SSL certificate (`*.ave-crm.com`) covers all tenants
- ✅ **Predictable**: Always same pattern

**Cons:**

- ❌ **Less Flexible**: Cannot support custom domains (`acme.com`)
- ❌ **Less Professional**: Always shows base domain

**Best For:**

- SaaS where all tenants use subdomain pattern
- **AVE CRM Use Case**: ⚠️ Could work, but domain-based is more flexible

---

### 4. Header-Based Resolution

**How It Works:**

- Tenant identified from HTTP header: `X-Tenant-ID: acme`
- Lookup: `SELECT * FROM tenants WHERE slug = $request->header('X-Tenant-ID')`

**Implementation Example:**

```php
class HeaderTenantFinder extends TenantFinder
{
    public function findForRequest(Request $request): ?Tenant
    {
        $tenantId = $request->header('X-Tenant-ID');
        return Tenant::where('slug', $tenantId)->first();
    }
}
```

**Pros:**

- ✅ **Flexible**: Can use any domain
- ✅ **API-Friendly**: Easy for API clients to specify tenant
- ✅ **No DNS**: No DNS configuration needed
- ✅ **Multi-Domain**: Same API can serve multiple domains

**Cons:**

- ❌ **Security Risk**: Header can be easily spoofed
- ❌ **Not User-Friendly**: Headers are invisible to end users
- ❌ **Browser Limitations**: Browsers don't easily set custom headers
- ❌ **CSRF Risk**: Requires careful CSRF protection
- ❌ **No Cookie Isolation**: Cookies shared across tenants

**Best For:**

- API-only applications
- Mobile apps with API backend
- Internal microservices
- **AVE CRM Use Case**: ❌ Not suitable - web application needs user-friendly URLs

---

### 5. Query Parameter Resolution

**How It Works:**

- Tenant identified from query string: `ave-crm.com/candidates?tenant=acme`
- Lookup: `SELECT * FROM tenants WHERE slug = $request->query('tenant')`

**Pros:**

- ✅ **Simple**: Easiest to implement
- ✅ **No DNS**: No DNS configuration
- ✅ **Flexible**: Can switch tenants easily

**Cons:**

- ❌ **URL Pollution**: Tenant ID in every URL
- ❌ **Security Risk**: Easy to change tenant by modifying query parameter
- ❌ **Bookmarking Issues**: URLs include tenant identifier
- ❌ **SEO Problems**: Search engines may index tenant-specific URLs
- ❌ **User Confusion**: Users might share URLs with wrong tenant ID

**Best For:**

- Prototypes and MVPs
- Internal tools
- **AVE CRM Use Case**: ❌ Not suitable - too unprofessional

---

### 6. Custom Domain with CNAME

**How It Works:**

- Tenant uses custom domain: `crm.acme.com` → CNAME → `ave-crm.com`
- Application reads `Host` header: `crm.acme.com`
- Lookup: `SELECT * FROM tenants WHERE domain = 'crm.acme.com'`

**Pros:**

- ✅ **Professional Branding**: Tenant uses their own domain
- ✅ **White-Label**: Appears as tenant's own product
- ✅ **SEO**: Tenant gets SEO benefits of their domain
- ✅ **Trust**: Users trust tenant's domain more

**Cons:**

- ❌ **Complex Setup**: Requires DNS CNAME configuration
- ❌ **SSL Complexity**: Need SSL certificate per custom domain (or use Let's Encrypt automation)
- ❌ **Support Overhead**: Must help tenants configure DNS
- ❌ **Propagation Delay**: DNS changes take time to propagate

**Best For:**

- Enterprise SaaS with white-label requirements
- Applications where branding is critical
- **AVE CRM Use Case**: ✅ Ideal for enterprise recruitment agencies

---

### Decision Matrix for AVE CRM

| Method              | Professional Branding | Security   | Ease of Setup | Scalability | **Score** |
| ------------------- | --------------------- | ---------- | ------------- | ----------- | --------- |
| **Domain-Based** ✅ | ⭐⭐⭐⭐⭐            | ⭐⭐⭐⭐⭐ | ⭐⭐⭐        | ⭐⭐⭐⭐    | **17/20** |
| Path-Based          | ⭐⭐                  | ⭐⭐       | ⭐⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐  | 12/20     |
| Subdomain-Based     | ⭐⭐⭐⭐              | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐      | ⭐⭐⭐⭐    | 16/20     |
| Header-Based        | ⭐                    | ⭐⭐       | ⭐⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐  | 11/20     |
| Query Parameter     | ⭐                    | ⭐         | ⭐⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐  | 9/20      |
| Custom Domain       | ⭐⭐⭐⭐⭐            | ⭐⭐⭐⭐⭐ | ⭐⭐          | ⭐⭐⭐      | 15/20     |

**Why Domain-Based Was Chosen:**

1. **Professional Branding**: Recruitment agencies need professional appearance
2. **Security**: Domain-based isolation is harder to bypass than path/query parameters
3. **User Trust**: Users trust `acme.ave-crm.com` more than `ave-crm.com/acme`
4. **Future Flexibility**: Can add custom domain support later without changing architecture
5. **Cookie Isolation**: Browser automatically scopes cookies to domain
6. **SEO Benefits**: Each tenant can have its own domain authority

---

## Database Connection Switching

### The SwitchTenantDatabaseTask

When a tenant is identified, the system must switch the database connection to that tenant's database.

### Implementation:

**Configuration** (`config/multitenancy.php`):

```php
'switch_tenant_tasks' => [
    \Spatie\Multitenancy\Tasks\SwitchTenantDatabaseTask::class,
    // ... other tasks
],
```

### How It Works:

1. **Task Execution**: When `$tenant->makeCurrent()` is called, all tasks in `switch_tenant_tasks` are executed
2. **Database Switching**: `SwitchTenantDatabaseTask` updates the `tenant` connection configuration:
   ```php
   config(['database.connections.tenant.database' => $tenant->database]);
   ```
3. **Connection Refresh**: The database connection is refreshed to use the new database
4. **All Queries Redirected**: All Eloquent models using `UsesTenantConnection` now query the tenant's database

### Database Configuration (`config/database.php`):

```php
'tenant' => [
    'driver' => 'pgsql',
    'host' => env('DB_HOST', '127.0.0.1'),
    'port' => env('DB_PORT', '5432'),
    'database' => null,  // ← Dynamically set by SwitchTenantDatabaseTask
    'username' => env('DB_USERNAME', 'root'),
    'password' => env('DB_PASSWORD', ''),
],
```

### Why This Matters:

- **Automatic**: Developers don't need to manually specify which database to use
- **Transparent**: Models automatically use the correct database
- **Safe**: Impossible to query the wrong database once tenant context is set
- **Performance**: Connection pooling can be optimized per tenant

---

## Cache Isolation

### The Problem

By default, Redis cache is shared across all tenants. Without isolation:

- Tenant A caches a user with ID 1
- Tenant B queries user ID 1
- Tenant B gets Tenant A's cached data → **Data Leak!**

### Solution: SwitchTenantCacheTask

AVE CRM implements a custom cache isolation task.

### Implementation (`app/Tasks/SwitchTenantCacheTask.php`):

```php
class SwitchTenantCacheTask implements SwitchTenantTask
{
    public function makeCurrent(IsTenant $tenant): void
    {
        // Prefix cache keys with tenant ID
        $this->setCachePrefix("tenant_{$tenant->getKey()}_");
    }

    public function forgetCurrent(): void
    {
        // Reset to default prefix when tenant context is cleared
        $this->setCachePrefix('laravel_cache_');
    }

    protected function setCachePrefix(string $prefix): void
    {
        config(['cache.prefix' => $prefix]);
        app('cache')->forgetDriver(config('cache.default'));
    }
}
```

### How It Works:

1. **Tenant Identified**: When tenant context is set
2. **Prefix Applied**: Cache prefix becomes `tenant_1_`, `tenant_2_`, etc.
3. **Cache Keys Isolated**:
   - Tenant A: `tenant_1_user:123`
   - Tenant B: `tenant_2_user:123`
4. **No Cross-Tenant Access**: Even if both tenants cache user ID 123, they're separate keys

### Configuration (`config/multitenancy.php`):

```php
'switch_tenant_tasks' => [
    \Spatie\Multitenancy\Tasks\SwitchTenantDatabaseTask::class,
    \App\Tasks\SwitchTenantCacheTask::class,  // ← Custom cache isolation
],
```

### Why This Matters:

- **Prevents Cache Bleeding**: Tenant A's cached data never appears in Tenant B's cache
- **Security**: Sensitive cached data (user sessions, permissions) remain isolated
- **Performance**: Each tenant can have its own cache warming strategies
- **Debugging**: Cache keys clearly show which tenant they belong to

---

## Cache Isolation: Alternative Approaches

### Comparison of Cache Isolation Strategies

AVE CRM uses **key prefixing** for cache isolation, but there are several alternatives:

### 1. Key Prefixing ✅ **CHOSEN**

**How It Works:**

- Cache keys prefixed with tenant ID: `tenant_1_user:123`
- Prefix changed when tenant context switches

**Pros:**

- ✅ **Simple Implementation**: Just change cache prefix
- ✅ **No Infrastructure Changes**: Uses same Redis instance
- ✅ **Automatic**: Works with Laravel's cache system
- ✅ **Debugging**: Easy to see which tenant a key belongs to
- ✅ **Cost Effective**: One Redis instance for all tenants
- ✅ **Flexible**: Can clear cache per tenant (`Cache::tags(['tenant_1'])->flush()`)

**Cons:**

- ❌ **Shared Redis**: All tenants share same Redis instance (resource contention)
- ❌ **Key Collision Risk**: If prefix not set correctly, keys collide
- ❌ **Cache Size**: Harder to see per-tenant cache usage
- ❌ **Flush Complexity**: Flushing one tenant requires pattern matching

**Implementation:**

```php
// Tenant 1: tenant_1_user:123
// Tenant 2: tenant_2_user:123
config(['cache.prefix' => "tenant_{$tenant->id}_"]);
```

**Best For:**

- Applications with moderate tenant count (< 1000)
- Cost-sensitive deployments
- **AVE CRM Use Case**: ✅ Good fit - simple and effective

---

### 2. Separate Redis Database Per Tenant

**How It Works:**

- Each tenant uses different Redis database number (0-15)
- Switch Redis database: `SELECT 1` (for tenant 1)

**Implementation Example:**

```php
class SwitchTenantRedisTask implements SwitchTenantTask
{
    public function makeCurrent(IsTenant $tenant): void
    {
        config(['database.redis.cache.database' => $tenant->id % 16]);
        Redis::select($tenant->id % 16);
    }
}
```

**Pros:**

- ✅ **Complete Isolation**: Each tenant has separate Redis database
- ✅ **Easy Flushing**: `FLUSHDB` clears one tenant's cache
- ✅ **Resource Monitoring**: Can monitor cache size per tenant
- ✅ **No Key Collision**: Impossible for keys to collide

**Cons:**

- ❌ **Limited Databases**: Redis only has 16 databases (0-15)
- ❌ **Modulo Mapping**: Must map tenants to databases (collision risk)
- ❌ **Complexity**: Must manage database mapping
- ❌ **Resource Sharing**: Still shares Redis instance memory

**Best For:**

- Applications with < 16 tenants
- When complete cache isolation is critical
- **AVE CRM Use Case**: ⚠️ Limited by 16-database constraint

---

### 3. Separate Redis Instance Per Tenant

**How It Works:**

- Each tenant has its own Redis server/instance
- Connection string changes per tenant

**Implementation Example:**

```php
class SwitchTenantRedisTask implements SwitchTenantTask
{
    public function makeCurrent(IsTenant $tenant): void
    {
        config(['database.redis.cache.host' => "redis-tenant-{$tenant->id}"]);
        // Reconnect to new Redis instance
    }
}
```

**Pros:**

- ✅ **Maximum Isolation**: Complete physical separation
- ✅ **Independent Scaling**: Scale Redis per tenant
- ✅ **Resource Isolation**: One tenant's cache doesn't affect others
- ✅ **Security**: Network-level isolation possible
- ✅ **Monitoring**: Easy to monitor per-tenant cache metrics

**Cons:**

- ❌ **High Cost**: One Redis instance per tenant (expensive)
- ❌ **Infrastructure Complexity**: Must manage many Redis instances
- ❌ **Connection Overhead**: More connections to manage
- ❌ **Overkill**: Usually unnecessary unless tenant is very large

**Best For:**

- Enterprise tenants with high cache requirements
- Applications with few, large tenants
- **AVE CRM Use Case**: ❌ Overkill for most recruitment agencies

---

### 4. Cache Tags (Laravel)

**How It Works:**

- Use Laravel cache tags: `Cache::tags(['tenant_1'])->put('user:123', $data)`
- Flush by tag: `Cache::tags(['tenant_1'])->flush()`

**Implementation Example:**

```php
// Store with tag
Cache::tags(["tenant_{$tenant->id}"])->put('user:123', $userData);

// Retrieve (no tag needed, but must be in tenant context)
Cache::get('user:123'); // Automatically scoped to current tenant

// Flush tenant cache
Cache::tags(["tenant_{$tenant->id}"])->flush();
```

**Pros:**

- ✅ **Laravel Native**: Built-in feature
- ✅ **Easy Flushing**: Flush all cache for one tenant easily
- ✅ **Flexible**: Can use multiple tags

**Cons:**

- ❌ **Redis Limitation**: Requires Redis (tags not supported by all drivers)
- ❌ **Performance**: Tags add overhead
- ❌ **Not Automatic**: Must remember to tag every cache operation
- ❌ **Key Collision**: Still need prefix to prevent key collisions

**Best For:**

- Applications already using cache tags
- When per-tenant cache flushing is frequent
- **AVE CRM Use Case**: ⚠️ Could combine with prefixing for best of both worlds

---

### 5. No Cache Isolation (Dangerous!)

**How It Works:**

- All tenants share same cache keys
- No tenant-specific prefixing

**Why This Is Dangerous:**

```php
// Tenant A caches user
Cache::put('user:123', $tenantAUser);

// Tenant B queries same user ID
$user = Cache::get('user:123'); // Gets Tenant A's user! ❌ DATA LEAK!
```

**Never Use This** - Guaranteed data leaks!

---

### Decision Matrix for AVE CRM

| Strategy                | Isolation  | Cost       | Complexity | Scalability | **Score** |
| ----------------------- | ---------- | ---------- | ---------- | ----------- | --------- |
| **Key Prefixing** ✅    | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐    | **18/20** |
| Separate Redis DB       | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | ⭐⭐⭐     | ⭐⭐        | 14/20     |
| Separate Redis Instance | ⭐⭐⭐⭐⭐ | ⭐⭐       | ⭐⭐       | ⭐⭐⭐⭐⭐  | 14/20     |
| Cache Tags              | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     | ⭐⭐⭐⭐    | 15/20     |
| No Isolation            | ⭐         | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐  | 5/20      |

**Why Key Prefixing Was Chosen:**

1. **Simplicity**: Easiest to implement and maintain
2. **Cost Effective**: One Redis instance serves all tenants
3. **Sufficient Isolation**: Prefixing provides adequate isolation for AVE CRM's needs
4. **Laravel Integration**: Works seamlessly with Laravel's cache system
5. **Debugging**: Easy to identify which tenant a cache key belongs to

**When to Consider Alternatives:**

- **Separate Redis DB**: If you have < 16 tenants and need complete isolation
- **Separate Redis Instance**: For enterprise tenants with very high cache requirements
- **Cache Tags**: If you frequently need to flush cache per tenant (combine with prefixing)

---

## Queue Job Tenant Awareness

### The Problem

When background jobs (emails, reports, data processing) are queued, they must run in the correct tenant context.

### Solution: Automatic Tenant Awareness

**Configuration** (`config/multitenancy.php`):

```php
'queues_are_tenant_aware_by_default' => true,
```

### How It Works:

1. **Job Dispatched**: When a job is queued, the current tenant ID is automatically stored with the job
2. **Job Executed**: When the queue worker processes the job:
   - The tenant ID is retrieved
   - `$tenant->makeCurrent()` is called
   - All tasks (database switch, cache prefix) are executed
   - Job runs in the correct tenant context
3. **Context Cleared**: After job completion, tenant context is forgotten

### Example:

```php
// In a controller (tenant context: Tenant A)
dispatch(new SendReportJob($userId));

// In the queue worker:
// 1. Job retrieved with tenant_id = 1
// 2. Tenant A is made current
// 3. Database switches to tenant_a database
// 4. Cache prefix becomes tenant_1_
// 5. Job executes, queries Tenant A's data
// 6. Context cleared
```

### Why This Matters:

- **Automatic**: Developers don't need to manually pass tenant IDs to jobs
- **Safe**: Jobs always run in the correct tenant context
- **Email Safety**: Emails sent to users always use the correct tenant's data
- **Report Accuracy**: Generated reports always contain the correct tenant's data

---

## Queue Job Tenant Awareness: Alternative Approaches

### Comparison of Queue Job Handling Strategies

AVE CRM uses **automatic tenant awareness** for queue jobs, but there are alternatives:

### 1. Automatic Tenant Awareness ✅ **CHOSEN**

**How It Works:**

- Package automatically stores tenant ID with job
- Queue worker restores tenant context before executing job
- All `switch_tenant_tasks` run automatically

**Configuration:**

```php
'queues_are_tenant_aware_by_default' => true,
```

**Pros:**

- ✅ **Zero Developer Effort**: Works automatically, no code changes needed
- ✅ **Safe by Default**: Impossible to forget tenant context
- ✅ **Transparent**: Developers don't need to think about tenants
- ✅ **Consistent**: All jobs automatically get tenant context
- ✅ **Error Prevention**: Cannot accidentally run job in wrong tenant context

**Cons:**

- ❌ **Overhead**: Every job stores tenant ID (small storage overhead)
- ❌ **Less Flexible**: Harder to create cross-tenant jobs (if needed)
- ❌ **Package Dependency**: Relies on Spatie package behavior

**Example:**

```php
// Developer just dispatches job - tenant context handled automatically
dispatch(new SendEmailJob($userId));
// Job automatically runs in correct tenant context
```

**Best For:**

- Most multi-tenant applications
- When tenant context is always needed
- **AVE CRM Use Case**: ✅ Perfect - all jobs need tenant context

---

### 2. Manual Tenant Passing

**How It Works:**

- Developer manually passes tenant ID to job
- Job constructor accepts tenant ID
- Job manually sets tenant context

**Implementation Example:**

```php
class SendEmailJob implements ShouldQueue
{
    public function __construct(
        public int $tenantId,
        public int $userId
    ) {}

    public function handle(): void
    {
        $tenant = Tenant::find($this->tenantId);
        $tenant->makeCurrent();

        // Job logic here
        $user = User::find($this->userId);
        Mail::to($user->email)->send(...);
    }
}

// Usage
dispatch(new SendEmailJob(Tenant::current()->id, $userId));
```

**Pros:**

- ✅ **Explicit**: Clear that job needs tenant context
- ✅ **Flexible**: Can pass different tenant or no tenant
- ✅ **Control**: Developer has full control
- ✅ **No Package Dependency**: Works with any queue system

**Cons:**

- ❌ **Error-Prone**: Easy to forget to pass tenant ID
- ❌ **Boilerplate**: Must add tenant ID to every job
- ❌ **Inconsistent**: Some jobs might forget tenant context
- ❌ **Maintenance**: Must update all jobs when changing approach

**Best For:**

- When some jobs don't need tenant context
- When you need cross-tenant jobs
- **AVE CRM Use Case**: ⚠️ Could work, but automatic is safer

---

### 3. Tenant-Aware Interface

**How It Works:**

- Jobs implement `TenantAware` interface to opt-in
- Jobs without interface run without tenant context

**Implementation Example:**

```php
use Spatie\Multitenancy\Jobs\TenantAware;

class SendEmailJob implements ShouldQueue, TenantAware
{
    // Job automatically gets tenant context
}

class SystemMaintenanceJob implements ShouldQueue
{
    // No TenantAware interface - runs without tenant context
}
```

**Pros:**

- ✅ **Opt-In**: Jobs explicitly declare they need tenant context
- ✅ **Flexible**: Can have both tenant-aware and tenant-agnostic jobs
- ✅ **Clear Intent**: Code shows which jobs need tenant context

**Cons:**

- ❌ **Still Manual**: Must remember to implement interface
- ❌ **Easy to Forget**: Can forget to add interface to new jobs
- ❌ **Inconsistent**: Mix of tenant-aware and non-aware jobs

**Best For:**

- Applications with mix of tenant-aware and system jobs
- When you need cross-tenant jobs
- **AVE CRM Use Case**: ⚠️ Could work, but automatic is safer

---

### 4. Separate Queue Per Tenant

**How It Works:**

- Each tenant has its own queue
- Jobs dispatched to tenant-specific queue
- Queue workers process tenant-specific queues

**Implementation Example:**

```php
// Dispatch to tenant queue
dispatch(new SendEmailJob($userId))
    ->onQueue("tenant_{$tenant->id}");

// Queue worker processes specific tenant queue
php artisan queue:work --queue=tenant_1
```

**Pros:**

- ✅ **Complete Isolation**: Jobs from different tenants never mix
- ✅ **Resource Control**: Can allocate resources per tenant
- ✅ **Priority**: Can prioritize certain tenants' queues
- ✅ **Monitoring**: Easy to monitor per-tenant job performance

**Cons:**

- ❌ **Complexity**: Must manage many queues
- ❌ **Resource Overhead**: More queue workers needed
- ❌ **Scaling Issues**: Hard to scale with many tenants
- ❌ **Configuration**: Complex queue configuration

**Best For:**

- Enterprise applications with few, large tenants
- When tenants need guaranteed resource allocation
- **AVE CRM Use Case**: ❌ Overkill for most recruitment agencies

---

### 5. No Tenant Awareness (Dangerous!)

**How It Works:**

- Jobs run without tenant context
- Job must manually query correct tenant database

**Why This Is Dangerous:**

```php
class SendEmailJob implements ShouldQueue
{
    public function handle(): void
    {
        // No tenant context!
        $user = User::find($this->userId);
        // Which tenant's database? Could be wrong one! ❌
    }
}
```

**Never Use This** - Guaranteed bugs and data leaks!

---

### Decision Matrix for AVE CRM

| Strategy         | Safety     | Developer Experience | Flexibility | Complexity | **Score** |
| ---------------- | ---------- | -------------------- | ----------- | ---------- | --------- |
| **Automatic** ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐           | ⭐⭐⭐      | ⭐⭐⭐⭐⭐ | **20/20** |
| Manual Passing   | ⭐⭐⭐     | ⭐⭐                 | ⭐⭐⭐⭐⭐  | ⭐⭐⭐     | 13/20     |
| Interface-Based  | ⭐⭐⭐⭐   | ⭐⭐⭐               | ⭐⭐⭐⭐    | ⭐⭐⭐⭐   | 15/20     |
| Separate Queues  | ⭐⭐⭐⭐⭐ | ⭐⭐                 | ⭐⭐⭐      | ⭐⭐       | 12/20     |
| No Awareness     | ⭐         | ⭐⭐⭐⭐⭐           | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐ | 5/20      |

**Why Automatic Tenant Awareness Was Chosen:**

1. **Safety First**: Prevents bugs from forgetting tenant context
2. **Developer Experience**: Developers don't need to think about tenants
3. **Consistency**: All jobs automatically get correct context
4. **Error Prevention**: Impossible to accidentally run job in wrong tenant
5. **Maintainability**: Less code to maintain, fewer bugs

**When to Consider Alternatives:**

- **Manual Passing**: If you have many cross-tenant jobs (rare)
- **Interface-Based**: If you have mix of tenant-aware and system jobs
- **Separate Queues**: For enterprise tenants with strict resource requirements

---

## Model Traits and Tenant Awareness

### UsesTenantConnection Trait

All tenant-scoped models use the `UsesTenantConnection` trait from Spatie's package.

### Implementation:

**Example Models** (`app/Models/Candidate.php`, `app/Models/Account.php`, `app/Models/User.php`):

```php
use Spatie\Multitenancy\Models\Concerns\UsesTenantConnection;

class Candidate extends Model
{
    use UsesTenantConnection;  // ← All queries go to tenant database

    // Model code...
}
```

### How It Works:

1. **Trait Applied**: Model uses `UsesTenantConnection`
2. **Connection Override**: Eloquent automatically uses the `tenant` connection instead of default
3. **Database Switching**: When tenant context changes, all models using this trait automatically query the new database
4. **No Manual Configuration**: Developers don't need to specify `->connection('tenant')` in every query

### Landlord Models:

Models that should always use the landlord database use `UsesLandlordConnection`:

```php
use Spatie\Multitenancy\Models\Concerns\UsesLandlordConnection;

class Tenant extends SpatieTenant
{
    use UsesLandlordConnection;  // ← Always queries landlord database

    // Tenant metadata stored here
}
```

### Why This Matters:

- **Type Safety**: Compile-time guarantee that models use the correct connection
- **Developer Experience**: No need to remember which connection to use
- **Refactoring Safety**: Changing tenant context automatically affects all tenant models
- **Clear Intent**: Code clearly shows which models are tenant-scoped

---

## Middleware: NeedsTenant

### Purpose

The `NeedsTenant` middleware ensures that a tenant context is established before processing protected routes.

### Implementation (`routes/api.php`):

```php
Route::middleware([
    \Spatie\Multitenancy\Http\Middleware\NeedsTenant::class,
    'auth:sanctum'
])->group(function () {
    // Protected routes that require tenant context
});
```

### How It Works:

1. **Request Intercepted**: Middleware runs before the controller
2. **Domain Extraction**: Extracts domain from request
3. **Tenant Lookup**: Uses `DomainTenantFinder` to find tenant
4. **Context Set**: Calls `$tenant->makeCurrent()` if tenant found
5. **Tasks Executed**: All `switch_tenant_tasks` run (database switch, cache prefix)
6. **Request Continues**: Controller executes with tenant context established
7. **Error Handling**: If no tenant found, returns 404 or error

### Route Examples:

```php
// No tenant required (public registration)
Route::post('/auth/register-tenant', RegisterTenantController::class);

// Tenant required (login)
Route::middleware([NeedsTenant::class])->post('/auth/login', ...);

// Tenant + Authentication required
Route::middleware([NeedsTenant::class, 'auth:sanctum'])->group(function () {
    Route::get('/candidates', ...);
});
```

### Why This Matters:

- **Security**: Prevents access to routes without tenant context
- **Early Failure**: Fails fast if tenant cannot be determined
- **Consistent Context**: All protected routes have tenant context
- **Error Handling**: Clear error messages when tenant not found

---

## Tenant Registration Process

### Overview

When a new organization wants to use AVE CRM, they register as a tenant. This process:

1. Creates tenant metadata in landlord database
2. Creates a new PostgreSQL database for the tenant
3. Runs migrations to set up the tenant's schema
4. Creates the first admin user
5. Returns authentication token

### Implementation (`app/Http/Controllers/Auth/RegisterTenantController.php`):

### Step-by-Step Process:

#### Step 1: Validate Input

```php
$data = $request->validate([
    'company' => ['required', 'string', 'max:255'],
    'slug' => ['nullable', 'alpha_dash', 'max:64', 'unique:tenants,slug'],
    'name' => ['required', 'string', 'max:255'],
    'email' => ['required', 'email', 'max:255'],
    'password' => ['required', 'string', 'min:8', 'regex:/\d/', 'regex:/[^A-Za-z0-9]/', 'confirmed'],
    'domain' => ['nullable', 'string', 'max:255', 'unique:tenants,domain'],
]);
```

#### Step 2: Create Tenant Record (Landlord Database)

```php
$tenant = Tenant::create([
    'name' => $data['company'],
    'slug' => $slug,  // Auto-generated if not provided
    'domain' => $domain,  // Auto-generated: {slug}.localhost
    // database is auto-generated by model event: 'tenant_{slug}'
]);
```

**Model Event** (`app/Models/Tenant.php`):

```php
protected static function booted(): void
{
    static::creating(function ($tenant) {
        if (empty($tenant->uid)) {
            $tenant->uid = (string) Str::ulid();
        }
        if (empty($tenant->database)) {
            $tenant->database = 'tenant_' . str_replace('-', '_', $tenant->slug);
        }
    });
}
```

#### Step 3: Create Tenant Database

```php
private function createTenantDatabase(Tenant $tenant): void
{
    $databaseName = $tenant->database;

    // Use PDO directly (cannot run CREATE DATABASE in transaction)
    $pdo = new \PDO($dsn, $config['username'], $config['password']);
    $pdo->exec("CREATE DATABASE \"{$databaseName}\"");
}
```

**Why PDO?** PostgreSQL doesn't allow `CREATE DATABASE` inside a transaction block.

#### Step 4: Switch to Tenant Context

```php
$tenant->makeCurrent();
```

This executes all `switch_tenant_tasks`:

- Switches database connection to the new tenant database
- Sets cache prefix for the tenant

#### Step 5: Run Migrations (Tenant Database)

```php
\Illuminate\Support\Facades\Artisan::call('migrate', [
    '--database' => 'tenant',
    '--path' => 'database/migrations/tenant',
    '--force' => true,
]);
```

**Migration Paths**:

- `database/migrations/landlord/`: Tenant metadata (already run)
- `database/migrations/tenant/`: Business data schema (run per tenant)

#### Step 6: Create Admin User (Tenant Database)

```php
$admin = User::create([
    'name' => $data['name'],
    'email' => $data['email'],
    'password' => $data['password'],
    'role' => 'owner',
]);
```

#### Step 7: Generate Authentication Token

```php
$token = $admin->createToken('pat')->plainTextToken;
```

### Error Handling:

If any step fails, the process rolls back:

- If database creation fails → tenant record is deleted
- If migrations fail → database exists but is empty (can be cleaned up)
- If user creation fails → database exists but has no users

### Why This Matters:

- **Atomicity**: Each step is validated before proceeding
- **Idempotency**: Can be safely retried if it fails partway
- **Security**: Strong password requirements, unique constraints
- **Automation**: No manual database creation needed
- **Scalability**: Can handle thousands of tenant registrations

---

## Authentication Flow

### Overview

Authentication in a multi-tenant system is more complex because:

1. User must be authenticated
2. Tenant context must be established
3. User must belong to the correct tenant

### Flow Diagram:

```
1. User visits: acme.ave-crm.com/login
   ↓
2. NeedsTenant middleware extracts domain → finds Tenant A
   ↓
3. Tenant A context is set (database switched)
   ↓
4. User submits login credentials
   ↓
5. LoginController queries User model (uses tenant database)
   ↓
6. User found in Tenant A's database
   ↓
7. Password verified
   ↓
8. Sanctum token created (scoped to Tenant A)
   ↓
9. Token returned to frontend
```

### Implementation (`app/Http/Controllers/Auth/LoginController.php`):

```php
public function store(Request $request)
{
    // Tenant context already set by NeedsTenant middleware
    $credentials = $request->validate([
        'email' => ['required', 'email'],
        'password' => ['required', 'string'],
    ]);

    // Query uses tenant database (via UsesTenantConnection trait)
    $user = User::where('email', $credentials['email'])->first();

    if (!$user || !Hash::check($credentials['password'], $user->password)) {
        throw ValidationException::withMessages([
            'email' => 'Ongeldige inloggegevens',
        ]);
    }

    // Token is created in tenant context
    $token = $user->createToken('pat')->plainTextToken;

    return response()->json([
        'token' => $token,
        'user' => $userData,
        'tenant' => Tenant::current(),  // Current tenant info
    ]);
}
```

### Route Configuration (`routes/api.php`):

```php
// Tenant context must be set BEFORE authentication
Route::middleware([
    'throttle:login',
    \Spatie\Multitenancy\Http\Middleware\NeedsTenant::class
])->post('/auth/login', [LoginController::class, 'store']);
```

### Why Order Matters:

1. **NeedsTenant First**: Must identify tenant before querying users
2. **Database Switch**: User table is in tenant database, not landlord
3. **Email Uniqueness**: Same email can exist in multiple tenants
4. **Token Scoping**: Token is implicitly scoped to the tenant

### Security Considerations:

- **Rate Limiting**: `throttle:login` prevents brute force attacks
- **Password Hashing**: Laravel's `Hash::check()` uses bcrypt
- **Token Storage**: Sanctum tokens stored in tenant database
- **Domain Validation**: Frontend must send requests to correct domain

---

## Security Considerations

### 1. Data Isolation

**Threat**: Tenant A accessing Tenant B's data

**Protection**:

- Physical database separation
- Middleware enforces tenant context
- Models use `UsesTenantConnection` trait
- Impossible to query wrong database once context is set

**Why It Works**: Even if a developer forgets a `WHERE` clause, they can only query the current tenant's database.

### 2. ID Enumeration Attacks

**Threat**: Attacker guesses IDs (`/users/1`, `/users/2`) to enumerate users

**Protection**: ULIDs instead of auto-increment integers

**Implementation** (`app/Models/User.php`):

```php
protected static function booted(): void
{
    static::creating(function ($user) {
        if (empty($user->uid)) {
            $user->uid = (string) Str::ulid();  // e.g., '01ARZ3NDEKTSV4RRFFQ69G5FAV'
        }
    });
}

public function getRouteKeyName(): string
{
    return 'uid';  // Routes use ULID, not integer ID
}
```

**Why ULIDs**:

- **Non-sequential**: Cannot guess next ID
- **Unpredictable**: Random-looking strings
- **Globally Unique**: Can merge data from multiple sources
- **URL-Safe**: Can be used in URLs without encoding

### 3. Cache Bleeding

**Threat**: Tenant A's cached data appearing in Tenant B's cache

**Protection**: `SwitchTenantCacheTask` prefixes cache keys with tenant ID

**Why It Works**: Even if both tenants cache the same key, they're stored separately:

- Tenant A: `tenant_1_user:123`
- Tenant B: `tenant_2_user:123`

### 4. Session Hijacking

**Threat**: Attacker steals session token and uses it on different domain

**Protection**:

- Sanctum tokens are scoped to tenant
- Domain-based tenant resolution
- Token validation includes tenant context

### 5. SQL Injection

**Threat**: Attacker injects SQL to access other tenants' data

**Protection**:

- Eloquent ORM uses parameterized queries
- Database-per-tenant means injected queries can only access current tenant's database
- Even if injection succeeds, data isolation prevents cross-tenant access

### 6. Cross-Tenant Authentication

**Threat**: User from Tenant A authenticating as user from Tenant B

**Protection**:

- `NeedsTenant` middleware sets tenant context BEFORE authentication
- User lookup happens in tenant database
- Same email in different tenants = different users
- Token is implicitly scoped to tenant

---

## Migration Strategy

### Two-Tier Migration System

AVE CRM uses separate migration paths for landlord and tenant databases.

### Landlord Migrations (`database/migrations/landlord/`):

**Purpose**: Schema for tenant metadata

**Example**: `2025_10_09_000001_create_tenants_table.php`

```php
Schema::create('tenants', function (Blueprint $table) {
    $table->id();
    $table->ulid('uid')->unique();
    $table->string('name');
    $table->string('slug')->unique();
    $table->string('domain')->unique()->nullable();
    $table->string('database')->unique()->nullable();
    $table->timestamps();
});
```

**When Run**: Once, when setting up the application

**Connection**: `landlord` connection

### Tenant Migrations (`database/migrations/tenant/`):

**Purpose**: Schema for business data (users, candidates, accounts, etc.)

**Examples**:

- `2025_10_09_000002_create_users_table.php`
- `2025_10_09_000007_create_candidates_table.php`
- `2025_10_09_000005_create_accounts_table.php`

**When Run**:

- During tenant registration (for new tenants)
- When running `php artisan tenants:migrate` (for existing tenants after schema changes)

**Connection**: `tenant` connection (dynamically set per tenant)

### Running Migrations:

**Landlord** (one-time setup):

```bash
php artisan migrate --database=landlord --path=database/migrations/landlord
```

**Tenant** (during registration or updates):

```bash
# During registration (automatic)
$tenant->makeCurrent();
Artisan::call('migrate', ['--database' => 'tenant', '--path' => 'database/migrations/tenant']);

# For all tenants (after schema changes)
php artisan tenants:migrate

# For specific tenant
php artisan tenants:migrate --tenants=1
```

### Why Separate Migrations:

- **Clear Separation**: Landlord vs tenant concerns
- **Selective Application**: Can update tenant schema without touching landlord
- **Rollback Safety**: Can rollback tenant migrations without affecting landlord
- **Version Control**: Each tenant database tracks its own migration state

---

## ULID Strategy for Security

### The Problem

Auto-increment integer IDs are predictable:

- `/users/1`, `/users/2`, `/users/3` → Easy to enumerate
- Attacker can discover user count, data structure
- Security through obscurity fails

### The Solution: ULIDs

**ULID** (Universally Unique Lexicographically Sortable Identifier):

- 26 characters: `01ARZ3NDEKTSV4RRFFQ69G5FAV`
- Contains timestamp (sortable) + randomness (unpredictable)
- URL-safe, case-insensitive

### Implementation:

**Model Boot Method**:

```php
protected static function booted(): void
{
    static::creating(function ($model) {
        if (empty($model->uid)) {
            $model->uid = (string) Str::ulid();
        }
    });
}
```

**Route Key Name**:

```php
public function getRouteKeyName(): string
{
    return 'uid';  // Routes use ULID, not 'id'
}
```

**Database Schema**:

```php
$table->ulid('uid')->unique();  // Public identifier
$table->id();  // Internal auto-increment (for performance)
```

### Hybrid Strategy:

**Internal ID** (`id`):

- Auto-increment integer
- Used for foreign keys (performance)
- Never exposed in API

**External ID** (`uid`):

- ULID string
- Used in routes and API responses
- Unpredictable, secure

### Example:

```php
// Database
id: 1
uid: '01ARZ3NDEKTSV4RRFFQ69G5FAV'

// API Route
GET /api/v1/users/01ARZ3NDEKTSV4RRFFQ69G5FAV

// Eloquent
User::where('uid', $uid)->first();  // Uses ULID
$user->id;  // Internal ID (not exposed)
```

### Why This Matters:

- **Security**: Cannot enumerate users by guessing IDs
- **Privacy**: Cannot determine user count or data structure
- **Performance**: Internal integer IDs for fast joins
- **Compliance**: Meets security best practices for SaaS applications

---

## ID Strategy: Alternative Approaches

### Comparison of Public Identifier Strategies

AVE CRM uses **ULIDs** for public-facing identifiers, but there are several alternatives:

### 1. ULID (Universally Unique Lexicographically Sortable Identifier) ✅ **CHOSEN**

**Format:** `01ARZ3NDEKTSV4RRFFQ69G5FAV` (26 characters, base32)

**Structure:**

- First 10 characters: Timestamp (milliseconds since epoch)
- Last 16 characters: Randomness (80 bits)

**Pros:**

- ✅ **Sortable**: Contains timestamp, can sort by creation time
- ✅ **Unpredictable**: Random component prevents enumeration
- ✅ **URL-Safe**: Base32 encoding, no special characters
- ✅ **Compact**: 26 characters (shorter than UUID)
- ✅ **Case-Insensitive**: Easier to handle in URLs
- ✅ **Database Friendly**: Can be indexed efficiently
- ✅ **Collision Resistant**: 80 bits of randomness (1 in 1.2×10²⁴ chance)

**Cons:**

- ❌ **Not Standard**: Less common than UUID
- ❌ **Library Support**: Fewer libraries support ULID than UUID
- ❌ **Readability**: Harder to read than integers (but that's the point!)

**Example:**

```php
$ulid = Str::ulid(); // '01ARZ3NDEKTSV4RRFFQ69G5FAV'
// Can extract timestamp: 2024-01-15 10:30:00
// Can sort: ULIDs created at same time are sortable
```

**Best For:**

- Applications needing sortable, unpredictable IDs
- When timestamp information is useful
- **AVE CRM Use Case**: ✅ Perfect - sortable for "recent candidates" queries

---

### 2. UUID v4 (Random UUID)

**Format:** `550e8400-e29b-41d4-a716-446655440000` (36 characters with hyphens)

**Structure:**

- 128 bits of randomness
- Version 4: Random UUID (most common)

**Pros:**

- ✅ **Standard**: RFC 4122 standard, widely supported
- ✅ **Unpredictable**: Completely random, no enumeration possible
- ✅ **Globally Unique**: Can merge data from multiple sources
- ✅ **Library Support**: Excellent library support in all languages
- ✅ **No Collisions**: 2¹²⁸ possible values (practically impossible to collide)

**Cons:**

- ❌ **Not Sortable**: No timestamp, cannot sort by creation time
- ❌ **Longer**: 36 characters (with hyphens) vs 26 for ULID
- ❌ **URL Encoding**: Hyphens need encoding in some contexts
- ❌ **Database Performance**: Larger indexes, slower than integers
- ❌ **No Metadata**: Cannot extract any information from UUID

**Example:**

```php
$uuid = Str::uuid(); // '550e8400-e29b-41d4-a716-446655440000'
// No way to know when it was created
// Cannot sort by creation time
```

**Best For:**

- Distributed systems where sortability doesn't matter
- When you need maximum library/tool support
- **AVE CRM Use Case**: ⚠️ Could work, but ULID's sortability is valuable

---

### 3. UUID v7 (Time-Ordered UUID) - New Standard

**Format:** `018b5c5c-1234-7890-abcd-123456789abc` (36 characters)

**Structure:**

- First 48 bits: Unix timestamp (milliseconds)
- Next 12 bits: Version (7) and variant
- Remaining 74 bits: Randomness

**Pros:**

- ✅ **Sortable**: Contains timestamp, can sort by creation time
- ✅ **Standard**: RFC 4122 compliant (newer standard)
- ✅ **Unpredictable**: Random component prevents enumeration
- ✅ **Future-Proof**: Emerging standard, good long-term support

**Cons:**

- ❌ **New Standard**: Less library support than UUID v4
- ❌ **Longer**: 36 characters (with hyphens)
- ❌ **Adoption**: Not all databases/tools support UUID v7 yet

**Best For:**

- New projects wanting sortable UUIDs
- When you need RFC 4122 compliance
- **AVE CRM Use Case**: ⚠️ Good option, but ULID is more compact

---

### 4. Auto-Increment Integer IDs

**Format:** `1`, `2`, `3`, `4`...

**Structure:**

- Sequential integers
- Database-managed

**Pros:**

- ✅ **Best Performance**: Fastest for database indexes and joins
- ✅ **Smallest Size**: 4-8 bytes vs 16-36 bytes for UUID/ULID
- ✅ **Simple**: Easy to understand and debug
- ✅ **Database Optimized**: Databases optimized for integer keys
- ✅ **Foreign Keys**: Fastest foreign key lookups

**Cons:**

- ❌ **Enumeration Risk**: Easy to guess next ID (`/users/1`, `/users/2`)
- ❌ **Information Leakage**: Reveals user count, creation order
- ❌ **Security Risk**: Attackers can enumerate resources
- ❌ **Not Globally Unique**: Cannot merge data from multiple sources
- ❌ **Predictable**: Easy to predict next ID

**Example:**

```php
// Attacker can enumerate:
GET /api/users/1  // Exists
GET /api/users/2  // Exists
GET /api/users/3  // Exists
GET /api/users/999 // Doesn't exist - reveals user count!
```

**Best For:**

- Internal APIs (not public-facing)
- When performance is critical and security less important
- **AVE CRM Use Case**: ❌ Rejected - too insecure for public API

---

### 5. Hash IDs (Base62 Encoded)

**Format:** `aB3dE5fG7hI9` (variable length)

**Structure:**

- Integer ID encoded in base62
- Reversible (can decode back to integer)

**Pros:**

- ✅ **Obfuscated**: Doesn't look like sequential numbers
- ✅ **Performance**: Still uses integer internally
- ✅ **Reversible**: Can decode back to integer for database queries
- ✅ **Shorter**: Shorter than UUID/ULID for small IDs

**Cons:**

- ❌ **Reversible**: Can be decoded, so not truly secure
- ❌ **Enumeration Possible**: With enough samples, pattern can be detected
- ❌ **Not Globally Unique**: Based on integer IDs
- ❌ **Complexity**: Need encoding/decoding logic

**Example:**

```php
// Encode: 12345 → 'dnh'
// Decode: 'dnh' → 12345
// Still enumerable if attacker knows encoding algorithm
```

**Best For:**

- When you need obfuscation but want integer performance
- Internal tools where security is moderate
- **AVE CRM Use Case**: ⚠️ Better than integers, but ULID is more secure

---

### 6. Hybrid Strategy (Internal + External IDs) ✅ **AVE CRM APPROACH**

**How It Works:**

- **Internal ID**: Auto-increment integer (`id`) - never exposed
- **External ID**: ULID (`uid`) - used in API and routes

**Database Schema:**

```php
$table->id();                    // Internal: 1, 2, 3...
$table->ulid('uid')->unique();   // External: 01ARZ3NDEKTSV4RRFFQ69G5FAV
```

**Pros:**

- ✅ **Best of Both Worlds**: Performance of integers + security of ULIDs
- ✅ **Fast Joins**: Foreign keys use integer IDs internally
- ✅ **Secure API**: Public routes use unpredictable ULIDs
- ✅ **Flexible**: Can change external ID format without changing database

**Cons:**

- ❌ **Storage Overhead**: Two ID columns per table
- ❌ **Index Overhead**: Two indexes (one for `id`, one for `uid`)
- ❌ **Complexity**: Must maintain mapping between IDs

**Example:**

```php
// Database
id: 1
uid: '01ARZ3NDEKTSV4RRFFQ69G5FAV'

// API Route (secure)
GET /api/users/01ARZ3NDEKTSV4RRFFQ69G5FAV

// Internal Query (fast)
User::find(1); // Uses integer ID
User::where('uid', $uid)->first(); // Uses ULID
```

**Best For:**

- Applications needing both performance and security
- Public APIs with sensitive data
- **AVE CRM Use Case**: ✅ Perfect - balances performance and security

---

### Decision Matrix for AVE CRM

| Strategy                   | Security   | Performance | Sortability | Standardization | **Score** |
| -------------------------- | ---------- | ----------- | ----------- | --------------- | --------- |
| **ULID** ✅                | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐    | ⭐⭐⭐⭐⭐  | ⭐⭐⭐          | **20/25** |
| UUID v4                    | ⭐⭐⭐⭐⭐ | ⭐⭐⭐      | ⭐          | ⭐⭐⭐⭐⭐      | 16/25     |
| UUID v7                    | ⭐⭐⭐⭐⭐ | ⭐⭐⭐      | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐        | 19/25     |
| Auto-Increment             | ⭐         | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐      | 12/25     |
| Hash IDs                   | ⭐⭐⭐     | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐  | ⭐⭐            | 16/25     |
| **Hybrid (ULID + Int)** ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐  | ⭐⭐⭐          | **23/25** |

**Why ULID + Integer Hybrid Was Chosen:**

1. **Security**: ULIDs prevent ID enumeration attacks
2. **Performance**: Integer IDs for foreign keys and joins (fastest)
3. **Sortability**: ULIDs contain timestamp, useful for "recent items" queries
4. **Best Practice**: Industry standard for SaaS applications
5. **Future-Proof**: Can migrate to UUID v7 later if needed

**When to Consider Alternatives:**

- **UUID v4**: If you don't need sortability and want maximum library support
- **UUID v7**: If you want RFC 4122 compliance and sortability
- **Auto-Increment**: Only for internal APIs or when security is not a concern
- **Hash IDs**: If you need obfuscation but want integer performance (less secure than ULID)

---

## Summary

AVE CRM's multi-tenancy implementation provides:

1. **Complete Data Isolation**: Database-per-tenant architecture ensures physical separation
2. **Automatic Context Switching**: Middleware and tasks handle tenant resolution transparently
3. **Cache Safety**: Custom cache isolation prevents data bleeding
4. **Queue Safety**: Background jobs automatically run in correct tenant context
5. **Security**: ULIDs prevent ID enumeration, middleware enforces tenant context
6. **GDPR Compliance**: Easy data deletion by dropping tenant database
7. **Scalability**: Each tenant can scale independently
8. **Developer Experience**: Models and queries automatically use correct database

This architecture ensures that AVE CRM can safely serve multiple recruitment agencies while maintaining complete data isolation and security.
