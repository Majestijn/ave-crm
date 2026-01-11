<?php

namespace App\Http\Controllers;

use App\Models\CvImportBatch;
use App\Services\BatchCvImportService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Spatie\Multitenancy\Models\Tenant;

class BatchCvImportController extends Controller
{
    public function __construct(
        protected BatchCvImportService $batchService
    ) {}

    /**
     * Upload ZIP file and start batch import
     */
    public function upload(Request $request): JsonResponse
    {
        $auth = $request->user();

        // Authorization: only owners and admins can batch import
        if (!in_array($auth->role, ['owner', 'admin'])) {
            abort(403, 'Je hebt geen toestemming voor bulk import');
        }

        $request->validate([
            'file' => ['required', 'file', 'mimes:zip', 'max:512000'], // Max 500MB
        ]);

        $tenant = Tenant::current();
        if (!$tenant) {
            abort(403, 'Geen tenant context gevonden');
        }

        // Create batch record
        $batch = CvImportBatch::create([
            'tenant_id' => $tenant->id,
            'user_id' => $auth->id,
            'status' => 'pending',
        ]);

        // Store ZIP file temporarily
        $zipFile = $request->file('file');
        $zipPath = storage_path("app/temp/batch-{$batch->uid}/upload.zip");
        
        $dir = dirname($zipPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        
        $zipFile->move($dir, 'upload.zip');

        // Process in background (dispatch job or process inline for now)
        try {
            // For large files, this should be a queued job
            // For now, we process inline but this could timeout for very large ZIPs
            $this->batchService->processZipFile($zipPath, $batch);
            
            return response()->json([
                'message' => 'Batch import gestart',
                'batch_id' => $batch->uid,
                'total_files' => $batch->total_files,
            ], 202);
            
        } catch (\Exception $e) {
            Log::error('Batch import failed to start', [
                'batch_id' => $batch->id,
                'error' => $e->getMessage(),
            ]);
            
            return response()->json([
                'message' => 'Fout bij starten van import: ' . $e->getMessage(),
                'batch_id' => $batch->uid,
            ], 500);
        }
    }

    /**
     * Get batch import status
     */
    public function status(Request $request, string $batchUid): JsonResponse
    {
        $auth = $request->user();

        // Authorization
        if (!in_array($auth->role, ['owner', 'admin', 'recruiter'])) {
            abort(403, 'Je hebt geen toestemming om import status te bekijken');
        }

        $tenant = Tenant::current();
        
        $batch = CvImportBatch::where('uid', $batchUid)
            ->where('tenant_id', $tenant->id)
            ->firstOrFail();

        // If still processing, check job status
        if ($batch->status === 'processing') {
            $this->batchService->checkAndProcessBatch($batch);
            $batch->refresh();
        }

        return response()->json([
            'batch_id' => $batch->uid,
            'status' => $batch->status,
            'total_files' => $batch->total_files,
            'extracted_files' => $batch->extracted_files,
            'processed_files' => $batch->processed_files,
            'success_count' => $batch->success_count,
            'failed_count' => $batch->failed_count,
            'skipped_count' => $batch->skipped_count ?? 0,
            'progress_percentage' => $batch->getProgressPercentage(),
            'is_complete' => $batch->isComplete(),
            'error_message' => $batch->error_message,
            'failed_files' => $batch->failed_files ?? [],
            'skipped_files' => $batch->skipped_files ?? [],
            'started_at' => $batch->started_at?->toISOString(),
            'completed_at' => $batch->completed_at?->toISOString(),
        ]);
    }

    /**
     * List all batch imports for current tenant
     */
    public function index(Request $request): JsonResponse
    {
        $auth = $request->user();

        if (!in_array($auth->role, ['owner', 'admin', 'recruiter'])) {
            abort(403, 'Je hebt geen toestemming om imports te bekijken');
        }

        $tenant = Tenant::current();
        
        $batches = CvImportBatch::where('tenant_id', $tenant->id)
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get()
            ->map(fn($batch) => [
                'batch_id' => $batch->uid,
                'status' => $batch->status,
                'total_files' => $batch->total_files,
                'success_count' => $batch->success_count,
                'failed_count' => $batch->failed_count,
                'skipped_count' => $batch->skipped_count ?? 0,
                'progress_percentage' => $batch->getProgressPercentage(),
                'started_at' => $batch->started_at?->toISOString(),
                'completed_at' => $batch->completed_at?->toISOString(),
            ]);

        return response()->json($batches);
    }
}
