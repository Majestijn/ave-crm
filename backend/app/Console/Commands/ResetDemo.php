<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
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

        // 4. Clear landlord jobs/failed_jobs tables
        $this->info("Clearing landlord job tables...");
        try {
            DB::connection('landlord')->table('jobs')->truncate();
            $this->info("✓ Jobs table cleared.");
        } catch (\Exception $e) {
            $this->info("  (jobs table doesn't exist or is empty)");
        }
        
        try {
            DB::connection('landlord')->table('failed_jobs')->truncate();
            $this->info("✓ Failed jobs table cleared.");
        } catch (\Exception $e) {
            $this->info("  (failed_jobs table doesn't exist or is empty)");
        }

        // 5. Clear R2 storage
        $this->info("Clearing R2 storage...");
        try {
            $disk = Storage::disk('r2');
            $files = $disk->allFiles();
            $directories = $disk->allDirectories();
            
            if (count($files) > 0) {
                $disk->delete($files);
                $this->info("✓ Deleted " . count($files) . " files from R2.");
            } else {
                $this->info("  (No files in R2)");
            }
            
            // Delete directories (in reverse order to handle nested dirs)
            foreach (array_reverse($directories) as $dir) {
                $disk->deleteDirectory($dir);
            }
            if (count($directories) > 0) {
                $this->info("✓ Deleted " . count($directories) . " directories from R2.");
            }
        } catch (\Exception $e) {
            $this->warn("⚠ Could not clear R2: " . $e->getMessage());
        }

        // 6. Clear caches
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
