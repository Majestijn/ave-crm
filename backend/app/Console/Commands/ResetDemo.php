<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Tenant;

class ResetDemo extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'demo:reset {--force : Skip confirmation}';

    /**
     * The console command description.
     */
    protected $description = 'Reset all tenants and their databases for demo/testing purposes';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if (!$this->option('force')) {
            if (!$this->confirm('⚠️  Dit verwijdert ALLE tenants en hun data. Weet je het zeker?')) {
                $this->info('Geannuleerd.');
                return 0;
            }
        }

        $this->info('🔄 Starting demo reset...');

        // 1. Get all tenants
        $tenants = Tenant::all();
        $this->info("Found {$tenants->count()} tenant(s) to remove.");

        // 2. Drop tenant databases
        $config = config('database.connections.landlord');
        
        try {
            $pdo = new \PDO(
                "pgsql:host={$config['host']};port={$config['port']};dbname={$config['database']}", 
                $config['username'], 
                $config['password']
            );
            $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

            foreach ($tenants as $tenant) {
                $dbName = $tenant->database;
                $this->info("  Dropping database: {$dbName}");
                
                try {
                    // Terminate connections to the database
                    $pdo->exec("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{$dbName}'");
                    $pdo->exec("DROP DATABASE IF EXISTS \"{$dbName}\"");
                    $this->info("  ✓ Dropped: {$dbName}");
                } catch (\PDOException $e) {
                    $this->warn("  ⚠ Could not drop {$dbName}: " . $e->getMessage());
                }
            }

            // Also drop any orphan tenant databases
            $this->info("Checking for orphan tenant databases...");
            $result = $pdo->query("SELECT datname FROM pg_database WHERE datname LIKE 'tenant_%'");
            $orphanDbs = $result->fetchAll(\PDO::FETCH_COLUMN);
            
            foreach ($orphanDbs as $dbName) {
                $this->info("  Dropping orphan database: {$dbName}");
                try {
                    $pdo->exec("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{$dbName}'");
                    $pdo->exec("DROP DATABASE IF EXISTS \"{$dbName}\"");
                    $this->info("  ✓ Dropped orphan: {$dbName}");
                } catch (\PDOException $e) {
                    $this->warn("  ⚠ Could not drop orphan {$dbName}: " . $e->getMessage());
                }
            }

        } catch (\PDOException $e) {
            $this->error("Database connection error: " . $e->getMessage());
            return 1;
        }

        // 3. Truncate tenants table
        $this->info("Truncating tenants table...");
        Tenant::truncate();
        $this->info("✓ Tenants table cleared.");

        // 4. Clear caches
        $this->info("Clearing caches...");
        $this->call('cache:clear');
        $this->call('config:clear');

        $this->newLine();
        $this->info('========================================');
        $this->info('✅ Demo reset complete!');
        $this->info('========================================');
        $this->info('Gebruikers kunnen nu opnieuw registreren.');
        $this->newLine();

        Log::info('Demo reset completed at ' . now());

        return 0;
    }
}
