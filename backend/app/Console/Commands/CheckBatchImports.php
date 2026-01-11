<?php

namespace App\Console\Commands;

use App\Models\CvImportBatch;
use App\Services\BatchCvImportService;
use Illuminate\Console\Command;
use Spatie\Multitenancy\Models\Tenant;

class CheckBatchImports extends Command
{
    protected $signature = 'cv:check-batches';
    protected $description = 'Check status of pending batch CV imports and process completed ones';

    public function handle(BatchCvImportService $batchService): int
    {
        $this->info('Checking batch CV imports...');
        
        $processingBatches = CvImportBatch::where('status', 'processing')->get();
        
        if ($processingBatches->isEmpty()) {
            $this->info('No batches currently processing.');
            return 0;
        }
        
        foreach ($processingBatches as $batch) {
            $this->info("Checking batch {$batch->uid}...");
            
            // Set tenant context for processing results
            $tenant = Tenant::find($batch->tenant_id);
            if ($tenant) {
                $tenant->makeCurrent();
            }
            
            try {
                $batchService->checkAndProcessBatch($batch);
                $batch->refresh();
                
                $this->info("  Status: {$batch->status}");
                $this->info("  Progress: {$batch->processed_files}/{$batch->total_files}");
                
                if ($batch->status === 'completed') {
                    $this->info("  ✅ Success: {$batch->success_count}");
                    $this->warn("  ❌ Failed: {$batch->failed_count}");
                }
            } catch (\Exception $e) {
                $this->error("  Error: {$e->getMessage()}");
            }
        }
        
        return 0;
    }
}
