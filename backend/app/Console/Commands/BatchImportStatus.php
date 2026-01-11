<?php

namespace App\Console\Commands;

use App\Models\CvImportBatch;
use Illuminate\Console\Command;

class BatchImportStatus extends Command
{
    protected $signature = 'cv:status {batch_id?}';
    protected $description = 'Show status of batch CV imports';

    public function handle(): int
    {
        $batchId = $this->argument('batch_id');
        
        if ($batchId) {
            $batch = CvImportBatch::where('uid', $batchId)->first();
            
            if (!$batch) {
                $this->error("Batch {$batchId} not found.");
                return 1;
            }
            
            $this->showBatchDetails($batch);
            return 0;
        }
        
        // Show all recent batches
        $batches = CvImportBatch::orderBy('created_at', 'desc')->limit(10)->get();
        
        if ($batches->isEmpty()) {
            $this->info('No batch imports found.');
            return 0;
        }
        
        $this->table(
            ['ID', 'Status', 'Total', 'Success', 'Failed', 'Progress', 'Started', 'Completed'],
            $batches->map(fn($b) => [
                $b->uid,
                $b->status,
                $b->total_files,
                $b->success_count,
                $b->failed_count,
                $b->getProgressPercentage() . '%',
                $b->started_at?->format('Y-m-d H:i'),
                $b->completed_at?->format('Y-m-d H:i'),
            ])
        );
        
        return 0;
    }
    
    protected function showBatchDetails(CvImportBatch $batch): void
    {
        $this->info("Batch: {$batch->uid}");
        $this->info("Status: {$batch->status}");
        $this->info("Total files: {$batch->total_files}");
        $this->info("Extracted: {$batch->extracted_files}");
        $this->info("Processed: {$batch->processed_files}");
        $this->info("Success: {$batch->success_count}");
        $this->info("Failed: {$batch->failed_count}");
        $this->info("Progress: {$batch->getProgressPercentage()}%");
        
        if ($batch->error_message) {
            $this->error("Error: {$batch->error_message}");
        }
        
        if ($batch->failed_files && count($batch->failed_files) > 0) {
            $this->warn("\nFailed files:");
            foreach ($batch->failed_files as $file) {
                $this->warn("  - {$file['filename']}: {$file['reason']}");
            }
        }
        
        if ($batch->vertex_job_name) {
            $this->info("\nVertex AI Job: {$batch->vertex_job_name}");
        }
        
        if ($batch->gcs_input_uri) {
            $this->info("GCS Input: {$batch->gcs_input_uri}");
        }
    }
}
