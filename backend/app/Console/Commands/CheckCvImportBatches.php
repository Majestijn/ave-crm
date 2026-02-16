<?php

namespace App\Console\Commands;

use App\Models\CvImportBatch;
use App\Services\BatchCvImportService;
use Illuminate\Console\Command;

class CheckCvImportBatches extends Command
{
    protected $signature = 'cv:check-batches';
    protected $description = 'Check status of processing CV import batches';

    public function handle(BatchCvImportService $batchService)
    {
        // 1. Get all processing batches from Landlord DB
        $batches = CvImportBatch::where('status', 'processing')->get();

        if ($batches->isEmpty()) {
            // calculated 130ms execution time suggests this is often the case if no batches are pending
            return;
        }

        foreach ($batches as $batch) {
            $this->info("Checking batch {$batch->uid} (Tenant: {$batch->tenant_id})...");
            
            try {
                // 2. Switch to the correct Tenant context
                if ($batch->tenant_id) {
                    $tenant = \Spatie\Multitenancy\Models\Tenant::find($batch->tenant_id);
                    if ($tenant) {
                        $tenant->makeCurrent();
                    } else {
                        $this->error("Tenant {$batch->tenant_id} not found for batch {$batch->uid}");
                        continue;
                    }
                }

                // 3. Process the batch (now in correct tenant context for Contact creation)
                $batchService->checkAndProcessBatch($batch);
                
                $this->info("Batch {$batch->uid} status updated.");
            } catch (\Exception $e) {
                $this->error("Error checking batch {$batch->uid}: " . $e->getMessage());
            } finally {
                // 4. Clean up / Switch back if necessary (Spatie handles this usually but good practice to be aware)
                // For long running processes, we might want to forgetCurrent() but here we just loop
                \Spatie\Multitenancy\Models\Tenant::forgetCurrent();
            }
        }
    }
}
