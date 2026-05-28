# Legacy-data import (productie)

Procedure om de geëxporteerde data uit het oude `public`-schema (JSON) terug te
zetten in een **tenant-database** op productie (Laravel Forge), onder verse ID's.

De import draait via de Artisan-command `legacy:import`. Interne `id`'s worden
vers toegekend door de database (starten bij 1); relaties worden hersteld via
`old_id → new_id`-maps. ULIDs (`uid`) blijven behouden.

> Geverifieerd met een lokale generale repetitie (fresh migrate + import):
> alle rij-aantallen en alle uid-relaties (assignments, account_contacts)
> kwamen 1-op-1 overeen met de export.

---

## Wat de command doet

`php artisan legacy:import` (zie `app/Console/Commands/ImportLegacyData.php`):

- Schakelt naar de opgegeven tenant en draait in **één transactie** (rollback bij elke fout).
- **Guard:** weigert te draaien als `users`/`accounts`/`contacts` niet leeg zijn (tenzij `--force`) → voorkomt dubbele import.
- Importeert in volgorde: `users → accounts → contacts → assignments → account_contacts → contact_work_experiences`.
- Transformaties t.o.v. de export van 30-03-2026:
  - `sales_target` (losse string) → JSON-array (`"Inkoop"` → `["Inkoop"]`)
  - opdracht-status hermapt naar de NL-dropdown: `active → 1e_contact_moment`, `hired → aangenomen`, `shadow_management → schaduwmanagement`
  - `current_salary_cents` vervalt (bestaat niet meer in het schema; was overal leeg)
- `--with-dropdowns` seedt eerst de canonieke dropdown-set (`DropdownOptionSeeder::seed()`).

### Opties

| Optie | Betekenis |
|---|---|
| `--tenant=` | Tenant id, uid of slug. Verplicht bij meerdere tenants. |
| `--path=` | Map met de JSON-exports. Default: `storage/app/legacy_import`. |
| `--with-dropdowns` | Seed ook de canonieke dropdown-opties. |
| `--force` | Sla de productie-bevestiging én de lege-tabellen-guard over (nodig voor non-interactieve runs op productie). |

---

## ⚠️ Vooraf

- **`migrate:fresh` wist de hele tenant-database onomkeerbaar** — sessies en API-tokens incl. (iedereen wordt uitgelogd).
- **Na de import zijn de inloggegevens de oude** uit de export (bv. `stijn@aveconsult.nl` met het oude wachtwoord). De via registratie aangemaakte admin verdwijnt door de fresh migrate.
- De tenant-registratie zelf staat in de **landlord-DB** (`avecrm`) en blijft intact; we fresh-migraten alleen de tenant-DB.
- `assignment_contact` (kandidaat-pipeline) zit **niet** in de export → blijft leeg.
- De JSON-exports bevatten **PII + wachtwoord-hashes**: nooit in git committen (`/old_data` staat in `.gitignore`); upload los via `scp`.

---

## Stappen op de Forge-server

```bash
# 0. Deploy de nieuwe code (command + seeder) naar productie:
#    merge naar main → Forge → "Deploy Now".

# 1. Upload de JSON-exports los naar de gedeelde storage (NIET via git):
scp old_data/*.json forge@SERVER_IP:/home/forge/avecrm.nl/shared/storage/app/legacy_import/

# 2. SSH erin en bepaal de tenant (id + db-naam):
ssh forge@SERVER_IP
cd /home/forge/avecrm.nl/current/backend
php artisan tinker --execute="App\Models\Tenant::all(['id','name','slug','database'])->each(fn(\$t)=>print(\"{\$t->id} {\$t->name} {\$t->database}\n\"));"

# 3. BACKUP (verplicht) — tenant-DB én landlord:
pg_dump -U forge -h 127.0.0.1 tenant_<slug> > ~/backup_tenant_$(date +%F_%H%M).sql
pg_dump -U forge -h 127.0.0.1 avecrm        > ~/backup_landlord_$(date +%F_%H%M).sql

# 4. Onderhoudsmodus aan:
php artisan down

# 5. Fresh migrate ALLEEN deze tenant:
php artisan tenants:artisan "migrate:fresh --path=database/migrations/tenant --database=tenant --force" --tenant=<TENANT_ID>

# 6. Importeer legacy-data + dropdowns (non-interactief):
php artisan legacy:import --tenant=<TENANT_ID> --with-dropdowns --force

# 7. Controleer de rij-aantallen die de command print, dan:
php artisan up
php artisan queue:restart
```

### Verwachte rij-aantallen (export 30-03-2026)

| dropdown_options | users | accounts | contacts | assignments | account_contacts | contact_work_experiences |
|---|---|---|---|---|---|---|
| 108 | 4 | 29 | 84 | 18 | 7 | 10 |

---

## Terugrollen

Mislukt de import, dan rolt de transactie zichzelf terug (geen halve import).
Is de fresh migrate al gedraaid en wil je terug naar de uitgangssituatie:

```bash
psql -U forge -h 127.0.0.1 -d tenant_<slug> < ~/backup_tenant_<timestamp>.sql
php artisan up
```
