<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Jobs\ProcessCvImport;
use App\Services\GeocodingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Http\Requests\StoreContactRequest;
use Spatie\Multitenancy\Models\Tenant;

class ContactController extends Controller
{
    public function index(Request $request)
    {
        $auth = $request->user();

        $query = Contact::query();

        // Apply radius filter if provided
        if ($request->has('lat') && $request->has('lng') && $request->has('radius')) {
            $lat = (float) $request->input('lat');
            $lng = (float) $request->input('lng');
            $radius = (float) $request->input('radius');
            
            $query->withinRadius($lat, $lng, $radius);
        } else {
            $query->orderBy('last_name')->orderBy('first_name');
        }

        $contacts = $query->get()->toArray();

        return response()->json($contacts);
    }

    /**
     * Geocode a location string to coordinates
     */
    public function geocode(Request $request, GeocodingService $geocoder)
    {
        $request->validate([
            'location' => ['required', 'string', 'max:255'],
        ]);

        $coords = $geocoder->geocode($request->input('location'));

        if (!$coords) {
            return response()->json([
                'message' => 'Locatie niet gevonden',
            ], 404);
        }

        return response()->json($coords);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreContactRequest $request)
    {
        $auth = $request->user();

        if (!$auth->can('create', Contact::class)) {
            abort(403, 'This action is unauthorized.');
        }

        $data = $request->validated();

        $contact = Contact::create($data);

        return response()->json($contact, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, string $contact)
    {
        $auth = $request->user();

        // Find contact by uid (tenant context is already set by database connection)
        $contactModel = Contact::where('uid', $contact)->firstOrFail();

        if (!$auth->can('view', $contactModel)) {
            abort(403, 'This action is unauthorized.');
        }

        return response()->json($contactModel);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $contact)
    {
        $auth = $request->user();

        // Find contact by uid (tenant context is already set by database connection)
        $contactModel = Contact::where('uid', $contact)->firstOrFail();

        // Authorization check
        if (!$auth->can('update', $contactModel)) {
            abort(403, 'This action is unauthorized.');
        }

        $data = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'prefix' => ['nullable', 'string', 'max:32'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'date_of_birth' => ['nullable', 'date'],
            'gender' => ['nullable', 'string', 'max:16'],
            'location' => ['nullable', 'string', 'max:255'],
            'company_role' => ['nullable', 'string', 'max:255'],
            'network_roles' => ['nullable', 'array'],
            'network_roles.*' => ['string', 'max:64'],
            'current_company' => ['nullable', 'string', 'max:255'],
            'current_salary_cents' => ['nullable', 'integer', 'min:0'],
            'education' => ['nullable', 'in:MBO,HBO,UNI'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'linkedin_url' => ['nullable', 'url', 'max:255'],
            'cv_url' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        // Prevent modifying protected fields
        unset($data['tenant_id'], $data['uid']);

        $contactModel->fill($data)->save();

        return response()->json($contactModel);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $contact)
    {
        $auth = $request->user();

        // Find contact by uid (route parameter name is 'contact' but contains the uid value)
        // Note: tenant context is already set by database connection, no need for tenant_id filter
        $contactModel = Contact::where('uid', $contact)->firstOrFail();

        // Authorization check
        if (!$auth->can('delete', $contactModel)) {
            abort(403, 'This action is unauthorized.');
        }

        // Delete all documents from R2 storage
        $fileService = app(\App\Services\FileStorageService::class);
        foreach ($contactModel->documents as $document) {
            if ($document->storage_path) {
                try {
                    $fileService->delete($document->storage_path);
                } catch (\Exception $e) {
                    Log::warning('Failed to delete document from R2', [
                        'contact_id' => $contactModel->id,
                        'document_id' => $document->id,
                        'path' => $document->storage_path,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
            $document->delete();
        }

        // Soft delete - sets deleted_at timestamp but keeps the record in database
        // This allows for data recovery and audit trails
        $contactModel->delete();

        return response()->json(['message' => 'Kandidaat succesvol verwijderd'], 200);
    }

    /**
     * Get all contacts with candidate network roles
     * Returns contacts where network_roles contains: candidate, candidate_placed, or candidate_rejected
     */
    public function candidates(Request $request)
    {
        $query = Contact::query()
            ->where(function ($query) {
                $query->whereJsonContains('network_roles', 'candidate')
                    ->orWhereJsonContains('network_roles', 'candidate_placed')
                    ->orWhereJsonContains('network_roles', 'candidate_rejected');
            });

        // Apply radius filter if provided
        if ($request->has('lat') && $request->has('lng') && $request->has('radius')) {
            $lat = (float) $request->input('lat');
            $lng = (float) $request->input('lng');
            $radius = (float) $request->input('radius');
            
            $query->withinRadius($lat, $lng, $radius);
        } else {
            $query->orderBy('last_name')->orderBy('first_name');
        }

        $candidates = $query->get()->toArray();

        return response()->json($candidates);
    }

    /**
     * Smart bulk import CVs using AI parsing
     * Accepts multiple CV files and queues them for processing
     */
    public function smartBulkImport(Request $request)
    {
        $auth = $request->user();

        // Authorization: owners, admins, and recruiters can bulk import
        if (!in_array($auth->role, ['owner', 'admin', 'recruiter'])) {
            abort(403, 'Je hebt geen toestemming om bulk import uit te voeren');
        }

        $request->validate([
            'files' => ['required', 'array', 'min:1', 'max:50'],
            'files.*' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:10240'], // 10MB max per file
            'batch_id' => ['nullable', 'string', 'max:26'], // Optional: join existing batch
        ]);

        $tenant = Tenant::current();
        if (!$tenant) {
            abort(403, 'Geen tenant context gevonden');
        }

        // Use existing batch_id or generate new one
        $batchId = $request->input('batch_id');
        $isExistingBatch = false;

        if ($batchId) {
            // Check if batch exists
            $existingData = cache()->get("cv_import_batch:{$batchId}");
            if ($existingData) {
                $isExistingBatch = true;
            } else {
                // Invalid batch_id, generate new one
                $batchId = (string) Str::ulid();
            }
        } else {
            $batchId = (string) Str::ulid();
        }

        // Create temp directory for imports
        $tempDir = storage_path("app/temp/imports/{$batchId}");
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $queuedCount = 0;
        $files = $request->file('files');

        foreach ($files as $file) {
            $originalName = $file->getClientOriginalName();
            $tempPath = $tempDir . '/' . uniqid() . '_' . $originalName;

            // Move file to temp location
            $file->move(dirname($tempPath), basename($tempPath));

            // Dispatch job to process this CV
            ProcessCvImport::dispatch(
                $tempPath,
                $originalName,
                $tenant->id,
                $auth->id,
                $batchId
            );

            $queuedCount++;
        }

        // Initialize or update batch tracking in cache
        if ($isExistingBatch) {
            $existingData = cache()->get("cv_import_batch:{$batchId}");
            $existingData['total'] = ($existingData['total'] ?? 0) + $queuedCount;
            cache()->put("cv_import_batch:{$batchId}", $existingData, now()->addHours(24));
        } else {
            cache()->put("cv_import_batch:{$batchId}", [
                'success' => [],
                'failed' => [],
                'skipped' => [],
                'total' => $queuedCount,
                'started_at' => now()->toISOString(),
            ], now()->addHours(24));
        }

        return response()->json([
            'message' => "{$queuedCount} CV's in de wachtrij geplaatst voor verwerking",
            'batch_id' => $batchId,
            'queued_count' => $queuedCount,
        ], 202);
    }

    /**
     * Get the status of a smart bulk import batch
     */
    public function smartBulkImportStatus(Request $request, string $batchId)
    {
        $auth = $request->user();

        // Authorization: owners, admins, and recruiters can view import status
        if (!in_array($auth->role, ['owner', 'admin', 'recruiter'])) {
            abort(403, 'Je hebt geen toestemming om import status te bekijken');
        }

        $cacheKey = "cv_import_batch:{$batchId}";
        $data = cache()->get($cacheKey);

        if (!$data) {
            return response()->json([
                'message' => 'Batch niet gevonden of verlopen',
            ], 404);
        }

        $successCount = count($data['success'] ?? []);
        $failedCount = count($data['failed'] ?? []);
        $skippedCount = count($data['skipped'] ?? []);
        $totalCount = $data['total'] ?? 0;
        $processedCount = $successCount + $failedCount + $skippedCount;

        return response()->json([
            'batch_id' => $batchId,
            'total' => $totalCount,
            'processed' => $processedCount,
            'success_count' => $successCount,
            'failed_count' => $failedCount,
            'skipped_count' => $skippedCount,
            'is_complete' => $processedCount >= $totalCount,
            'success' => $data['success'] ?? [],
            'failed' => $data['failed'] ?? [],
            'skipped' => $data['skipped'] ?? [],
            'started_at' => $data['started_at'] ?? null,
        ]);
    }
}
