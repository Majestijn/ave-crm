<?php

namespace App\Console\Commands;

use App\Models\Account;
use App\Models\AccountActivity;
use App\Models\Assignment;
use App\Models\CalendarEvent;
use App\Models\Contact;
use App\Models\DropdownOption;
use App\Models\Tenant;
use App\Models\User;
use App\Support\AssignmentStatus;
use Carbon\Carbon;
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
            $assignments = $this->seedAssignments($accounts, $numAssignments, $users);
            $this->seedContacts($numContacts);
            $this->seedDashboardDemoData($assignments, $users, $accounts);

            $this->info("  ✓ " . count($users) . " gebruikers, {$numAccounts} klanten, {$numAssignments} opdrachten en {$numContacts} contacten aangemaakt (incl. dashboard-demo).");
        }

        return 0;
    }

    private function seedAccounts(int $count): array
    {
        $accounts = [];
        $usedNames = [];
        $faker = \Faker\Factory::create('nl_NL');
        $catPool = $this->activeOptionValues('sector_category');
        $secPool = $this->activeOptionValues('sector_secondary_category');
        $terPool = $this->activeOptionValues('sector_tertiary_category');
        $brandPool = $this->activeOptionValues('sector_brand');
        $labelPool = $this->activeOptionValues('sector_label');
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

    /**
     * @return list<Assignment>
     */
    private function seedAssignments(array $accounts, int $count, array $users): array
    {
        $recruiterUsers = array_values(array_filter($users, fn($u) => in_array($u->role, ['recruiter', 'admin', 'management'])));
        $statusPool = $this->activeOptionValues('assignment_status');
        $employmentPool = $this->activeOptionValues('employment_type');
        $benefitPool = $this->activeOptionValues('benefit');
        $assignments = [];

        for ($i = 0; $i < $count; $i++) {
            $account = $accounts[array_rand($accounts)];

            $leadRecruiter = !empty($recruiterUsers) ? $recruiterUsers[array_rand($recruiterUsers)] : null;
            $employmentType = $this->randomFromPool($employmentPool, 'fulltime');
            $startDate = rand(1, 4) <= 3 ? Carbon::today()->subWeeks(rand(2, 20)) : null;
            $endDate = null;
            if ($startDate && str_contains(strtolower($employmentType), 'interim')) {
                $endDate = $startDate->copy()->addWeeks(rand(8, 52));
            }

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
                'employment_type' => $employmentType,
                'start_date' => $startDate,
                'end_date' => $endDate,
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

            $assignments[] = $assignment;
        }

        return $assignments;
    }

    /**
     * Kandidaten op opdrachten, activiteiten (laatste contact) en agenda voor vandaag.
     *
     * @param  list<Assignment>  $assignments
     * @param  list<User>  $users
     * @param  list<Account>  $accounts
     */
    public function seedDashboardDemoData(array $assignments, array $users, array $accounts): void
    {
        if ($assignments === []) {
            $assignments = Assignment::all()->all();
        }
        if ($assignments === []) {
            return;
        }

        $ongoingAssignments = array_values(array_filter(
            $assignments,
            fn (Assignment $a) => ! AssignmentStatus::isClosed($a->status)
        ));

        $candidatePool = Contact::query()
            ->where(function ($q) {
                $q->whereJsonContains('network_roles', 'kandidaat')
                    ->orWhereJsonContains('network_roles', 'candidate');
            })
            ->limit(200)
            ->get();

        if ($candidatePool->isEmpty()) {
            $candidatePool = Contact::query()->limit(200)->get();
        }

        $inProcessStatuses = ['called', 'proposed', 'first_interview', 'second_interview'];
        $activityTypes = $this->activeOptionValues('activity_type');
        if ($activityTypes === []) {
            $activityTypes = ['call', 'interview', 'proposal'];
        }

        $candidatesAttached = 0;
        $activitiesCreated = 0;

        foreach ($ongoingAssignments as $assignment) {
            if ($candidatePool->isNotEmpty() && rand(1, 100) <= 65) {
                $pick = $candidatePool->random(min(rand(1, 4), $candidatePool->count()));
                $sync = [];
                foreach ($pick as $contact) {
                    $sync[$contact->id] = [
                        'status' => $inProcessStatuses[array_rand($inProcessStatuses)],
                    ];
                }
                $assignment->candidates()->syncWithoutDetaching($sync);
                $candidatesAttached += count($sync);
            }

            if (rand(1, 100) <= 75) {
                $recruiter = $assignment->recruiter_id
                    ? User::find($assignment->recruiter_id)
                    : ($users[array_rand($users)] ?? null);

                AccountActivity::create([
                    'account_id' => $assignment->account_id,
                    'assignment_id' => $assignment->id,
                    'user_id' => $recruiter?->id,
                    'type' => $activityTypes[array_rand($activityTypes)],
                    'description' => 'Demo: contact met klant over voortgang opdracht.',
                    'date' => Carbon::today()->subDays(rand(0, 21)),
                ]);
                $activitiesCreated++;
            }

            if (
                str_contains(strtolower((string) $assignment->employment_type), 'interim')
                && ! $assignment->end_date
            ) {
                $start = $assignment->start_date ?? Carbon::today()->subWeeks(rand(4, 16));
                $assignment->update([
                    'start_date' => $start,
                    'end_date' => $start->copy()->addWeeks(rand(12, 40)),
                ]);
            }
        }

        $recruiters = array_values(array_filter($users, fn ($u) => in_array($u->role, ['recruiter', 'admin', 'management', 'owner'], true)));
        if ($recruiters === []) {
            $recruiters = $users;
        }

        $eventTypes = $this->activeOptionValues('calendar_event_type');
        if ($eventTypes === []) {
            $eventTypes = ['meeting', 'call', 'interview'];
        }

        $today = Carbon::today();
        $eventsCreated = 0;
        foreach ($recruiters as $user) {
            for ($e = 0; $e < rand(1, 3); $e++) {
                $hour = rand(9, 16);
                $start = $today->copy()->setTime($hour, rand(0, 1) * 30);
                $account = $accounts[array_rand($accounts)] ?? null;
                $assignment = $ongoingAssignments !== []
                    ? $ongoingAssignments[array_rand($ongoingAssignments)]
                    : null;

                CalendarEvent::create([
                    'title' => ['Intake gesprek', 'Follow-up klant', 'Kandidaat interview', 'Teams overleg'][array_rand(['Intake gesprek', 'Follow-up klant', 'Kandidaat interview', 'Teams overleg'])],
                    'description' => 'Demo-agenda-item',
                    'location' => rand(0, 1) ? 'Online' : $this->randomLocation(),
                    'start_at' => $start,
                    'end_at' => $start->copy()->addHour(),
                    'all_day' => false,
                    'user_id' => $user->id,
                    'account_id' => $account?->id,
                    'assignment_id' => $assignment?->id,
                    'event_type' => $eventTypes[array_rand($eventTypes)],
                ]);
                $eventsCreated++;
            }
        }

        if ($this->output !== null) {
            $this->info("  -> Dashboard-demo: {$candidatesAttached} kandidaat-koppelingen, {$activitiesCreated} activiteiten, {$eventsCreated} agenda-items vandaag.");
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
     * Canonieke dropdown-set, gedeeld met de legacy-import.
     *
     * @return int Aantal upserts
     */
    private function seedDemoDropdownOptions(): int
    {
        return \Database\Seeders\DropdownOptionSeeder::seed();
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
        $catPool = $this->activeOptionValues('sector_category');
        $secPool = $this->activeOptionValues('sector_secondary_category');
        $terPool = $this->activeOptionValues('sector_tertiary_category');
        $brandPool = $this->activeOptionValues('sector_brand');
        $labelPool = $this->activeOptionValues('sector_label');

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
