<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Database\Seeders\DropdownOptionSeeder;
use Illuminate\Console\Command;

/**
 * Synchroniseert de canonieke dropdown-set (DropdownOptionSeeder) naar de
 * tenant-DB('s). Idempotent: `updateOrCreate` voegt nieuwe opties toe en
 * werkt labels/kleuren bij, maar verwijdert niets en raakt bestaande data
 * niet. Bedoeld om nieuwe dropdown-types (zoals candidate_assignment_status)
 * op productie uit te rollen zónder demo-data of een import te draaien.
 */
class SyncDropdownOptions extends Command
{
    protected $signature = 'dropdowns:sync {--tenant= : Tenant ID (default: alle tenants)}';

    protected $description = 'Sync de canonieke dropdown-opties (DropdownOptionSeeder) naar de tenant-DB(s)';

    public function handle(): int
    {
        $tenantId = $this->option('tenant');

        $tenants = $tenantId
            ? Tenant::where('id', $tenantId)->get()
            : Tenant::all();

        if ($tenants->isEmpty()) {
            $this->error('Geen tenants gevonden.');
            return self::FAILURE;
        }

        foreach ($tenants as $tenant) {
            $tenant->makeCurrent();
            $count = DropdownOptionSeeder::seed();
            $this->info("Tenant {$tenant->name} (id: {$tenant->id}): {$count} dropdown-opties gesynchroniseerd.");
        }

        return self::SUCCESS;
    }
}
