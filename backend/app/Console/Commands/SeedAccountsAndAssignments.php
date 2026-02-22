<?php

namespace App\Console\Commands;

use App\Models\Account;
use App\Models\Assignment;
use App\Models\Contact;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class SeedAccountsAndAssignments extends Command
{
    protected $signature = 'demo:seed-accounts
                            {--tenant= : Tenant ID to seed (default: all tenants)}
                            {--accounts=10 : Number of accounts to create}
                            {--assignments=50 : Number of assignments to create}
                            {--contacts=1000 : Number of contacts to create}';

    protected $description = 'Seed 10 klanten, 50 opdrachten en 1000 contacten in de tenant database(s)';

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

    private array $categories = ['FMCG', 'Foodservice', 'Overig'];

    private array $secondaryCategories = ['Retailer', 'Groothandel', 'Leverancier', 'Industrie', 'Andere'];

    private array $tertiaryCategories = ['Non-food', 'Food'];

    private array $merkenOptions = ['Merk', 'Private label'];

    private array $labelsOptions = [
        'Vers',
        'Zuivel & eieren',
        'Diepvries',
        'DKW (houdbaar voedsel)',
        'Dranken',
        'Snacks & snoep',
        'Non-food',
        'Verpakkingen',
        'Convenience & ready-to-use',
    ];

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

    private array $statuses = ['active', 'active', 'active', 'completed', 'cancelled'];

    private array $employmentTypes = ['Fulltime', 'Parttime', 'Freelance', 'ZZP'];

    private array $networkRoles = ['candidate', 'ambassador', 'client_decision'];

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

            $accounts = $this->seedAccounts($numAccounts);
            $this->seedAssignments($accounts, $numAssignments);
            $this->seedContacts($numContacts);

            $this->info("  ✓ {$numAccounts} klanten, {$numAssignments} opdrachten en {$numContacts} contacten aangemaakt.");
        }

        return 0;
    }

    private function seedAccounts(int $count): array
    {
        $accounts = [];
        $usedNames = [];

        for ($i = 0; $i < $count; $i++) {
            $name = $this->pickUnique($this->companyNames, $usedNames);
            $usedNames[] = $name;

            $accounts[] = Account::create([
                'name' => $name,
                'location' => $this->randomLocation(),
                'website' => 'https://www.' . Str::slug($name) . '.nl',
                'phone' => $this->randomPhone(),
                'industry' => 'Retail / Food',
                'category' => $this->categories[array_rand($this->categories)],
                'secondary_category' => $this->secondaryCategories[array_rand($this->secondaryCategories)],
                'tertiary_category' => $this->randomSubset($this->tertiaryCategories, 0, 2),
                'merken' => $this->randomSubset($this->merkenOptions, 0, 2),
                'labels' => $this->randomSubset($this->labelsOptions, 0, 5),
                'fte_count' => rand(50, 5000),
                'revenue_cents' => rand(1_000_000, 500_000_000) * 100, // 1M - 500M euro
                'notes' => null,
            ]);
        }

        return $accounts;
    }

    private function seedAssignments(array $accounts, int $count): void
    {
        for ($i = 0; $i < $count; $i++) {
            $account = $accounts[array_rand($accounts)];

            Assignment::create([
                'account_id' => $account->id,
                'title' => $this->assignmentTitles[array_rand($this->assignmentTitles)],
                'description' => "Opdracht voor {$account->name}. Verantwoordelijk voor de dagelijkse operatie en groei.",
                'status' => $this->statuses[array_rand($this->statuses)],
                'salary_min' => rand(40000, 70000),
                'salary_max' => rand(70000, 120000),
                'vacation_days' => rand(24, 36),
                'location' => $this->randomLocation(),
                'employment_type' => $this->employmentTypes[array_rand($this->employmentTypes)],
            ]);
        }
    }

    private function randomSubset(array $options, int $minCount, int $maxCount): array
    {
        $count = rand($minCount, min($maxCount, count($options)));
        if ($count === 0) {
            return [];
        }
        $shuffled = $options;
        shuffle($shuffled);
        return array_slice($shuffled, 0, $count);
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

        $bar = $this->output->createProgressBar($count);
        $bar->start();

        for ($i = 0; $i < $count; $i++) {
            $prefix = $this->prefixes[array_rand($this->prefixes)];
            $roles = array_slice(
                $this->networkRoles,
                0,
                rand(1, count($this->networkRoles))
            );

            Contact::create([
                'first_name' => $faker->firstName(),
                'prefix' => $prefix,
                'last_name' => $faker->lastName(),
                'date_of_birth' => $faker->optional(0.7)->dateTimeBetween('-50 years', '-20 years'),
                'gender' => $faker->optional(0.8)->randomElement(['male', 'female']),
                'email' => 'seed.' . $i . '.' . Str::random(6) . '@example.com',
                'phone' => $faker->optional(0.8)->numerify('06########'),
                'location' => $faker->optional(0.6)->randomElement($cities) . ', Nederland',
                'current_company' => $faker->optional(0.5)->company(),
                'company_role' => $faker->optional(0.6)->jobTitle(),
                'network_roles' => $roles,
                'current_salary_cents' => $faker->optional(0.4)->randomElement([40000, 50000, 60000, 70000, 80000]) * 100,
                'education' => $faker->optional(0.5)->randomElement(['HBO', 'WO', 'MBO', 'HBO Bachelor']),
                'availability_date' => $faker->optional(0.3)->dateTimeBetween('now', '+6 months'),
                'notes' => $faker->optional(0.2)->sentence(),
            ]);

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
    }
}
