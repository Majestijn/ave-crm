<?php

namespace App\Console\Commands;

use App\Models\Account;
use App\Models\Assignment;
use App\Models\Contact;
use App\Models\DropdownOption;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class SeedAccountsAndAssignments extends Command
{
    protected $signature = 'demo:seed-accounts
                            {--tenant= : Tenant ID to seed (default: all tenants)}
                            {--accounts=10 : Number of accounts to create}
                            {--assignments=50 : Number of assignments to create}
                            {--contacts=1000 : Number of contacts to create}';

    protected $description = 'Zet demo dropdown-opties (export CSV + salesdoelen) in de tenant-DB, daarna demo: klanten, opdrachten en contacten';

    private array $companyNames = [
        'Albert Heijn',
        'Jumbo Supermarkten',
        'Lidl Nederland',
        'Plus Retail',
        'Aldi Nederland',
        'Spar Nederland',
        'Dirk van den Broek',
        'Deen Supermarkten',
        'Jan Linders',
        'Hoogvliet',
        'Vomar',
        'Boni Supermarkten',
        'Dekamarkt',
        'Poiesz Supermarkten',
        'MCD Supermarkten',
    ];

    // private array $categories = ['FMCG', 'Foodservice', 'Overig'];

    // private array $secondaryCategories = ['Retailer', 'Supermarkten', 'Groothandel', 'Leverancier', 'Industrie', 'Andere'];

    // private array $tertiaryCategories = ['Non-food', 'Food'];

    // private array $merkenOptions = ['Merk', 'Private label'];

    // private array $labelsOptions = [
    //     'Vers',
    //     'Zuivel & eieren',
    //     'Diepvries',
    //     'DKW (houdbaar voedsel)',
    //     'Dranken',
    //     'Snacks & snoep',
    //     'Non-food',
    //     'Verpakkingen',
    //     'Convenience & ready-to-use',
    // ];

    private array $assignmentTitles = [
        'Senior Product Manager',
        'Key Account Manager FMCG',
        'Sales Representative',
        'Category Manager',
        'Marketing Manager',
        'Logistics Coordinator',
        'Account Executive',
        'Business Development Manager',
        'Territory Sales Manager',
        'National Account Manager',
        'Procurement Specialist',
        'Brand Manager',
        'Retail Merchandiser',
        'Food Service Account Manager',
        'Supply Chain Manager',
    ];

    private array $clientStatuses = ['potential', 'potential_first_assignment', 'new_client', 'active_client', 'active_client', 'active_client', 'inactive', 'lost'];

    private array $prefixes = ['van', 'de', 'van de', 'van den', 'van der', null, null, null];

    public function handle(): int
    {
        $tenantId = $this->option('tenant');
        $numAccounts = (int) $this->option('accounts');
        $numAssignments = (int) $this->option('assignments');
        $numContacts = (int) $this->option('contacts');

        $tenants = $tenantId
            ? Tenant::where('id', $tenantId)->get()
            : Tenant::all();

        if ($tenants->isEmpty()) {
            $this->error('Geen tenants gevonden.');
            return 1;
        }

        foreach ($tenants as $tenant) {
            $this->info("Seeding tenant: {$tenant->name} (id: {$tenant->id})");
            $tenant->makeCurrent();

            $imported = $this->seedDemoDropdownOptions();
            if ($imported > 0) {
                $this->info("  -> {$imported} dropdown-opties gesynchroniseerd (demo-set).");
            }

            $users = $this->seedUsers();
            $accounts = $this->seedAccounts($numAccounts);
            $this->seedAssignments($accounts, $numAssignments, $users);
            $this->seedContacts($numContacts);

            $this->info("  ✓ " . count($users) . " gebruikers, {$numAccounts} klanten, {$numAssignments} opdrachten en {$numContacts} contacten aangemaakt.");
        }

        return 0;
    }

    private function seedAccounts(int $count): array
    {
        $accounts = [];
        $usedNames = [];
        $faker = \Faker\Factory::create('nl_NL');
        $catPool = $this->activeOptionValues('account_category');
        $secPool = $this->activeOptionValues('account_secondary_category');
        $terPool = $this->activeOptionValues('account_tertiary_category');
        $brandPool = $this->activeOptionValues('account_brand');
        $labelPool = $this->activeOptionValues('account_label');
        $salesTargetPool = $this->activeOptionValues('sales_target');

        for ($i = 0; $i < $count; $i++) {
            $name = $this->pickUnique($this->companyNames, $usedNames);
            $usedNames[] = $name;

            $tertiaryPick = $this->randomSubset($terPool, 0, 2);
            $merkenPick = $this->randomSubset($brandPool, 0, 2);
            $labelsPick = $this->randomSubset($labelPool, count($labelPool) > 0 ? 1 : 0, min(4, max(1, count($labelPool))));

            $accounts[] = Account::create([
                'name' => $name,
                'parent_company' => $faker->optional(0.25)->company(),
                'location' => $this->randomLocation(),
                'website' => 'https://www.' . Str::slug($name) . '.nl',
                'phone' => $this->randomPhone(),
                'industry' => 'Retail / Food',
                'category' => $this->randomFromPool($catPool, 'andere'),
                'secondary_category' => $this->optionalRandomElement($faker, 0.7, $secPool),
                'tertiary_category' => $tertiaryPick,
                'merken' => $merkenPick,
                'labels' => $labelsPick,
                'fte_count' => rand(50, 5000),
                'revenue_cents' => rand(1_000_000, 500_000_000) * 100, // 1M - 500M euro
                'notes' => null,
                'client_status' => $this->clientStatuses[array_rand($this->clientStatuses)],
                'sales_target' => $this->randomSubset($salesTargetPool, 0, 3),
            ]);
        }

        return $accounts;
    }

    private function seedUsers(): array
    {
        $aveconsultPassword = 'Aveconsult1!';

        /** @var list<array{name: string, email: string, role: string, password?: string}> */
        $seedUsers = [
            ['name' => 'Info', 'email' => 'info@aveconsult.nl', 'role' => 'owner', 'password' => $aveconsultPassword],
            ['name' => 'Admin', 'email' => 'admin@aveconsult.nl', 'role' => 'owner', 'password' => $aveconsultPassword],
            ['name' => 'Jack', 'email' => 'jack@aveconsult.nl', 'role' => 'management', 'password' => $aveconsultPassword],
            ['name' => 'Stijn', 'email' => 'stijn@aveconsult.nl', 'role' => 'admin', 'password' => $aveconsultPassword],
            ['name' => 'Pieter de Vries', 'email' => 'pieter@demo.nl', 'role' => 'admin'],
            ['name' => 'Sophie Bakker', 'email' => 'sophie@demo.nl', 'role' => 'management'],
            ['name' => 'Jan Jansen', 'email' => 'jan@demo.nl', 'role' => 'recruiter'],
            ['name' => 'Lisa van Dijk', 'email' => 'lisa@demo.nl', 'role' => 'recruiter'],
            ['name' => 'Tom Hendriks', 'email' => 'tom@demo.nl', 'role' => 'recruiter'],
            ['name' => 'Emma Visser', 'email' => 'emma@demo.nl', 'role' => 'recruiter'],
            ['name' => 'Mark de Boer', 'email' => 'mark@demo.nl', 'role' => 'viewer'],
        ];

        $users = [];
        foreach ($seedUsers as $u) {
            if ($existing = User::where('email', $u['email'])->first()) {
                $users[] = $existing;
                continue;
            }
            $users[] = User::create([
                'name' => $u['name'],
                'email' => $u['email'],
                'password' => bcrypt($u['password'] ?? 'password'),
                'role' => $u['role'],
            ]);
        }

        return $users;
    }

    private function seedAssignments(array $accounts, int $count, array $users): void
    {
        $recruiterUsers = array_values(array_filter($users, fn($u) => in_array($u->role, ['recruiter', 'admin', 'management'])));
        $statusPool = $this->activeOptionValues('assignment_status');
        $employmentPool = $this->activeOptionValues('employment_type');
        $benefitPool = $this->activeOptionValues('benefit');

        for ($i = 0; $i < $count; $i++) {
            $account = $accounts[array_rand($accounts)];

            $leadRecruiter = !empty($recruiterUsers) ? $recruiterUsers[array_rand($recruiterUsers)] : null;

            $assignment = Assignment::create([
                'account_id' => $account->id,
                'recruiter_id' => $leadRecruiter?->id,
                'title' => $this->assignmentTitles[array_rand($this->assignmentTitles)],
                'description' => "Opdracht voor {$account->name}. Verantwoordelijk voor de dagelijkse operatie en groei.",
                'status' => $this->randomFromPool($statusPool, '1e_contact_moment'),
                'salary_min' => rand(40000, 70000),
                'salary_max' => rand(70000, 120000),
                'vacation_days' => rand(24, 36),
                'location' => $this->randomLocation(),
                'employment_type' => $this->randomFromPool($employmentPool, 'fulltime'),
                'benefits' => count($benefitPool) > 0
                    ? $this->randomSubset($benefitPool, 0, min(6, count($benefitPool)))
                    : null,
            ]);

            if (count($recruiterUsers) > 1 && rand(1, 3) <= 2) {
                $availableSecondary = array_filter($recruiterUsers, fn($u) => !$leadRecruiter || $u->id !== $leadRecruiter->id);
                if (!empty($availableSecondary)) {
                    $numSecondary = rand(1, min(3, count($availableSecondary)));
                    $shuffled = $availableSecondary;
                    shuffle($shuffled);
                    $secondaryIds = array_map(fn($u) => $u->id, array_slice($shuffled, 0, $numSecondary));
                    $assignment->secondaryRecruiters()->attach($secondaryIds);
                }
            }
        }
    }

    private function randomSubset(array $options, int $minCount, int $maxCount): array
    {
        $n = count($options);
        if ($n === 0) {
            return [];
        }
        $hi = min($maxCount, $n);
        $lo = min($minCount, $hi);
        $count = rand($lo, $hi);
        if ($count === 0) {
            return [];
        }
        $shuffled = $options;
        shuffle($shuffled);
        return array_slice($shuffled, 0, $count);
    }

    /**
     * Zelfde inhoud als database/seeders/data/public_dropdown_options_export.csv (hardcoded),
     * plus sales_target (niet in die export) inclusief Category Management,
     * en client_status (nodig voor validatie op klanten; stond niet in die CSV-export).
     *
     * @return int Aantal upserts
     */
    private function seedDemoDropdownOptions(): int
    {
        $imported = 0;

        foreach ($this->demoDropdownOptionDefinitions() as $row) {
            DropdownOption::updateOrCreate(
                ['type' => $row['type'], 'value' => $row['value']],
                [
                    'label' => $row['label'],
                    'color' => $row['color'],
                    'sort_order' => $row['sort_order'],
                    'is_active' => $row['is_active'],
                ]
            );
            $imported++;
        }

        return $imported;
    }

    /**
     * @return list<array{type: string, value: string, label: string, color: ?string, sort_order: int, is_active: bool}>
     */
    private function demoDropdownOptionDefinitions(): array
    {
        return array_merge(
            [
                ['type' => 'education', 'value' => 'mbo', 'label' => 'Mbo', 'color' => null, 'sort_order' => 0, 'is_active' => true],
                ['type' => 'education', 'value' => 'hbo', 'label' => 'Hbo', 'color' => null, 'sort_order' => 1, 'is_active' => true],
                ['type' => 'education', 'value' => 'uni', 'label' => 'Uni', 'color' => null, 'sort_order' => 2, 'is_active' => true],
                ['type' => 'account_category', 'value' => 'fmcg', 'label' => 'FMCG', 'color' => null, 'sort_order' => 0, 'is_active' => true],
                ['type' => 'account_category', 'value' => 'foodservice', 'label' => 'Foodservice', 'color' => null, 'sort_order' => 1, 'is_active' => true],
                ['type' => 'account_category', 'value' => 'andere', 'label' => 'Andere', 'color' => null, 'sort_order' => 2, 'is_active' => true],
                ['type' => 'account_secondary_category', 'value' => 'retailer', 'label' => 'Retailer', 'color' => null, 'sort_order' => 0, 'is_active' => true],
                ['type' => 'account_secondary_category', 'value' => 'groothandel', 'label' => 'Groothandel', 'color' => null, 'sort_order' => 1, 'is_active' => true],
                ['type' => 'account_secondary_category', 'value' => 'leverancier', 'label' => 'Leverancier', 'color' => null, 'sort_order' => 2, 'is_active' => true],
                ['type' => 'account_secondary_category', 'value' => 'industrie', 'label' => 'Industrie', 'color' => null, 'sort_order' => 3, 'is_active' => true],
                ['type' => 'account_secondary_category', 'value' => 'andere', 'label' => 'Andere', 'color' => null, 'sort_order' => 4, 'is_active' => true],
                ['type' => 'account_tertiary_category', 'value' => 'non_food', 'label' => 'Non-food', 'color' => null, 'sort_order' => 0, 'is_active' => true],
                ['type' => 'account_tertiary_category', 'value' => 'food', 'label' => 'Food', 'color' => null, 'sort_order' => 1, 'is_active' => true],
                ['type' => 'account_brand', 'value' => 'merk', 'label' => 'Merk', 'color' => null, 'sort_order' => 0, 'is_active' => true],
                ['type' => 'account_brand', 'value' => 'private_label', 'label' => 'Private label', 'color' => null, 'sort_order' => 1, 'is_active' => true],
                ['type' => 'account_label', 'value' => 'vers', 'label' => 'Vers', 'color' => null, 'sort_order' => 0, 'is_active' => true],
                ['type' => 'account_label', 'value' => 'zuivel_eieren', 'label' => 'Zuivel & eieren', 'color' => null, 'sort_order' => 1, 'is_active' => true],
                ['type' => 'account_label', 'value' => 'diepvries', 'label' => 'Diepvries', 'color' => null, 'sort_order' => 2, 'is_active' => true],
                ['type' => 'account_label', 'value' => 'dkw_houdbaar_voedsel', 'label' => 'DKW (houdbaar voedsel)', 'color' => null, 'sort_order' => 3, 'is_active' => true],
                ['type' => 'account_label', 'value' => 'dranken', 'label' => 'Dranken', 'color' => null, 'sort_order' => 4, 'is_active' => true],
                ['type' => 'account_label', 'value' => 'snacks_snoep', 'label' => 'Snacks & snoep', 'color' => null, 'sort_order' => 5, 'is_active' => true],
                ['type' => 'account_label', 'value' => 'non_food', 'label' => 'Non-food', 'color' => null, 'sort_order' => 6, 'is_active' => true],
                ['type' => 'account_label', 'value' => 'verpakkingen', 'label' => 'Verpakkingen', 'color' => null, 'sort_order' => 7, 'is_active' => true],
                ['type' => 'account_label', 'value' => 'convenience_ready_to_use', 'label' => 'Convenience & ready-to-use', 'color' => null, 'sort_order' => 8, 'is_active' => true],
                ['type' => 'gender', 'value' => 'man', 'label' => 'Man', 'color' => null, 'sort_order' => 0, 'is_active' => true],
                ['type' => 'gender', 'value' => 'vrouw', 'label' => 'Vrouw', 'color' => null, 'sort_order' => 1, 'is_active' => true],
                ['type' => 'employment_type', 'value' => 'fulltime', 'label' => 'Fulltime', 'color' => null, 'sort_order' => 0, 'is_active' => true],
                ['type' => 'employment_type', 'value' => 'parttime', 'label' => 'Parttime', 'color' => null, 'sort_order' => 1, 'is_active' => true],
                ['type' => 'employment_type', 'value' => 'interim', 'label' => 'Interim', 'color' => null, 'sort_order' => 2, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'factuurcontact', 'label' => 'Factuurcontact', 'color' => null, 'sort_order' => 0, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'kandidaat', 'label' => 'Kandidaat', 'color' => null, 'sort_order' => 1, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'interimmer', 'label' => 'Interimmer', 'color' => null, 'sort_order' => 2, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'ambassadeur', 'label' => 'Ambassadeur', 'color' => null, 'sort_order' => 3, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'potentieel_management', 'label' => 'Potentieel Management', 'color' => null, 'sort_order' => 4, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'medebeslisser', 'label' => 'Medebeslisser', 'color' => null, 'sort_order' => 5, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'potentieel_directie', 'label' => 'Potentieel Directie', 'color' => null, 'sort_order' => 6, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'referentie_van_kandidaat', 'label' => 'Referentie van kandidaat', 'color' => null, 'sort_order' => 7, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'hr_eerste_contact_arbeidsvoorwaarden', 'label' => 'HR eerste contact arbeidsvoorwaarden', 'color' => null, 'sort_order' => 8, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'hr_recruiters', 'label' => 'HR Recruiters', 'color' => null, 'sort_order' => 9, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'directie', 'label' => 'Directie', 'color' => null, 'sort_order' => 10, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'eigenaar', 'label' => 'Eigenaar', 'color' => null, 'sort_order' => 11, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'expert', 'label' => 'Expert', 'color' => null, 'sort_order' => 12, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'coach', 'label' => 'Coach', 'color' => null, 'sort_order' => 13, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'oud_eigenaar', 'label' => 'Oud Eigenaar', 'color' => null, 'sort_order' => 14, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'oud_directeur', 'label' => 'Oud Directeur', 'color' => null, 'sort_order' => 15, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'commissaris', 'label' => 'Commissaris', 'color' => null, 'sort_order' => 16, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'investeerder', 'label' => 'Investeerder', 'color' => null, 'sort_order' => 17, 'is_active' => true],
                ['type' => 'network_role', 'value' => 'netwerk_groep', 'label' => 'Netwerk Groep', 'color' => null, 'sort_order' => 18, 'is_active' => true],
                ['type' => 'assignment_status', 'value' => '1e_contact_moment', 'label' => '1e contact moment', 'color' => null, 'sort_order' => 0, 'is_active' => true],
                ['type' => 'assignment_status', 'value' => '1e_gesprek_online_of_offline', 'label' => '1e gesprek online of offline', 'color' => null, 'sort_order' => 1, 'is_active' => true],
                ['type' => 'assignment_status', 'value' => 'test_afnemen', 'label' => 'Test afnemen', 'color' => null, 'sort_order' => 2, 'is_active' => true],
                ['type' => 'assignment_status', 'value' => 'sollicitatietraining', 'label' => 'Sollicitatietraining', 'color' => null, 'sort_order' => 3, 'is_active' => true],
                ['type' => 'assignment_status', 'value' => '1e_gesprek_klant', 'label' => '1e gesprek klant', 'color' => null, 'sort_order' => 4, 'is_active' => true],
                ['type' => 'assignment_status', 'value' => '2e_gesprek_klant', 'label' => '2e gesprek klant', 'color' => null, 'sort_order' => 5, 'is_active' => true],
                ['type' => 'assignment_status', 'value' => 'arbeidsvoorwaardengesprek', 'label' => 'Arbeidsvoorwaardengesprek', 'color' => null, 'sort_order' => 6, 'is_active' => true],
                ['type' => 'assignment_status', 'value' => 'eindgesprek_klant', 'label' => 'Eindgesprek klant', 'color' => null, 'sort_order' => 7, 'is_active' => true],
                ['type' => 'assignment_status', 'value' => 'bedrijfstest_afnemen', 'label' => 'Bedrijfstest afnemen', 'color' => null, 'sort_order' => 8, 'is_active' => true],
                ['type' => 'assignment_status', 'value' => 'aangenomen', 'label' => 'Aangenomen', 'color' => null, 'sort_order' => 9, 'is_active' => true],
                ['type' => 'assignment_status', 'value' => 'afgewezen', 'label' => 'Afgewezen', 'color' => null, 'sort_order' => 10, 'is_active' => true],
                ['type' => 'assignment_status', 'value' => 'opdracht_on_hold', 'label' => 'Opdracht on hold', 'color' => null, 'sort_order' => 11, 'is_active' => true],
                ['type' => 'assignment_status', 'value' => 'administratief_voltooid', 'label' => 'Administratief voltooid', 'color' => null, 'sort_order' => 12, 'is_active' => true],
                ['type' => 'assignment_status', 'value' => 'schaduwmanagement', 'label' => 'Schaduwmanagement', 'color' => null, 'sort_order' => 13, 'is_active' => true],
                ['type' => 'assignment_status', 'value' => 'voltooid', 'label' => 'Voltooid', 'color' => null, 'sort_order' => 14, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'reiskostenvergoeding', 'label' => 'Reiskostenvergoeding', 'color' => null, 'sort_order' => 0, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'pensioen', 'label' => 'Pensioen', 'color' => null, 'sort_order' => 1, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'dienstreizen_vergoeding', 'label' => 'Dienstreizen vergoeding', 'color' => null, 'sort_order' => 2, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'mogelijkheid_tot_promotie', 'label' => 'Mogelijkheid tot promotie', 'color' => null, 'sort_order' => 3, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'flexibele_werkuren', 'label' => 'Flexibele werkuren', 'color' => null, 'sort_order' => 4, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'personeelskorting', 'label' => 'Personeelskorting', 'color' => null, 'sort_order' => 5, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'bedrijfsfeesten', 'label' => 'Bedrijfsfeesten', 'color' => null, 'sort_order' => 6, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'productkorting_werknemers', 'label' => 'Productkorting werknemers', 'color' => null, 'sort_order' => 7, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'auto_van_de_zaak', 'label' => 'Auto van de zaak', 'color' => null, 'sort_order' => 8, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'budget_voor_professionele_ontwikkeling', 'label' => 'Budget voor professionele ontwikkeling', 'color' => null, 'sort_order' => 9, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'zorgverzekering', 'label' => 'Zorgverzekering', 'color' => null, 'sort_order' => 10, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'collectieve_zorgverzekering', 'label' => 'Collectieve zorgverzekering', 'color' => null, 'sort_order' => 11, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'bedrijfsopleiding', 'label' => 'Bedrijfsopleiding', 'color' => null, 'sort_order' => 12, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'vrijdagmiddagborrel', 'label' => 'Vrijdagmiddagborrel', 'color' => null, 'sort_order' => 13, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'kerstpakket', 'label' => 'Kerstpakket', 'color' => null, 'sort_order' => 14, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'extra_vakantiedagen', 'label' => 'Extra vakantiedagen', 'color' => null, 'sort_order' => 15, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'fietsplan', 'label' => 'Fietsplan', 'color' => null, 'sort_order' => 16, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'bedrijfsfitness', 'label' => 'Bedrijfsfitness', 'color' => null, 'sort_order' => 17, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'winstdeling', 'label' => 'Winstdeling', 'color' => null, 'sort_order' => 18, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'werk_vanuit_huis', 'label' => 'Werk vanuit huis', 'color' => null, 'sort_order' => 19, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'telefoon_van_de_zaak', 'label' => 'Telefoon van de zaak', 'color' => null, 'sort_order' => 20, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'telefoonplan', 'label' => 'Telefoonplan', 'color' => null, 'sort_order' => 21, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'aanvullend_pensioen', 'label' => 'Aanvullend pensioen', 'color' => null, 'sort_order' => 22, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'gezondeheidsprogramma', 'label' => 'Gezondeheidsprogramma', 'color' => null, 'sort_order' => 23, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'lunchkorting', 'label' => 'Lunchkorting', 'color' => null, 'sort_order' => 24, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'kosteloos_parkeren', 'label' => 'Kosteloos parkeren', 'color' => null, 'sort_order' => 25, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'levensverzekering', 'label' => 'Levensverzekering', 'color' => null, 'sort_order' => 26, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'aandelenopties', 'label' => 'Aandelenopties', 'color' => null, 'sort_order' => 27, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'taaltraining_aangeboden', 'label' => 'Taaltraining aangeboden', 'color' => null, 'sort_order' => 28, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'kinderopvang', 'label' => 'Kinderopvang', 'color' => null, 'sort_order' => 29, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'verhuisvergoeding', 'label' => 'Verhuisvergoeding', 'color' => null, 'sort_order' => 30, 'is_active' => true],
                ['type' => 'benefit', 'value' => 'huisvestingsvergoeding', 'label' => 'Huisvestingsvergoeding', 'color' => null, 'sort_order' => 31, 'is_active' => true],
            ],
            [
                ['type' => 'sales_target', 'value' => 'Marketing', 'label' => 'Marketing', 'color' => null, 'sort_order' => 0, 'is_active' => true],
                ['type' => 'sales_target', 'value' => 'Sales', 'label' => 'Sales', 'color' => null, 'sort_order' => 1, 'is_active' => true],
                ['type' => 'sales_target', 'value' => 'Inkoop', 'label' => 'Inkoop', 'color' => null, 'sort_order' => 2, 'is_active' => true],
                ['type' => 'sales_target', 'value' => 'Supply Chain', 'label' => 'Supply Chain', 'color' => null, 'sort_order' => 3, 'is_active' => true],
                ['type' => 'sales_target', 'value' => 'Finance', 'label' => 'Finance', 'color' => null, 'sort_order' => 4, 'is_active' => true],
                ['type' => 'sales_target', 'value' => 'Directie', 'label' => 'Directie', 'color' => null, 'sort_order' => 5, 'is_active' => true],
                ['type' => 'sales_target', 'value' => 'Category Management', 'label' => 'Category Management', 'color' => null, 'sort_order' => 6, 'is_active' => true],
            ],
            [
                ['type' => 'client_status', 'value' => 'potential', 'label' => 'Potentieel', 'color' => null, 'sort_order' => 0, 'is_active' => true],
                ['type' => 'client_status', 'value' => 'potential_first_assignment', 'label' => 'Potentieel (1e opdracht)', 'color' => null, 'sort_order' => 1, 'is_active' => true],
                ['type' => 'client_status', 'value' => 'new_client', 'label' => 'Nieuwe klant', 'color' => null, 'sort_order' => 2, 'is_active' => true],
                ['type' => 'client_status', 'value' => 'active_client', 'label' => 'Actieve klant', 'color' => null, 'sort_order' => 3, 'is_active' => true],
                ['type' => 'client_status', 'value' => 'inactive', 'label' => 'Inactief', 'color' => null, 'sort_order' => 4, 'is_active' => true],
                ['type' => 'client_status', 'value' => 'lost', 'label' => 'Verloren', 'color' => null, 'sort_order' => 5, 'is_active' => true],
            ]
        );
    }

    /** @return list<string> */
    private function activeOptionValues(string $type): array
    {
        return DropdownOption::ofType($type)->active()->orderBy('sort_order')->pluck('value')->all();
    }

    private function randomFromPool(array $pool, string $fallback): string
    {
        return $pool !== [] ? $pool[array_rand($pool)] : $fallback;
    }

    private function optionalRandomElement(\Faker\Generator $faker, float $weight, array $pool): ?string
    {
        if ($pool === []) {
            return null;
        }

        $v = $faker->optional($weight)->randomElement($pool);

        return is_string($v) ? $v : null;
    }

    private function pickUnique(array $options, array $used): string
    {
        $available = array_diff($options, $used);
        if (empty($available)) {
            return 'Bedrijf ' . (count($used) + 1);
        }
        $pick = array_rand(array_flip($available));
        return is_string($pick) ? $pick : $options[$pick];
    }

    private function randomLocation(): string
    {
        $cities = ['Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven', 'Groningen', 'Tilburg', 'Almere', 'Breda', 'Nijmegen'];
        return $cities[array_rand($cities)];
    }

    private function randomPhone(): string
    {
        return '0' . rand(6, 9) . rand(1000000, 9999999);
    }

    private function seedContacts(int $count): void
    {
        $faker = \Faker\Factory::create('nl_NL');
        $cities = ['Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven', 'Groningen', 'Tilburg', 'Almere', 'Breda', 'Nijmegen'];
        $networkPool = $this->activeOptionValues('network_role');
        $genderPool = $this->activeOptionValues('gender');
        $educationPool = $this->activeOptionValues('education');
        $benefitPool = $this->activeOptionValues('benefit');
        $catPool = $this->activeOptionValues('account_category');
        $secPool = $this->activeOptionValues('account_secondary_category');
        $terPool = $this->activeOptionValues('account_tertiary_category');
        $brandPool = $this->activeOptionValues('account_brand');
        $labelPool = $this->activeOptionValues('account_label');

        $bar = $this->output->createProgressBar($count);
        $bar->start();

        for ($i = 0; $i < $count; $i++) {
            $prefix = $this->prefixes[array_rand($this->prefixes)];
            $roles = $this->randomSubset($networkPool, 1, min(count($networkPool), 5));
            if ($roles === []) {
                $roles = ['kandidaat'];
            }

            $benefits = null;
            if ($benefitPool !== [] && $faker->boolean(30)) {
                $benefits = $this->randomSubset($benefitPool, 1, min(3, count($benefitPool)));
                if ($benefits === []) {
                    $benefits = null;
                }
            }

            Contact::create([
                'first_name' => $faker->firstName(),
                'prefix' => $prefix,
                'last_name' => $faker->lastName(),
                'date_of_birth' => $faker->optional(0.7)->dateTimeBetween('-50 years', '-20 years'),
                'gender' => $genderPool !== []
                    ? $this->optionalRandomElement($faker, 0.8, $genderPool)
                    : null,
                'email' => 'seed.' . $i . '.' . Str::random(6) . '@example.com',
                'phone' => $faker->optional(0.8)->numerify('06########'),
                'location' => $faker->optional(0.6)->randomElement($cities) . ', Nederland',
                'current_company' => $faker->optional(0.5)->company(),
                'company_role' => $faker->optional(0.6)->jobTitle(),
                'category' => $this->randomFromPool($catPool, 'andere'),
                'secondary_category' => $this->optionalRandomElement($faker, 0.65, $secPool),
                'tertiary_category' => $this->randomSubset($terPool, 0, 2),
                'merken' => $this->randomSubset($brandPool, 0, 2),
                'labels' => $this->randomSubset($labelPool, 0, 3),
                'network_roles' => $roles,
                'annual_salary_cents' => $faker->optional(0.35)->numberBetween(3_800_000, 9_500_000),
                'hourly_rate_cents' => $faker->optional(0.25)->numberBetween(3_500, 12_000),
                'vacation_days' => $faker->optional(0.4)->numberBetween(20, 32),
                'bonus_percentage' => $faker->optional(0.2)->randomFloat(2, 5, 15),
                'benefits' => $benefits,
                'education' => $educationPool !== []
                    ? $this->optionalRandomElement($faker, 0.5, $educationPool)
                    : null,
                'availability_date' => $faker->optional(0.3)->dateTimeBetween('now', '+6 months'),
                'notes' => $faker->optional(0.2)->sentence(),
            ]);

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
    }
}
