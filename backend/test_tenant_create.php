<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $t = App\Models\Tenant::create([
        'name' => 'Test',
        'slug' => 'test',
        'domain' => 'test.localhost'
    ]);
    echo "Success: " . $t->id . "\n";
    echo "Database: " . $t->database . "\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
