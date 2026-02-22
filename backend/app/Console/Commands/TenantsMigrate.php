<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class TenantsMigrate extends Command
{
    protected $signature = 'tenants:migrate {--force : Force the operation to run in production}';

    protected $description = 'Run pending tenant migrations (uses database/migrations/tenant path)';

    public function handle(): int
    {
        $artisanCommand = 'migrate --path=database/migrations/tenant --database=tenant';
        if ($this->option('force')) {
            $artisanCommand .= ' --force';
        }

        return $this->call('tenants:artisan', [
            'artisanCommand' => $artisanCommand,
        ]);
    }
}
