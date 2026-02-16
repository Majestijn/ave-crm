<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class TestR2Connection extends Command
{
    protected $signature = 'r2:test';
    protected $description = 'Test R2 Storage Connection';

    public function handle()
    {
        $disk = 'r2';
        $this->info("Testing R2 Connection on disk: {$disk}...");
        
        $config = config("filesystems.disks.{$disk}");
        $this->info("Endpoint: " . ($config['endpoint'] ?? 'Not set'));
        $this->info("Bucket: " . ($config['bucket'] ?? 'Not set'));
        $this->info("Region: " . ($config['region'] ?? 'Not set'));
        $this->info("Key ID: " . substr($config['key'] ?? '', 0, 5) . '...');

        try {
            $this->info("Attempting to list files...");
            $files = Storage::disk($disk)->files();
            $this->info("✅ Connection successful! Found " . count($files) . " files in root.");
            
            $testContent = 'Hello R2 ' . now();
            $testFile = 'connection_test.txt';
            $this->info("Attempting to write test file: {$testFile}...");
            Storage::disk($disk)->put($testFile, $testContent);
            $this->info("✅ Write successful!");
            
            $this->info("Attempting to delete test file...");
            Storage::disk($disk)->delete($testFile);
            $this->info("✅ Delete successful!");
            
        } catch (\Exception $e) {
            $this->error("❌ Error: " . $e->getMessage());
            if (str_contains($e->getMessage(), '403 Forbidden')) {
                 $this->warn("💡 403 Forbidden often means:");
                 $this->warn("   1. The Access Key/Secret in .env does not match the Token.");
                 $this->warn("   2. The Token does not have permissions for THIS specific bucket.");
                 $this->warn("   3. System time is incorrect (S3 signatures fail).");
            }
        }
    }
}
