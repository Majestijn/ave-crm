<?php

use Exception;
use Illuminate\Support\Facades\Artisan;

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

echo "Dropping all tenant databases...\n";

// Get database names from tenants table before we drop it
$dbNames = [];
try {
    $tenants = DB::connection('landlord')->table('tenants')->get();
    $dbNames = $tenants->pluck('database')->toArray();
    echo "Found " . count($dbNames) . " tenant database(s) to drop\n";
} catch (Exception $e) {
    echo "Could not read tenants table: " . $e->getMessage() . "\n";
    // Fallback: find databases by pattern
    echo "Falling back to pattern matching...\n";
}

// Also find any 'orphan' databases that start with 'tenant_' or match our slug pattern
$extras = DB::connection('landlord')->select("SELECT datname FROM pg_database WHERE datname LIKE 'tenant_%' OR datname LIKE 'laravel_%'");
foreach ($extras as $e) {
    $dbNames[] = $e->datname;
}

$dbNames = array_unique($dbNames);

foreach ($dbNames as $name) {
    if ($name === config('database.connections.landlord.database')) {
        continue; // Skip landlord
    }

    echo "Dropping $name... ";
    try {
        // Force disconnect users
        DB::connection('landlord')->statement("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$name'");
        DB::connection('landlord')->statement("DROP DATABASE \"$name\"");
        echo "DONE\n";
    } catch (Exception $e) {
        echo "FAILED: " . $e->getMessage() . "\n";
    }
}

echo "All tenant databases dropped.\n";

echo "Refreshing landlord database...\n";
Artisan::call('migrate:fresh', [
    '--database' => 'landlord',
    '--path' => 'database/migrations/landlord',
    '--force' => true,
]);
echo "Landlord database refreshed.\n";

// Clear R2 bucket
echo "\nClearing R2 storage bucket...\n";
try {
    $disk = Storage::disk('r2');
    
    // Get all files recursively
    $allFiles = $disk->allFiles('');
    $fileCount = count($allFiles);
    
    if ($fileCount === 0) {
        echo "R2 bucket is already empty.\n";
    } else {
        echo "Found $fileCount file(s) to delete...\n";
        
        // Delete files in batches to avoid memory issues
        $batchSize = 100;
        $deleted = 0;
        
        foreach (array_chunk($allFiles, $batchSize) as $batch) {
            $disk->delete($batch);
            $deleted += count($batch);
            echo "Deleted $deleted / $fileCount files...\r";
        }
        
        echo "\nR2 bucket cleared successfully.\n";
    }
    
    // Also delete any empty directories
    $directories = $disk->allDirectories('');
    if (count($directories) > 0) {
        foreach (array_reverse($directories) as $dir) { // Reverse to delete deepest first
            $disk->deleteDirectory($dir);
        }
        echo "Deleted " . count($directories) . " empty directories.\n";
    }
    
} catch (Exception $e) {
    echo "WARNING: Could not clear R2 bucket: " . $e->getMessage() . "\n";
    echo "This might happen if R2 is not configured. Continuing...\n";
}

echo "\n✅ Reset complete! All databases have been dropped, landlord database has been refreshed, and R2 bucket has been cleared.\n";
echo "To create a new tenant, use the registration endpoint or register through the frontend.\n";