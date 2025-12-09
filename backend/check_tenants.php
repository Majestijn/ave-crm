<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $tenants = App\Models\Tenant::all();
    echo "Count: " . $tenants->count() . "\n";
    foreach ($tenants as $tenant) {
        echo "Tenant: " . $tenant->name . " (" . $tenant->slug . ") - DB: " . $tenant->database . "\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
