---
title: "Production-Readiness Rapport"
subtitle: "AVE CRM — Backend, Frontend, Security, Performance, UI/UX & Operations"
author: "Audit-synthese: 5 parallelle deep-scan agents"
date: "2026-06-01"
lang: nl-NL
---

# Executive Summary

Het product staat live sinds 2026-05-28 met echte klantdata, maar het is **niet
production-ready** in de betekenis "ik durf hier morgen nieuwe betalende klanten
op te zetten zonder onmiddellijk werk".

De kernfunctionaliteit werkt en de multi-tenant isolatie is structureel goed
opgelost via Spatie + database-per-tenant. Daar zit de stevige fundering. Daar
bovenop staan **tien serieuze gaten** die elk afzonderlijk een
production-incident kunnen veroorzaken: van een ongeauthenticeerde
document-download tot het volledig ontbreken van error-monitoring en backups.

Het meest acute risico is een combinatie van **gecommitte productie-secrets in
de deploy-documentatie** en het **ontbreken van `tenants:migrate` in het
deploy-script** — beide zijn vandaag te fixen.

## Totalen per audit

| Audit-domein | Findings | Critical |
|---|---:|---:|
| Backend security | 44 | 4 |
| Backend performance / code-kwaliteit | ~25 | 6 |
| Frontend performance / code-kwaliteit | ~47 | 5 |
| UI/UX consistency | ~45 | — |
| DevOps / operationeel | ~30 | 7 |
| **Na deduplicatie** | **~150 uniek** | **10 kritieke blokkers** |

## Correctie vooraf

De UI/UX-agent meldt dat de "Interimmer beschikbaarheidsdatum"-feature broken is
omdat we matchen op `"interimmer"`. Dat klopt niet — de DB-seeder gebruikt
`"interimmer"`, dat hebben we eerder bewust gefixt en geverifieerd. Wél bestaat
een gerelateerde bug: de hardcoded fallback-list (`network.tsx:108`) gebruikt
nog `"interim"` (en `"candidate"`). Als een tenant ooit zonder geseede
`network_role`-opties draait valt de fallback in en breekt de filter. Onder
Medium opgenomen.

---

# Kritische Blokkers

> Fix vóór nieuwe klanten + binnen dagen.

## 1. Role-profile download is volledig ongeauthenticeerd

**Locatie:** `backend/routes/api.php:105` — `->withoutMiddleware('auth:sanctum')`
op `/assignments/{uid}/role-profile/download`.

**Risico:** Iedereen die een 26-char ULID kent (en die zit in elke
`/assignments` API-response) kan vacature-PDF's met salarisranges,
opdrachtgever-info en kandidaat-profielen streamen uit R2. ULID's lekken via
gedeelde links, browser-history, logs. Drie van de vijf audits scoorden dit als
Critical.

**Fix:** verwijder `->withoutMiddleware('auth:sanctum')`. Sanctum werkt prima
op stream-responses; het frontend stuurt al een Bearer-header.

## 2. Productie-secrets gecommit in DEPLOYMENT_STAPPEN.md

**Locatie:** `DEPLOYMENT_STAPPEN.md:180-181, 195`

**Risico:** Bevat een echt-uitziende R2 access key, R2 secret en Google
Geocoding API key. Het bestand staat in git. Iedereen met repo-toegang
(collega's, contractors, GitHub-organisatie-leden) heeft full read/write op de
R2-bucket en kan Google-rekeningen opjagen.

**Fix:**

- Roteer alle drie **nu** bij de provider (Cloudflare R2, Google Cloud Console)
- Scrub het bestand naar placeholders
- Voeg gitleaks/trufflehog toe aan een pre-commit hook
- Doe `git log -p DEPLOYMENT_STAPPEN.md` en overweeg history-rewrite als de
  repo ooit publiek was

## 3. `tenants:migrate` ontbreekt in het deploy-script (én is niet atomisch)

Twee verwante problemen:

- `deploy.sh:38` draait alleen `migrate --force`. Geen `tenants:migrate`. Elke
  deploy met tenant-schema-wijzigingen breekt tenants stil. Het feit dat dit
  nog niet is uitgegaan is geluk.
- Als je `tenants:migrate` toevoegt: bij `set -e` aborteert de deploy bij de
  eerste falende tenant. Met nieuwe code al binnengetrokken, deel van de
  tenants op nieuw schema en deel op oud. Recipe voor mixed-state outage.

**Fix:** voeg `php artisan tenants:migrate --force` toe in `deploy.sh` ná de
landlord-migratie. Wrap het in een command die per-tenant succes/falen logt,
een pre-deploy `--pretend` doet, en bij faal een duidelijk niet-nul exit-code
teruggeeft zodat Forge het release niet activeert.

## 4. `/auth/find-tenant` is een gratis user-enumeration + DB-DoS

**Locatie:** `backend/app/Http/Controllers/Auth/TenantListController.php:21-44`

**Risico:** Doet `Tenant::all()` en voor **elke tenant** een `makeCurrent()` +
DB-roundtrip om te checken of het e-mail bestaat. Onauthenticeerd. Throttle is
20/min/IP. Een aanvaller kan:

- bevestigen wie klant is bij welke tenant
- per request N tenant-DB-verbindingen forceren → bij groeiende N triviaal
  connections uitputten

**Fix:** maak een landlord-tabel `tenant_users_index (email_hash, tenant_id)`
die je vult op user create/update/delete. Lookup wordt één SELECT op de
landlord. Reageer altijd identiek ("we hebben een mail gestuurd als dit adres
bestaat"). Stuur de tenant-hint via email.

## 5. Zware sync-werk in de request-cyclus (geocoding, Excel-import)

**Locatie:**

- `backend/app/Models/Contact.php:106-122` — élke `Contact::save()` met een
  dirty `location` doet synchroon een Google Geocoding-call
- `backend/app/Services/ExcelImportService.php:368` — maakt contacten in een
  loop → potentieel 500+ HTTP-calls in één request → PHP-FPM timeout → halve
  import
- Geen rate-limit op `/geocode`. Een kwaadwillende gebruiker kan de
  Google-rekening leegtrekken.
- `ContactController::store/update` en `LinkedInImportController` triggeren
  dezelfde hook.

**Fix:**

- Verplaats geocoding van `static::saving` naar een `GeocodeContactJob` op
  `static::saved` (tenant-aware queue is al geconfigureerd)
- Mirror voor Excel-import het bestaande `ProcessCvImport`-patroon: opslaan,
  queuen, 202 teruggeven, progress in Redis
- Voeg `throttle:30,1` toe op `/geocode`

## 6. Authorisatie-gaten in vrijwel elke write-endpoint behalve `Assignment::destroy`

Een `viewer` (read-only volgens product-spec) kan vandaag schrijven op
meerdere endpoints. Overzicht:

| Controller | store | update | destroy | viewer-impact |
|---|:-:|:-:|:-:|---|
| `AssignmentController` | ❌ | ❌ | ✅ | viewer kan opdrachten aanmaken/wijzigen, incl. fee-velden |
| `AccountActivityController` | ❌ | ❌ | ❌ | viewer kan activiteiten posten + assignment-status flippen |
| `AssignmentActivityController` | ❌ | ❌ | ❌ | idem |
| `AssignmentCandidateController` | ❌ | ❌ | ❌ | viewer kan kandidaten koppelen + statussen wijzigen |
| `AccountContactController` | ❌ | — | ❌ | viewer kan contactpersonen koppelen/ontkoppelen |
| `CalendarEventController` | ✅ (self) | ❌ | ❌ | viewer kan andermans agenda wijzigen/wissen |
| `ContactDocumentController` | ❌ | — | ❌ | viewer kan CV's uploaden én **verwijderen** |
| `UserController` | gate | partial | gate | viewer kan alle users + emails inzien (phishing-recon) |

**Fix:** policies aanmaken voor de 6 ongated controllers; `$this->authorize(...)`
toevoegen in elke method. `CalendarEvent::update/destroy` moet ownership
controleren (`$event->user_id === $auth->id || $auth->isAdmin()`). Dit gat
staat al sinds de mei-audit open.

## 7. Geen database-backup-strategie gedocumenteerd

`DEPLOYMENT_RAPPORT.md:465` noemt het zelf als open punt. Productie is live
met klantdata. Er is geen Forge backup-cron, geen R2-versioning, geen
`pg_dumpall`. Eén `DROP DATABASE` (door een typo, hack of disk-fail) is een
totaal-loss-event.

**Fix:**

- Zet Forge daily backups aan naar DO Spaces of R2
- Per-tenant `pg_dump` + de landlord
- Test restore-procedure één keer
- R2 versioning aan op alle buckets
- Documenteer in `DEPLOYMENT_STAPPEN.md`

## 8. Geen CI-gate + effectief geen tests

Geen `.github/workflows/`. Forge deployt direct vanaf `main` op push. Tests in
`backend/tests/` zijn 4 stubs + 4 echte tests waarvan `TenantRegistrationTest`
zelf kapot is (verbindt met SQLite `:memory:` terwijl de controller PostgreSQL
PDO doet). Coverage van auth, multi-tenant isolatie, CRUD-endpoints: **nul**.
Niets vangt de hierboven genoemde authorization-gaten op.

**Fix korte termijn:** GitHub Actions workflow die `composer install`,
`composer audit`, `php artisan test`, `pint --test`, en
`cd frontend && npm ci && npm run lint && tsc --noEmit && npm run build` draait.
Forge: "deploy when green".

**Fix middellange termijn:** feature-tests voor de top-10 endpoints + één
tenant-isolatie-test per rol.

## 9. Geen error-monitoring (backend noch frontend)

Geen Sentry/Bugsnag/Datadog. `bootstrap/app.php:23` heeft een lege
`withExceptions` callback. Geen React `ErrorBoundary` (geverifieerd: 0 hits in
`src/`). Productie-incidents zijn alleen ontdekbaar via `ssh + tail laravel.log`
— letterlijk wat `DEPLOYMENT_STAPPEN.md:362` aanraadt. Frontend JS-errors zijn
volledig onzichtbaar.

**Fix:** `composer require sentry/sentry-laravel` + `npm i @sentry/react`,
environment-based DSN, top-level `<ErrorBoundary>` rond de RouterProvider in
`main.tsx`. Dit is een avond werk en voorkomt black-box-incidents.

## 10. PII wordt op INFO-niveau in cleartext gelogd

Persistent issue in 3 audits onafhankelijk:

- `LoginController:41-44` — naam + email + role + uid per login
- `RegisterTenantController:17,22,30-31,38,47,65,84` — naam, slug, tenant-id,
  user-id per registratie
- `ContactDocumentController:50-74, 116-137` — `originalName` + headers per
  upload/download (kandidaat-namen vaak in filename)
- `AuthServiceProvider:26-33` — `Log::info` in de `manage-users` Gate-definitie
  → ratelt door op elke check
- Geen log-rotatie / retentie-policy gedocumenteerd

**GDPR-risico:** persoonsgegevens onbeperkt in logs zonder verwerking-grondslag
of retentie. Daarnaast log-volume + Forge disk fills.

**Fix:** strip alle `Log::info` met PII (debug-restanten, geen runtime-doel).
Configureer `LOG_CHANNEL=daily` + `LOG_DAILY_DAYS=14` in productie. Voeg
log-shipper toe (Papertrail / Better Stack / Loki). Documenteer retentie.

---

# Hoge Prioriteit

> Binnen 2–4 weken.

## Backend / data-laag

| # | Issue | Locatie | Fix |
|---|---|---|---|
| H1 | `ContactController::index` zonder paginatie, 1000+ rijen; `cv_url` accessor doet 1 query per contact (N+1) | `Contact.php:66,81-90`, `ContactController:54-59` | Verwijder `cv_url` uit `$appends` of eager-load via subquery; paginate of voeg lean `/contacts/network` endpoint toe |
| H2 | `AccountController::index` doet N+1 per account voor `closed_assignments`-count | `AccountController:24-49` | `withCount(['assignments', 'assignments as closed_count' => fn($q) => $q->whereIn('status', AssignmentStatus::CLOSED)])` |
| H3 | `AssignmentController::index` (+ `byAccount`) signeert R2 URLs per rij — 2 signeringen × N rijen | `AssignmentController:25-92, 97-105, 515-526` | Sign alleen in `show`; paginate `index` |
| H4 | Multi-step writes zonder transacties (Contact + work_experiences, Assignment + R2-uploads, Activity + status flip) | `ContactController:97-114, 141-218`, `AssignmentController:170-219`, `AccountActivityController:55-64` | `DB::transaction(...)` rond schrijfblokken. R2-uploads buiten de transactie of met expliciete cleanup |
| H5 | `DropdownOption::validationRule()` doet een SELECT per validatie-rule — bij Contact-update 9 SELECTs alleen voor validatie | `DropdownOption.php:38-52` + 22 call-sites | Cache `validValues($type)` per request of via tenant-cache |
| H6 | Missende DB-indexen op gefilterde kolommen + GIN op JSON-arrays | tenant-migraties `2026_03_31_000002` en `_000003` | Migratie met indexen op `contacts.email`, `current_company`, `category`, `availability_date`; GIN op `network_roles`; `accounts.client_status`; `assignments.start_date/end_date`; `assignment_contact.status`; `account_activities.created_at` |
| H7 | Soft-delete laat R2-files orphaned achter (account → orphaned notes_image + role_profile) | `AssignmentController::destroy:499-510`, `AccountController::destroy:152-167` | Policy: soft-delete behoudt files tot force-delete, OF `destroy` is hard voor files |
| H8 | Queue-connection is `database` (alle dispatches schrijven naar landlord) terwijl Redis beschikbaar is. `ProcessCvImport` doet handmatig `Tenant::find()->makeCurrent()` — dubbelop met Spatie | `.env.production.example:34`, `ProcessCvImport.php:47-57` | `QUEUE_CONNECTION=redis`, verwijder handmatige `makeCurrent` |
| H9 | `cv:check-batches` schedule heeft **twee** commands met dezelfde signature — non-deterministisch welke wint | `CheckBatchImports.php:12`, `CheckCvImportBatches.php:11` | Delete de duplicaat (waarschijnlijk `CheckCvImportBatches`), behoud `forgetCurrent()`-discipline |
| H10 | `MAIL_MAILER=log` als default in deploy-doc → password-reset-mails komen niet aan | `DEPLOYMENT_STAPPEN.md:170-171` | `resend/resend-laravel` is al geïnstalleerd; `MAIL_MAILER=resend` + `RESEND_KEY` |
| H11 | Tenant-registratie is publieke endpoint zonder email-verificatie/captcha — bot-signups vullen landlord + Forge-disk | `routes/api.php:31-32` | Double opt-in, hCaptcha/Turnstile, cleanup-command voor unverified tenants |
| H12 | Sanctum tokens nooit cleanup → tenants stapelen tokens op | tenant_migrations `_000004:96` | Schedule `sanctum:prune-expired` daily |

## Frontend performance + DX

| # | Issue | Locatie | Fix |
|---|---|---|---|
| F1 | **Zero code splitting** — productie-bundle is 2,5 MB. Login-pagina laadt ook FullCalendar + mammoth + DataGrid + DnD-Kit | `router.tsx:3-17`, `vite.config.ts` (geen `build` config) | `React.lazy()` rond elke route + `Suspense`; `manualChunks` voor mui/react-query/fullcalendar; lazy-import `mammoth` pas op CV-preview |
| F2 | `ReactQueryDevtools` zit in productie bundle | `QueryProvider.tsx:2,26` | Gate met `import.meta.env.DEV` |
| F3 | `console.log` met login-respons, user-objecten, CV-URLs in prod | `login.tsx:228-234`, `useUsers.ts:16,29,33`, `settings.tsx:581`, `network.tsx:1502`, `candidates.tsx:116` | Remove + ESLint `no-console` rule |
| F4 | `network.tsx` `columns` (15 GridColDef met `renderCell`) wordt elke render opnieuw gebouwd — verslaat DataGrid memoization op 1000 rijen | `network.tsx:1664-1885` | Wrap in `useMemo`; stabilize callbacks met `useCallback` |
| F5 | 9 separate `useDropdownOptions` calls bij open van `/network`. `useAllDropdownOptions` bestaat al maar wordt alleen door settings gebruikt | `network.tsx:570-581`, e.a. | Switch alle pages naar `useAllDropdownOptions` |
| F6 | `useContacts` laadt de hele contact-tabel op `/accounts/:uid` alleen voor één Autocomplete | `account-detail.tsx:85` | Vervang door `useSearchCandidates` (al server-side) of `enabled`-gate |
| F7 | Dode code: `pages/default/candidates.tsx` (528 LOC), `components/assignments/*`, `components/ui/{BasicTable,DataTable}.tsx`, `lib/http.ts`, `axios-client.ts` op root, `hooks/use{Accounts,Candidates,Users,AssignmentCandidates}.ts` | div. | Delete; migreer 13 imports van `axios-client` naar `api/client` |
| F8 | Geen ErrorBoundary; query-errors per page anders uitgelezen | `main.tsx`, `router.tsx`, div. | Top-level ErrorBoundary; `extractApiError(err)` helper; `errorElement` per route |
| F9 | Geen global toast/snackbar — elke dialog rolt eigen `<Alert>` state | div. | `notistack` of `useSnackbar` context; hook in `QueryClient.defaultOptions.mutations.onError` |
| F10 | Dubbele HTTP-calls na account-create: `refresh()` + `invalidateQueries(accounts.all)` | `accounts.tsx:246-247, 325` | Migreer naar TanStack-versie van `useAccounts`, drop legacy hook |
| F11 | TypeScript `strict: false` + `noImplicitAny: false` — ~61 expliciete `any`, casts naar `any`, `Control<any>` in shared `ClassificationFields` | `tsconfig.app.json:14-17` | Enable `strictNullChecks` + `noImplicitAny`; fix incrementeel |
| F12 | Blob-URL leak in network notes-image effect (cleanup closure leest stale Map) | `network.tsx:733-784` | Gebruik ref voor de URLs, revoke in cleanup |

## Authorisatie / security (high, niet critical)

| # | Issue | Locatie |
|---|---|---|
| S1 | Calendar feed token in cleartext in DB; geen rate-limit op `/calendar-feed/{tenant}/{token}` | `routes/api.php:140`, `users.calendar_token` |
| S2 | ZIP-batch-import: geen entry-count cap, geen per-file size cap, geen zip-bomb guard | `BatchCvImportService.php:50-119` |
| S3 | File-uploads gebruiken `getClientOriginalExtension()` (user-controlled) i.p.v. `$file->extension()` voor opslagpad | `FileStorageService.php`, `ContactDocumentController:76-79` |
| S4 | Wachtwoord-reset broker mist password-complexity-regex; `ForgotPassword` lekt of email bestaat (verschillende response) | `ForgotPasswordController:15-29`, `ResetPasswordController:18-43` |
| S5 | Reset-URL bevat tenant-`domain` (user-controlled input bij registratie) → phishing-vector als domain niet streng wordt gevalideerd | `User.php:138`, `RegisterTenantController:24` |
| S6 | Sanctum `SANCTUM_STATEFUL_DOMAINS` + `SESSION_DOMAIN=.ave-crm.nl` + `supports_credentials:true` zonder duidelijk SPA-vs-token model gedocumenteerd | `config/sanctum.php`, `config/cors.php` |
| S7 | `GOOGLE_APPLICATION_CREDENTIALS` resolved via `base_path()` — als iemand `storage:link` draait wordt het service-account web-bereikbaar | `config/services.php:42-46` |
| S8 | Geen HSTS / CSP / Referrer-Policy in nginx; deprecated `X-XSS-Protection` wel | `nginx-avecrm.conf:57-59` |
| S9 | Stray scripts op root: `backend/check_tenants.php`, `drop_tenants.php`, `debug_logs.php`, `test_tenant_create.php`, `test_output*.txt` — committed; `drop_tenants.php` is destructief | repo-root | `git rm` + `.gitignore` patterns |

---

# Middellange Termijn

> Binnen een kwartaal.

## Backend code-kwaliteit

- Splits `AssignmentController` (527 LOC) in `Assignment` + `AssignmentRoleProfile` + API-resource voor signing
- Verplaats hardcoded `'shadow_management'` magic string naar `AssignmentStatus` of nieuw status-enum
- `MeController:20-24` retourneert `$user->tenant` maar die relation bestaat niet → altijd null
- Consistente FormRequests (alleen `StoreContactRequest`, `StoreUserRequest`, `UpdateUserRequest` bestaan)
- `addslashes` op `Content-Disposition` filename → vervang door `HeaderUtils::makeDisposition`
- `ProcessCvImport::tries=5` → exponential retries op poison messages = euro's per bad PDF; onderscheid retriable vs non-retriable
- Schedule cleanup van `storage/app/temp/` (9 leftover batch-dirs op disk)
- Cleanup van `RegisterTenantController:164-181` (commented oude slug-functie), `routes/api.php:68-78` legacy CV-route

## Frontend code-kwaliteit

- `network.tsx` (3525 LOC) splitten: extract `AddContactDialog`, `EditContactDialog`, `CvViewerDialog`, `NotesImageDialog`, `WorkHistoryDialog`, filter-panels, `NetworkDataGrid`. Doel: page <400 LOC orchestratie
- `settings.tsx` (1002 LOC) en `assignments.tsx` (905 LOC) idem
- `AssignmentFormDialog.tsx` (1022 LOC) → extract `RoleProfileUploader`, `NotesImageUploader`, `SalaryFeeSection`, `BenefitsChipGroup`
- Migreer `agenda.tsx` event-dialog en `AddActivityDialog.tsx` van `useState` naar RHF + Zod (laatste twee non-RHF forms)
- Ad-hoc Axios calls in pages (`accounts.tsx:241`, `agenda.tsx`, `settings.tsx`, `AddActivityDialog.tsx`) verplaatsen naar mutation-hooks
- Brand-rood inconsistentie: `#800400` (theme) vs `#590d0d` (styles.ts + agenda) → één bron via `theme.palette.primary.main`
- MUI v7 deprecations: 34× `InputProps=` en 17× `InputLabelProps=` → migreer naar `slotProps`
- 10 files importeren MUI-icons via barrel — dev-server cold-start traag
- localStorage column-order keys versioneren (`...:v2`) zodat rename-een-kolom niet de user's order wist

## DevOps

- `sslmode` voor Postgres uit env (`require` op DO managed DB)
- `SESSION_SECURE_COOKIE=true` expliciet in productie-env
- Decide `/up` vs `/health` als canonieke probe; verwijder de ander; haal `Log::info('Health check took…')` weg
- Documenteer queue-daemon expliciet (Procfile of `forge.yaml`); voeg `/health/queue` monitor toe (oldest available_at)
- Cache prefix swap-race: verifieer met test of een queue-job voor tenant A geen cache-leak heeft naar tenant B
- Robots.txt: minimaal `Disallow: /dashboard`, `/api`, `/register` of volledig `Disallow: /` voor interne CRM
- Drie bijna-identieke `nginx-avecrm*.conf` op root → één canonieke onder `docs/`
- `ngrok`-binary en `.docx`/`.pptx` files op repo-root weghalen (31 MB+ bloat)
- `docs/legacy-import.md` is UTF-16 → terug naar UTF-8

## Test coverage (van nul naar redelijk)

- Feature-test per controller-CRUD voor de 5 core entities (Account, Contact, Assignment, AccountActivity, CalendarEvent)
- Eén `AuthorizationTest` per rol × per controller-action — vangt de bestaande gaten en alle toekomstige
- Eén `TenantIsolationTest` — twee tenants, schrijf in A, asserteer geen leak in B
- `RegisterTenantTest` fixen (gebruikt nu `:memory:` SQLite tegen pgsql-controller)
- `composer audit` en `npm audit` in CI

---

# UI/UX Flaws

> Door product-bril, op user-pain gesorteerd.

## Echt verwarrend / kapot

1. **Agenda "Today" button is Engels** + de "Search" input op de agenda werkt
   niet (state wordt nooit gebruikt). `agenda.tsx:526, 585-589`. → Vertaal naar
   "Vandaag"; bedrade óf verwijder de search.
2. **Agenda delete-failure wordt stil gegeten** — `console.error`, dialog
   sluit, event komt na refresh terug. `agenda.tsx:425-428`. → Surface error in
   dialog, sluit niet bij fail.
3. **Kandidaat verwijderen uit opdracht heeft géén confirmatie** — trash-icon
   vuurt mutatie meteen. Elke andere destructive actie heeft wel dialog.
   `AssignmentCandidatesDataGrid.tsx:340-351`. → Confirm + Snackbar met undo.
4. **Native `window.alert` / `window.confirm`** voor status-changes,
   removal-failures, "Notitie-afbeelding verwijderen?" — overal MUI Dialogs
   maar deze niet. `assignments.tsx:330,386,414`,
   `network.tsx:1464,1609,1628,1639,1645,1657`. → Eén pattern (Snackbar of
   inline Alert).
5. **Server-side validatie wordt als één lange tekst-Alert getoond** in plaats
   van per-field via `setError`. Settings/password is de enige die het correct
   doet — kopieer dat patroon. `accounts.tsx:252-257`, `network.tsx:1227-1232`,
   `AssignmentFormDialog.tsx:442-450`, etc.
6. **Dashboard cards navigeren allemaal naar `/assignments`** zonder context.
   Klik op een lopende opdracht of kandidaat — je komt op de lijst, niets
   gehighlight, niets ge-expand. `dashboard.tsx:176,291,347`. → Pass
   `state: { assignmentUid: item.uid }` zoals account-detail al doet.
7. **AccountHeader chevron ook bij alleen-holding-logo** — als parent_logo
   gevuld is maar brand-logo niet, krijgt user "holding-logo › COMPANY NAAM
   (als h4)". Implicatie verwarrend. `AccountHeader.tsx:36-63`. → Chevron
   alleen bij **beide** logo's.
8. **AccountContactsCard "+"-knop is rood** — rood is destructief, niet
   "toevoegen". Geen ontkoppel-icon per regel. `AccountContactsCard.tsx:25-38`.
   → Neutrale/primaire kleur + per-regel unlink-IconButton.
9. **Kandidaten-filter en "Heeft gewerkt bij"-filter delen `WorkOutlineIcon`**
   + worden allebei primair-blauw als actief → visueel niet te onderscheiden.
   `network.tsx:2071-2088`. → Andere icoon voor één van beide.
10. **Filters niet in URL** — alleen `kandidaten` is URL-synced. Locatie /
    Leeftijd / Heeft-gewerkt-bij zijn local-state → niet deelbaar, niet
    bookmarkable. `network.tsx:513-529`.

## Rough edges

- Sidebar `variant="permanent"` zonder responsive collapse; geen hamburger op mobile (`AppSidebar.tsx:96-108`)
- Geen `fullScreen={isMobile}` op dialogs — contact-form (~30 fields) past niet op telefoon
- `helperText=" "` als layout-filler — inconsistent: accounts.tsx altijd, AssignmentFormDialog niet → form schiet op fout
- Form-validatie-mode inconsistent: meestal `onBlur`, maar `AssignmentFormDialog` is `onSubmit`
- Tab-label "Events" op een Nederlandse pagina (`account-detail.tsx:264`)
- Account-status indicator is alleen kleur (oranje/lichtoranje, lichtgroen/donkergroen) → kleurenblind onderscheidt niet; tooltip alleen op hover (geen touch/keyboard). `accounts.tsx:823-850`
- Candidate-status "Gebeld" gebruikt dezelfde groen als "Aangenomen" via fallback. Twee verschillende `getCandidateStatusColor`-helpers in repo. `types.ts:172-174` vs `account-detail.tsx:68-71`
- Brand-rood drie waarden: `#800400`, `#590d0d`, `#ef4444` (now-indicator agenda)
- `formatRevenue` heeft 3 verschillende presentaties voor zelfde waarde: `€1.5 mln` (lijst) / `1 mln` (header, geen €, afgerond) / `€15.000,00,-` (detail card — `,-` na `,00` is grammaticaal onjuist)
- Activity-type filter op account-detail: 9 chips, geen counts, geen "wissen", wrapt vreemd. `account-detail.tsx:298-366`
- Dashboard query-error toont één regel caption zonder retry-button. Geen page heeft een retry. `dashboard.tsx:143-147`
- "Bezig…" knop-label zonder spinner (behalve in CompanyDetailsCard). Inconsistent.
- Delete-confirmation dialogs zijn op 3 verschillende manieren gestyled. → extract `<ConfirmDeleteDialog subject={...}>` component
- `AssignmentExpandedContent` candidates-grid heeft `height: calc(100vh - 200px)` in een card → kaart hoger dan viewport
- `AddActivityDialog`-template overschrijft user-edited description bij type-change zonder waarschuwing
- Account-status filter chip toont raw dropdown-value (`"fmcg"`) i.p.v. label (`"FMCG"`)
- Outlook iCal-sync dialog toont URL zonder waarschuwing dat link = volledige agenda-toegang
- Polish: "Selecteer alle (12)" / "Deselecteer alles" grammaticaal niet consistent

## Misdiagnose-correctie: "Interimmer-filter broken"

De UI/UX-agent meldt dit als "feature broken". Wij hebben vorige sessie
specifiek gefixt dat we matchen op `"interimmer"` (DB-waarde, geverifieerd via
`php artisan tinker`). Wat **wél** een echt issue is: de hardcoded fallback-list
in `network.tsx:108` zegt `value: "interim"` (oude waarde), en
`network.tsx:1033` filtert kandidaten op `"candidate"` terwijl DB `"kandidaat"`
gebruikt. Als een tenant ooit start zonder geseede dropdown-opties valt de
fallback in en breekt het. → één regel changes, lage prio.

---

# Wat Al Goed Staat

- **Multi-tenant isolatie** is structureel goed: database-per-tenant via
  Spatie, custom `SwitchTenantCacheTask` voor cache-prefix-isolatie,
  `queues_are_tenant_aware_by_default = true`. Dit is de sterkste verdediging
  in de codebase — zelfs waar policies ontbreken kan een query simpelweg geen
  andere tenant zien.
- **`AssignmentStatus` consolidatie** uit de mei-audit is doorgevoerd en
  consistent gebruikt
- **ULIDs als public identifiers** overal — enumeration is geen aanvalsklasse
  meer
- **Mass-assignment beschermd**: elke model heeft expliciete `$fillable`, geen
  `$guarded = []`
- **Alle raw SQL gebruikt parameter-binding** — geen string-interpolatie van
  user-input
- **TanStack Query architectuur** is clean: per-resource files,
  gecentraliseerde `queryKeys`, `staleTime`/`gcTime` defaults, correcte
  invalidatie
- **Axios client** centralizeert tenant-subdomain-resolutie, 401-handling,
  Auth-header-injection
- **RHF + Zod is de standaard** voor forms; gedeelde `ClassificationFields` is
  precies juist scope
- **AssignmentCard en expanded content correct memo-ized**
- **ImportProgressContext** persisteert progress over reloads — slimme UX
- **Login throttle** is goed ontworpen (per IP én per IP+email)
- **R2 uploads default `'private'`** + signed URLs in de meeste paden
- **Sanctum tokens model gebruikt `UsesTenantConnection`** correct →
  PAT-issuance/revocation hit de juiste DB
- **Trust-proxy headers voor Cloudflare** correct geconfigureerd
- **Cloudflare Origin Certificates** 15 jaar geldig gedocumenteerd
- **nginx**: `client_max_body_size 50M`, HTTP→HTTPS redirect, www→apex
  redirect, TLS 1.2+1.3 only

---

# Aanbevolen Roadmap

## Deze week (2–3 dagen werk)

1. Roteer secrets uit `DEPLOYMENT_STAPPEN.md` + scrub het bestand
2. Verwijder `withoutMiddleware('auth:sanctum')` op role-profile download
3. Voeg `tenants:migrate --force` toe aan `deploy.sh`
4. Strip `Log::info` PII (LoginController, RegisterTenantController, ContactDocumentController, Gate-definitie)
5. Voeg Sentry toe (backend + frontend ErrorBoundary)
6. Zet Forge daily DB-backups aan + test één restore
7. Wis `console.log` met PII uit frontend
8. Gate `ReactQueryDevtools` op `import.meta.env.DEV`

## Twee tot vier weken

9. CI workflow toevoegen (`composer audit`, `npm audit`, `tsc`, `lint`, `php artisan test`)
10. Authorization-gaten dichten — policies voor de 6 ongated controllers
11. `TenantListController` vervangen door landlord-index
12. Sync geocoding naar queued job; rate-limit `/geocode`
13. Excel-import async maken (mirror CV-import pattern)
14. Code-splitting in router (`React.lazy`) + `manualChunks`
15. N+1's in ContactController/AccountController/AssignmentController index fixen
16. `cv:check-batches` duplicaat opruimen
17. `QUEUE_CONNECTION=redis` + `MAIL_MAILER=resend`

## Een kwartaal

18. Test coverage opbouwen (CRUD + auth + tenant-isolatie)
19. Top 5 UI/UX flaws fixen (alert/confirm naar Snackbar, ConfirmDeleteDialog, server-validation per veld, dashboard deep-links, brand-rood unification)
20. `network.tsx` / `settings.tsx` / `assignments.tsx` / `AssignmentFormDialog.tsx` opsplitsen
21. TS `strictNullChecks` + `noImplicitAny` aanzetten en fixen
22. Email-verificatie bij tenant-registratie
23. Calendar feed tokens hashen + rate-limit

---

# Eindbeoordeling

Als bovenstaande staat is dit een normaal volwassen SaaS. De multi-tenant
fundering is al uitstekend, dus het meeste werk zit in **operationele
maturity** (monitoring, backups, CI, tests) en in het dichten van een
verzameling kleinere security/authz-gaten die individueel klein zijn maar
collectief incident-risico vormen.

De kritische blokkers zijn allemaal binnen een week haalbaar door één
ontwikkelaar. Daarna is het ~4 weken focused werk voor de High-lijst, en een
kwartaal voor de Medium-cleanup en UI/UX-polish.
