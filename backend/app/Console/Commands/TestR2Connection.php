<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class TestR2Connection extends Command
{
    protected $signature = 'r2:test';
    protected $description = 'Test the Cloudflare R2 connection';

    public function handle(): int
    {
        $this->info('Testing Cloudflare R2 connection...');

        try {
            $disk = Storage::disk('r2');

            // Test 1: Write a test file
            $testPath = 'test/connection-test-' . now()->timestamp . '.txt';
            $testContent = 'R2 connection test at ' . now()->toDateTimeString();
            
            $this->info('Writing test file: ' . $testPath);
            $disk->put($testPath, $testContent);
            $this->info('✓ Write successful');

            // Test 2: Read the test file
            $this->info('Reading test file...');
            $readContent = $disk->get($testPath);
            
            if ($readContent === $testContent) {
                $this->info('✓ Read successful - content matches');
            } else {
                $this->error('✗ Read content does not match');
                return Command::FAILURE;
            }

            // Test 3: Check if file exists
            $this->info('Checking if file exists...');
            if ($disk->exists($testPath)) {
                $this->info('✓ File exists check successful');
            } else {
                $this->error('✗ File exists check failed');
                return Command::FAILURE;
            }

            // Test 4: List files in test directory
            $this->info('Listing files in test directory...');
            $files = $disk->files('test');
            $this->info('✓ Found ' . count($files) . ' file(s) in test directory');

            // Test 5: Delete the test file
            $this->info('Deleting test file...');
            $disk->delete($testPath);
            
            if (!$disk->exists($testPath)) {
                $this->info('✓ Delete successful');
            } else {
                $this->error('✗ Delete failed - file still exists');
                return Command::FAILURE;
            }

            $this->newLine();
            $this->info('🎉 All tests passed! R2 connection is working correctly.');
            
            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('✗ Error: ' . $e->getMessage());
            $this->newLine();
            $this->warn('Please check your .env configuration:');
            $this->line('  R2_ACCESS_KEY_ID=your_access_key');
            $this->line('  R2_SECRET_ACCESS_KEY=your_secret_key');
            $this->line('  R2_BUCKET=your_bucket_name');
            $this->line('  R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com');
            
            return Command::FAILURE;
        }
    }
}

