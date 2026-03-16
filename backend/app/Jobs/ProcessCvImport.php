<?php

namespace App\Jobs;

use App\Models\Contact;
use App\Models\ContactDocument;
use App\Services\CvParsingService;
use App\Services\FileStorageService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Spatie\Multitenancy\Models\Tenant;

class ProcessCvImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Number of times the job may be attempted.
     */
    public int $tries = 5;

    /**
     * Exponential backoff times in seconds.
     * This helps with Gemini API rate limiting (429 errors).
     */
    public array $backoff = [10, 30, 60, 120, 300];

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $tempFilePath,
        public string $originalFilename,
        public int $tenantId,
        public int $userId,
        public string $batchId,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(CvParsingService $cvParser, FileStorageService $fileStorage): void
    {
        // Set the tenant context
        $tenant = Tenant::find($this->tenantId);
        if (!$tenant) {
            Log::error('ProcessCvImport: Tenant not found', ['tenant_id' => $this->tenantId]);
            $this->recordFailure('Tenant niet gevonden');
            return;
        }

        $tenant->makeCurrent();

        try {
            // Check if temp file exists
            if (!file_exists($this->tempFilePath)) {
                Log::error('ProcessCvImport: Temp file not found', ['path' => $this->tempFilePath]);
                $this->recordFailure('Tijdelijk bestand niet gevonden');
                return;
            }

            // Parse the CV
            $result = $cvParser->parseCv($this->tempFilePath);

            if (!$result['success']) {
                Log::warning('ProcessCvImport: CV parsing failed', [
                    'file' => $this->originalFilename,
                    'error' => $result['error'],
                ]);
                $this->recordFailure($result['error']);
                return;
            }

            $data = $result['data'];

            // Normalize names (proper case, not ALL CAPS)
            $data['first_name'] = $this->normalizeName($data['first_name']);
            $data['last_name'] = $this->normalizeName($data['last_name']);
            if (!empty($data['prefix'])) {
                $data['prefix'] = mb_strtolower($data['prefix']);
            }

            // Check for duplicate contact: match on first_name + last_name only.
            // Excel-imported contacts often have no email; CV import should update them, not create duplicates.
            $firstNameLower = mb_strtolower(trim($data['first_name'] ?? ''));
            $lastNameLower = mb_strtolower(trim($data['last_name'] ?? ''));
            $existingContact = Contact::whereRaw('LOWER(TRIM(first_name)) = ?', [$firstNameLower])
                ->whereRaw('LOWER(TRIM(last_name)) = ?', [$lastNameLower])
                ->first();

            Log::info('ProcessCvImport: Duplicate check', [
                'search' => ['first' => $firstNameLower, 'last' => $lastNameLower],
                'found' => $existingContact?->id,
            ]);

            $isUpdate = (bool) $existingContact;

            if ($existingContact) {
                $contact = $existingContact;

                // Update contact with new data from CV (overwrites with parsed values when present)
                $contact->update([
                    'date_of_birth' => $data['date_of_birth'] ?? $contact->date_of_birth,
                    'email' => $data['email'] ?? $contact->email,
                    'phone' => $data['phone'] ?? $contact->phone,
                    'location' => $data['location'] ?? $contact->location,
                    'education' => $data['education'] ?? $contact->education,
                    'current_company' => $data['current_company'] ?? $contact->current_company,
                    'company_role' => $data['current_role'] ?? $contact->company_role,
                    'notes' => isset($data['skills']) ? "Skills: {$data['skills']}" : $contact->notes,
                ]);

                // Replace work experiences with new data from CV
                $contact->workExperiences()->delete();
                $workExperiences = $data['work_experiences'] ?? [];
                if (is_array($workExperiences) && !empty($workExperiences)) {
                    foreach ($workExperiences as $idx => $we) {
                        $jobTitle = $we['job_title'] ?? null;
                        $companyName = $we['company_name'] ?? null;
                        if (empty($jobTitle) || empty($companyName)) {
                            continue;
                        }
                        $startDate = $we['start_date'] ?? null;
                        if (empty($startDate)) {
                            continue;
                        }
                        $contact->workExperiences()->create([
                            'job_title' => $jobTitle,
                            'company_name' => $companyName,
                            'start_date' => $startDate,
                            'end_date' => $we['end_date'] ?? null,
                            'location' => $we['location'] ?? null,
                            'description' => $we['description'] ?? null,
                            'sort_order' => $idx,
                        ]);
                    }
                    $contact->syncCurrentRoleFromWorkExperiences();
                }
            } else {
                // Create the contact
                $contact = Contact::create([
                    'first_name' => $data['first_name'],
                    'prefix' => $data['prefix'] ?? null,
                    'last_name' => $data['last_name'],
                    'date_of_birth' => $data['date_of_birth'] ?? null,
                    'email' => $data['email'] ?? null,
                    'phone' => $data['phone'] ?? null,
                    'location' => $data['location'] ?? null,
                    'education' => $data['education'] ?? null,
                    'current_company' => $data['current_company'] ?? null,
                    'company_role' => $data['current_role'] ?? null,
                    'notes' => isset($data['skills']) ? "Skills: {$data['skills']}" : null,
                    'network_roles' => ['candidate'], // Default role for imported CVs
                ]);

                // Create work experiences from parsed data
                $workExperiences = $data['work_experiences'] ?? [];
                if (is_array($workExperiences) && !empty($workExperiences)) {
                    foreach ($workExperiences as $idx => $we) {
                        $jobTitle = $we['job_title'] ?? null;
                        $companyName = $we['company_name'] ?? null;
                        if (empty($jobTitle) || empty($companyName)) {
                            continue;
                        }
                        $startDate = $we['start_date'] ?? null;
                        if (empty($startDate)) {
                            continue;
                        }
                        $contact->workExperiences()->create([
                            'job_title' => $jobTitle,
                            'company_name' => $companyName,
                            'start_date' => $startDate,
                            'end_date' => $we['end_date'] ?? null,
                            'location' => $we['location'] ?? null,
                            'description' => $we['description'] ?? null,
                            'sort_order' => $idx,
                        ]);
                    }
                    $contact->syncCurrentRoleFromWorkExperiences();
                }
            }

            // Upload the CV to R2 (both for new contacts and updates)
            $extension = pathinfo($this->originalFilename, PATHINFO_EXTENSION);
            $mimeType = $this->getMimeType($extension);
            $fileSize = filesize($this->tempFilePath);
            $fileContent = file_get_contents($this->tempFilePath);

            // Create a unique filename
            $storagePath = sprintf(
                '%s/contacts/%s/cv-%s.%s',
                $this->tenantId,
                $contact->uid,
                now()->format('Y-m-d-His'),
                $extension
            );

            // Upload to R2
            Storage::disk('r2')->put($storagePath, $fileContent, 'private');

            // Create ContactDocument record
            ContactDocument::create([
                'contact_id' => $contact->id,
                'type' => 'cv',
                'original_filename' => $this->originalFilename,
                'storage_path' => $storagePath,
                'mime_type' => $mimeType,
                'file_size' => $fileSize,
            ]);

            // Record success
            $this->recordSuccess($contact, $isUpdate);

            Log::info($isUpdate ? 'ProcessCvImport: Successfully updated contact from CV' : 'ProcessCvImport: Successfully imported CV', [
                'contact_id' => $contact->id,
                'name' => $contact->name,
                'file' => $this->originalFilename,
            ]);
        } catch (\Exception $e) {
            Log::error('ProcessCvImport: Exception during import', [
                'file' => $this->originalFilename,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            $this->recordFailure($e->getMessage());
            throw $e; // Re-throw to trigger retry
        } finally {
            // Clean up temp file
            if (file_exists($this->tempFilePath)) {
                unlink($this->tempFilePath);
            }
        }
    }

    /**
     * Record successful import in cache for batch tracking
     *
     * @param bool $updated True when an existing contact was updated (duplicate was found and updated)
     */
    protected function recordSuccess(Contact $contact, bool $updated = false): void
    {
        $cacheKey = "cv_import_batch:{$this->batchId}";
        $data = cache()->get($cacheKey, ['success' => [], 'failed' => []]);
        $data['success'][] = [
            'filename' => $this->originalFilename,
            'contact_id' => $contact->id,
            'contact_uid' => $contact->uid,
            'name' => $contact->name,
            'updated' => $updated,
        ];
        cache()->put($cacheKey, $data, now()->addHours(24));
    }

    /**
     * Record failed import in cache for batch tracking
     */
    protected function recordFailure(string $reason): void
    {
        $cacheKey = "cv_import_batch:{$this->batchId}";
        $data = cache()->get($cacheKey, ['success' => [], 'failed' => [], 'skipped' => []]);
        $data['failed'][] = [
            'filename' => $this->originalFilename,
            'reason' => $reason,
        ];
        cache()->put($cacheKey, $data, now()->addHours(24));

        // Clean up temp file on failure
        if (file_exists($this->tempFilePath)) {
            unlink($this->tempFilePath);
        }
    }

    /**
     * Record skipped import (duplicate) in cache for batch tracking
     */
    protected function recordSkipped(string $reason): void
    {
        $cacheKey = "cv_import_batch:{$this->batchId}";
        $data = cache()->get($cacheKey, ['success' => [], 'failed' => [], 'skipped' => []]);
        $data['skipped'][] = [
            'filename' => $this->originalFilename,
            'reason' => $reason,
        ];
        cache()->put($cacheKey, $data, now()->addHours(24));

        // Clean up temp file
        if (file_exists($this->tempFilePath)) {
            unlink($this->tempFilePath);
        }
    }

    /**
     * Get MIME type from extension
     */
    protected function getMimeType(string $extension): string
    {
        return match (strtolower($extension)) {
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            default => 'application/octet-stream',
        };
    }

    /**
     * Normalize a name to proper case (handle ALL CAPS, all lowercase, etc.)
     */
    protected function normalizeName(string $name): string
    {
        $name = trim($name);

        // If all uppercase or all lowercase, convert to proper case
        if (mb_strtoupper($name) === $name || mb_strtolower($name) === $name) {
            // Handle hyphenated names (e.g., "JEAN-PIERRE" -> "Jean-Pierre")
            $parts = explode('-', $name);
            $parts = array_map(fn($part) => mb_convert_case($part, MB_CASE_TITLE, 'UTF-8'), $parts);
            return implode('-', $parts);
        }

        return $name;
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('ProcessCvImport: Job failed permanently', [
            'file' => $this->originalFilename,
            'error' => $exception->getMessage(),
        ]);
        $this->recordFailure('Job failed: ' . $exception->getMessage());
    }
}
