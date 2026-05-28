<?php

namespace App\Console\Commands;

use App\Models\Account;
use App\Models\Assignment;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Console\Command;

class SeedDashboardDemo extends Command
{
    protected $signature = 'demo:seed-dashboard
                            {--tenant= : Tenant ID (default: all tenants)}';

    protected $description = 'Vult bestaande tenant-data aan voor het dashboard (kandidaten, activiteiten, agenda vandaag)';

    public function handle(): int
    {
        $tenantId = $this->option('tenant');
        $tenants = $tenantId
            ? Tenant::where('id', $tenantId)->get()
            : Tenant::all();

        if ($tenants->isEmpty()) {
            $this->error('Geen tenants gevonden.');
            return 1;
        }

        $seeder = new SeedAccountsAndAssignments();

        foreach ($tenants as $tenant) {
            $this->info("Dashboard-demo voor tenant: {$tenant->name}");
            $tenant->makeCurrent();

            $seeder->seedDashboardDemoData(
                Assignment::all()->all(),
                User::all()->all(),
                Account::all()->all(),
            );
        }

        return 0;
    }
}
