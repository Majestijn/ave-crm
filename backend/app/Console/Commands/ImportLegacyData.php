<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Database\Seeders\DropdownOptionSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Importeert de geëxporteerde legacy-data (JSON uit het oude `public`-schema)
 * in de tenant-database. Interne ID's worden vers toegekend door de DB; de
 * relaties worden hersteld via old_id→new_id-maps. ULIDs (`uid`) blijven behouden.
 *
 * Draai dit ná een fresh migrate van de tenant-DB. Zie de runbook in
 * docs/legacy-import.md voor de volledige productie-procedure.
 */
class ImportLegacyData extends Command
{
    protected $signature = 'legacy:import
                            {--tenant= : Tenant id, uid of slug (verplicht bij meerdere tenants)}
                            {--path= : Map met de JSON-exports (default: storage/app/legacy_import)}
                            {--with-dropdowns : Seed ook de canonieke dropdown-opties}
                            {--force : Sla de bevestiging en de lege-tabellen-check over}';

    protected $description = 'Importeer geëxporteerde legacy-data (JSON) in een tenant-database onder verse ID\'s';

    /** Oude (Engelse) opdracht-statussen → huidige NL dropdown-waarden. */
    private const STATUS_MAP = [
        'active' => '1e_contact_moment',
        'hired' => 'aangenomen',
        'shadow_management' => 'schaduwmanagement',
    ];

    public function handle(): int
    {
        $tenant = $this->resolveTenant($this->option('tenant'));
        if (! $tenant) {
            return self::FAILURE;
        }

        $path = rtrim($this->option('path') ?: storage_path('app/legacy_import'), '/');
        if (! is_dir($path)) {
            $this->error("Map niet gevonden: {$path}");
            return self::FAILURE;
        }

        $this->info("Tenant : {$tenant->name} (id: {$tenant->id}, db: {$tenant->database})");
        $this->info("Bron   : {$path}");

        if ($this->getLaravel()->isProduction() && ! $this->option('force')) {
            if (! $this->confirm('Je draait in PRODUCTION. Doorgaan met de legacy-import?')) {
                $this->warn('Geannuleerd.');
                return self::FAILURE;
            }
        }

        $tenant->makeCurrent();
        $db = DB::connection('tenant');

        // Veiligheidsguard: voorkom dubbele import in een niet-lege tenant.
        if (! $this->option('force')) {
            foreach (['users', 'accounts', 'contacts'] as $table) {
                if ($db->table($table)->count() > 0) {
                    $this->error("Tabel `{$table}` is niet leeg. Draai eerst een fresh migrate, of gebruik --force.");
                    return self::FAILURE;
                }
            }
        }

        try {
            $files = $this->locateFiles($path);
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());
            return self::FAILURE;
        }

        $counts = [];

        try {
            $db->transaction(function () use ($db, $files, &$counts) {
                if ($this->option('with-dropdowns')) {
                    $counts['dropdown_options'] = DropdownOptionSeeder::seed();
                }

                $userMap = $this->importUsers($db, $files['users']);
                $accountMap = $this->importAccounts($db, $files['accounts']);
                $contactMap = $this->importContacts($db, $files['contacts']);

                $counts['users'] = count($userMap);
                $counts['accounts'] = count($accountMap);
                $counts['contacts'] = count($contactMap);
                $counts['assignments'] = $this->importAssignments($db, $files['assignments'], $accountMap, $userMap);
                $counts['account_contacts'] = $this->importAccountContacts($db, $files['account_contacts'], $accountMap, $contactMap);
                $counts['contact_work_experiences'] = $this->importWorkExperiences($db, $files['work_experiences'], $contactMap);
            });
        } catch (\Throwable $e) {
            $this->error('Import mislukt en teruggedraaid: ' . $e->getMessage());
            return self::FAILURE;
        }

        $this->newLine();
        $this->info('✅ Import voltooid (transactie gecommit).');
        $this->table(['Tabel', 'Rijen'], collect($counts)->map(fn ($n, $t) => [$t, $n])->values()->all());

        return self::SUCCESS;
    }

    private function resolveTenant(?string $identifier): ?Tenant
    {
        if ($identifier === null || $identifier === '') {
            $tenants = Tenant::all();
            if ($tenants->count() === 1) {
                return $tenants->first();
            }
            $this->error('Geef --tenant op (meerdere of geen tenants gevonden).');
            $tenants->each(fn (Tenant $t) => $this->line("  - id={$t->id} uid={$t->uid} slug={$t->slug}"));
            return null;
        }

        $tenant = is_numeric($identifier)
            ? Tenant::find((int) $identifier)
            : Tenant::where('uid', $identifier)->orWhere('slug', $identifier)->first();

        if (! $tenant) {
            $this->error("Tenant niet gevonden voor: {$identifier}");
        }

        return $tenant;
    }

    /**
     * @return array<string, string> map van entiteit → bestandspad
     */
    private function locateFiles(string $path): array
    {
        $patterns = [
            'users' => 'public_users_export_*.json',
            'accounts' => 'public_accounts_export_*.json',
            'contacts' => 'public_contacts_export_*.json',
            'assignments' => 'public_assignments_export_*.json',
            'account_contacts' => 'public_account_contacts_export_*.json',
            'work_experiences' => 'public_contact_work_experiences_export_*.json',
        ];

        $files = [];
        foreach ($patterns as $key => $glob) {
            $matches = glob("{$path}/{$glob}");
            if (! $matches) {
                throw new RuntimeException("Geen bestand gevonden voor `{$key}` (patroon: {$glob}).");
            }
            sort($matches);
            $files[$key] = end($matches); // nieuwste timestamp wint
        }

        return $files;
    }

    /** @return array<string, mixed> */
    private function readJson(string $file): array
    {
        $data = json_decode((string) file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($data)) {
            throw new RuntimeException("Ongeldige JSON in {$file}");
        }
        return $data;
    }

    /** @return array<string,int> old_id → new_id */
    private function importUsers(\Illuminate\Database\Connection $db, string $file): array
    {
        $map = [];
        foreach ($this->readJson($file) as $u) {
            $map[(string) $u['id']] = $db->table('users')->insertGetId([
                'uid' => $u['uid'],
                'name' => $u['name'],
                'email' => $u['email'],
                'password' => $u['password'],
                'role' => $u['role'],
                'calendar_token' => $u['calendar_token'] ?? null,
                'email_verified_at' => $u['email_verified_at'] ?? null,
                'remember_token' => $u['remember_token'] ?? null,
                'created_at' => $u['created_at'] ?? null,
                'updated_at' => $u['updated_at'] ?? null,
            ]);
        }
        return $map;
    }

    /** @return array<string,int> old_id → new_id */
    private function importAccounts(\Illuminate\Database\Connection $db, string $file): array
    {
        $map = [];
        foreach ($this->readJson($file) as $a) {
            $map[(string) $a['id']] = $db->table('accounts')->insertGetId([
                'uid' => $a['uid'],
                'name' => $a['name'],
                'logo_url' => $a['logo_url'] ?? null,
                'location' => $a['location'] ?? null,
                'website' => $a['website'] ?? null,
                'phone' => $a['phone'] ?? null,
                'industry' => $a['industry'] ?? null,
                'category' => $a['category'] ?? null,
                'secondary_category' => $a['secondary_category'] ?? null,
                'tertiary_category' => $this->jsonOrNull($a['tertiary_category'] ?? null),
                'merken' => $this->jsonOrNull($a['merken'] ?? null),
                'labels' => $this->jsonOrNull($a['labels'] ?? null),
                'fte_count' => $this->intOrNull($a['fte_count'] ?? null),
                'revenue_cents' => $this->intOrNull($a['revenue_cents'] ?? null),
                'notes' => $a['notes'] ?? null,
                'sales_target' => $this->toJsonArray($a['sales_target'] ?? null),
                'client_status' => $a['client_status'] ?? null,
                'created_at' => $a['created_at'] ?? null,
                'updated_at' => $a['updated_at'] ?? null,
                'deleted_at' => $a['deleted_at'] ?? null,
            ]);
        }
        return $map;
    }

    /** @return array<string,int> old_id → new_id */
    private function importContacts(\Illuminate\Database\Connection $db, string $file): array
    {
        $map = [];
        foreach ($this->readJson($file) as $c) {
            // `current_salary_cents` bestaat niet meer in het schema (was overal null) → vervalt.
            $map[(string) $c['id']] = $db->table('contacts')->insertGetId([
                'uid' => $c['uid'],
                'first_name' => $c['first_name'],
                'prefix' => $c['prefix'] ?? null,
                'last_name' => $c['last_name'],
                'date_of_birth' => $c['date_of_birth'] ?? null,
                'gender' => $c['gender'] ?? null,
                'email' => $c['email'] ?? null,
                'phone' => $c['phone'] ?? null,
                'location' => $c['location'] ?? null,
                'latitude' => $c['latitude'] ?? null,
                'longitude' => $c['longitude'] ?? null,
                'current_company' => $c['current_company'] ?? null,
                'company_role' => $c['company_role'] ?? null,
                'network_roles' => $this->jsonOrNull($c['network_roles'] ?? null),
                'education' => $c['education'] ?? null,
                'availability_date' => $c['availability_date'] ?? null,
                'linkedin_url' => $c['linkedin_url'] ?? null,
                'notes' => $c['notes'] ?? null,
                'created_at' => $c['created_at'] ?? null,
                'updated_at' => $c['updated_at'] ?? null,
                'deleted_at' => $c['deleted_at'] ?? null,
            ]);
        }
        return $map;
    }

    /**
     * @param array<string,int> $accountMap
     * @param array<string,int> $userMap
     */
    private function importAssignments(\Illuminate\Database\Connection $db, string $file, array $accountMap, array $userMap): int
    {
        $n = 0;
        foreach ($this->readJson($file) as $a) {
            $recruiterId = isset($a['recruiter_id']) && $a['recruiter_id'] !== null
                ? $this->mapId($userMap, $a['recruiter_id'], 'recruiter (users)')
                : null;

            $db->table('assignments')->insert([
                'uid' => $a['uid'],
                'account_id' => $this->mapId($accountMap, $a['account_id'], 'account'),
                'recruiter_id' => $recruiterId,
                'title' => $a['title'],
                'description' => $a['description'] ?? null,
                'status' => self::STATUS_MAP[$a['status']] ?? $a['status'],
                'salary_min' => $this->intOrNull($a['salary_min'] ?? null),
                'salary_max' => $this->intOrNull($a['salary_max'] ?? null),
                'vacation_days' => $this->intOrNull($a['vacation_days'] ?? null),
                'bonus_percentage' => $a['bonus_percentage'] ?? null,
                'location' => $a['location'] ?? null,
                'employment_type' => $a['employment_type'] ?? null,
                'start_date' => $a['start_date'] ?? null,
                'benefits' => $this->jsonOrNull($a['benefits'] ?? null),
                'notes_image_path' => $a['notes_image_path'] ?? null,
                'created_at' => $a['created_at'] ?? null,
                'updated_at' => $a['updated_at'] ?? null,
                'deleted_at' => $a['deleted_at'] ?? null,
            ]);
            $n++;
        }
        return $n;
    }

    /**
     * @param array<string,int> $accountMap
     * @param array<string,int> $contactMap
     */
    private function importAccountContacts(\Illuminate\Database\Connection $db, string $file, array $accountMap, array $contactMap): int
    {
        $n = 0;
        foreach ($this->readJson($file) as $r) {
            $db->table('account_contacts')->insert([
                'account_id' => $this->mapId($accountMap, $r['account_id'], 'account'),
                'contact_id' => $this->mapId($contactMap, $r['contact_id'], 'contact'),
                'created_at' => $r['created_at'] ?? null,
                'updated_at' => $r['updated_at'] ?? null,
                'deleted_at' => $r['deleted_at'] ?? null,
            ]);
            $n++;
        }
        return $n;
    }

    /** @param array<string,int> $contactMap */
    private function importWorkExperiences(\Illuminate\Database\Connection $db, string $file, array $contactMap): int
    {
        $n = 0;
        foreach ($this->readJson($file) as $w) {
            $db->table('contact_work_experiences')->insert([
                'contact_id' => $this->mapId($contactMap, $w['contact_id'], 'contact'),
                'job_title' => $w['job_title'],
                'company_name' => $w['company_name'],
                'start_date' => $w['start_date'],
                'end_date' => $w['end_date'] ?? null,
                'location' => $w['location'] ?? null,
                'description' => $w['description'] ?? null,
                'sort_order' => $this->intOrNull($w['sort_order'] ?? 0) ?? 0,
                'created_at' => $w['created_at'] ?? null,
                'updated_at' => $w['updated_at'] ?? null,
            ]);
            $n++;
        }
        return $n;
    }

    /** @param array<string,int> $map */
    private function mapId(array $map, mixed $oldId, string $what): int
    {
        $key = (string) $oldId;
        if (! array_key_exists($key, $map)) {
            throw new RuntimeException("Onbekende {$what}-referentie (old id: {$key}); export is niet consistent.");
        }
        return $map[$key];
    }

    private function intOrNull(mixed $v): ?int
    {
        return $v === null || $v === '' ? null : (int) $v;
    }

    /** JSON-kolom: array/null → JSON-string of null (query builder encodeert niet zelf). */
    private function jsonOrNull(mixed $v): ?string
    {
        return $v === null ? null : json_encode($v);
    }

    /** Oude `sales_target` was een losse string; schema verwacht een JSON-array. */
    private function toJsonArray(mixed $v): ?string
    {
        if ($v === null || $v === '') {
            return null;
        }
        return json_encode(is_array($v) ? $v : [$v]);
    }
}
