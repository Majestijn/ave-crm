<?php

namespace App\Services;

use App\Models\CvImportBatch;
use App\Models\Contact;
use App\Models\ContactDocument;
use Google\Cloud\Storage\StorageClient;
use Google\Cloud\AIPlatform\V1\Client\JobServiceClient;
use Google\Cloud\AIPlatform\V1\BatchPredictionJob;
use Google\Cloud\AIPlatform\V1\GcsSource;
use Google\Cloud\AIPlatform\V1\GcsDestination;
use Google\Cloud\AIPlatform\V1\GetBatchPredictionJobRequest;
use Google\Cloud\AIPlatform\V1\CreateBatchPredictionJobRequest;
use Google\Cloud\AIPlatform\V1\BatchPredictionJob\InputConfig;
use Google\Cloud\AIPlatform\V1\BatchPredictionJob\OutputConfig;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ZipArchive;

class BatchCvImportService
{
    protected StorageClient $storageClient;
    protected CvParsingService $cvParser;
    protected FileStorageService $fileStorage;
    protected string $projectId;
    protected string $bucket;
    protected string $location;

    public function __construct(CvParsingService $cvParser, FileStorageService $fileStorage)
    {
        $this->cvParser = $cvParser;
        $this->fileStorage = $fileStorage;
        $this->projectId = config('services.google_cloud.project_id');
        $this->bucket = config('services.google_cloud.bucket');
        $this->location = config('services.google_cloud.location', 'europe-west4');

        $credentialsPath = base_path(config('services.google_cloud.credentials'));

        $this->storageClient = new StorageClient([
            'keyFilePath' => $credentialsPath,
            'projectId' => $this->projectId,
        ]);
    }

    /**
     * Process a ZIP file containing CVs
     */
    public function processZipFile(string $zipPath, CvImportBatch $batch): void
    {
        $batch->update(['status' => 'extracting', 'started_at' => now()]);

        $tempDir = storage_path("app/temp/batch-{$batch->uid}");
        $extractedDir = "{$tempDir}/extracted";

        try {
            // Create temp directories
            if (!is_dir($extractedDir)) {
                mkdir($extractedDir, 0755, true);
            }

            // Extract ZIP
            $zip = new ZipArchive();
            if ($zip->open($zipPath) !== true) {
                throw new \Exception('Kan ZIP bestand niet openen');
            }

            $zip->extractTo($extractedDir);
            $zip->close();

            // Find all CV files
            $files = $this->findCvFiles($extractedDir);
            $batch->update(['total_files' => count($files)]);

            if (count($files) === 0) {
                throw new \Exception('Geen CV bestanden gevonden in ZIP');
            }

            // Extract text from all CVs and create JSONL
            $jsonlPath = "{$tempDir}/input.jsonl";
            $this->createJsonlFile($files, $jsonlPath, $batch);

            // Upload JSONL to GCS
            $gcsInputUri = $this->uploadToGcs($jsonlPath, "batches/{$batch->uid}/input.jsonl");
            $gcsOutputUri = "gs://{$this->bucket}/batches/{$batch->uid}/output/";

            $batch->update([
                'gcs_input_uri' => $gcsInputUri,
                'gcs_output_uri' => $gcsOutputUri,
                'status' => 'processing',
            ]);

            // Start Vertex AI batch job
            $jobName = $this->startBatchPredictionJob($batch);
            $batch->update(['vertex_job_name' => $jobName]);

            Log::info('Batch CV import started', [
                'batch_id' => $batch->id,
                'total_files' => count($files),
                'job_name' => $jobName,
            ]);
        } catch (\Exception $e) {
            Log::error('Batch CV import failed', [
                'batch_id' => $batch->id,
                'error' => $e->getMessage(),
            ]);

            $batch->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);

            throw $e;
        } finally {
            // Keep temp files for now - will be cleaned up after processing results
        }
    }

    /**
     * Find all CV files in a directory recursively
     */
    protected function findCvFiles(string $directory): array
    {
        $files = [];
        $allowedExtensions = ['pdf', 'doc', 'docx'];

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($directory, \RecursiveDirectoryIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $extension = strtolower($file->getExtension());
                if (in_array($extension, $allowedExtensions)) {
                    // Skip hidden/system files
                    if (strpos($file->getFilename(), '.') !== 0 && strpos($file->getFilename(), '__MACOSX') === false) {
                        $files[] = $file->getPathname();
                    }
                }
            }
        }

        return $files;
    }

    /**
     * Create JSONL file with prompts for each CV
     */
    protected function createJsonlFile(array $files, string $outputPath, CvImportBatch $batch): void
    {
        $handle = fopen($outputPath, 'w');
        $failedFiles = [];
        $extractedCount = 0;
        $fileMapping = []; // Store index -> filepath mapping

        $prompt = $this->getExtractionPrompt();
        $lineIndex = 0;

        foreach ($files as $filePath) {
            $filename = basename($filePath);

            try {
                $text = $this->cvParser->extractText($filePath);

                if (empty(trim($text)) || strlen(trim($text)) < 50) {
                    $failedFiles[] = [
                        'filename' => $filename,
                        'reason' => 'Geen tekst gevonden in bestand',
                    ];
                    continue;
                }

                // Create request object for Vertex AI Batch Prediction
                // Format: must have "request" wrapper according to Google docs
                $request = [
                    'request' => [
                        'contents' => [
                            [
                                'role' => 'user',
                                'parts' => [
                                    ['text' => $prompt . "\n\nCV TEKST:\n" . $text]
                                ]
                            ]
                        ],
                        'generationConfig' => [
                            'temperature' => 0.1,
                            'maxOutputTokens' => 8192,
                        ]
                    ]
                ];

                fwrite($handle, json_encode($request) . "\n");

                // Store mapping for later result processing
                $fileMapping[$lineIndex] = [
                    'filename' => $filename,
                    'filepath' => $filePath,
                ];
                $lineIndex++;
                $extractedCount++;
            } catch (\Exception $e) {
                $failedFiles[] = [
                    'filename' => $filename,
                    'reason' => $e->getMessage(),
                ];
            }
        }

        fclose($handle);

        // Save file mapping to temp directory
        $tempDir = dirname($outputPath);
        file_put_contents("{$tempDir}/file_mapping.json", json_encode($fileMapping));

        $batch->update([
            'extracted_files' => $extractedCount,
            'failed_files' => $failedFiles,
            'failed_count' => count($failedFiles),
        ]);
    }

    /**
     * Get the extraction prompt
     */
    protected function getExtractionPrompt(): string
    {
        return <<<PROMPT
Je bent een CV-parser. Analyseer de volgende CV-tekst en extraheer de kandidaatgegevens.

Geef het resultaat terug als JSON met ALLEEN deze velden:
- first_name: voornaam (VERPLICHT)
- prefix: tussenvoegsel zoals "van", "de", "van der" (optioneel, alleen als aanwezig)
- last_name: achternaam (VERPLICHT)
- date_of_birth: geboortedatum in formaat YYYY-MM-DD (optioneel)
- email: e-mailadres (optioneel)
- phone: telefoonnummer (optioneel)
- location: woonplaats of stad (optioneel)
- education: hoogst genoten opleiding, moet één van deze zijn: "MBO", "HBO", of "UNI" (optioneel)
- current_company: huidige of meest recente werkgever/bedrijfsnaam (optioneel)
- current_role: huidige of meest recente functietitel (optioneel)
- skills: relevante vaardigheden, gescheiden door komma's (optioneel)

BELANGRIJK:
- Retourneer ALLEEN geldige JSON, geen andere tekst
- Als je een veld niet kunt vinden, laat het dan weg uit de JSON
- first_name en last_name zijn VERPLICHT - als je deze niet kunt vinden, retourneer dan: {"error": "Naam niet gevonden"}
- Zorg dat Nederlandse namen correct worden geparsed (bijv. "Jan van der Berg" = first_name: "Jan", prefix: "van der", last_name: "Berg")

JSON RESPONSE:
PROMPT;
    }

    /**
     * Upload file to Google Cloud Storage
     */
    protected function uploadToGcs(string $localPath, string $gcsPath): string
    {
        $bucket = $this->storageClient->bucket($this->bucket);
        $bucket->upload(
            fopen($localPath, 'r'),
            ['name' => $gcsPath]
        );

        return "gs://{$this->bucket}/{$gcsPath}";
    }

    /**
     * Start Vertex AI batch prediction job
     */
    protected function startBatchPredictionJob(CvImportBatch $batch): string
    {
        $credentialsPath = base_path(config('services.google_cloud.credentials'));

        // Use region-specific endpoint for EU data residency
        $apiEndpoint = "{$this->location}-aiplatform.googleapis.com";

        $client = new JobServiceClient([
            'credentials' => $credentialsPath,
            'apiEndpoint' => $apiEndpoint,
        ]);

        try {
            $parent = $client->locationName($this->projectId, $this->location);

            // Model resource name for Gemini (use VERTEX_AI_MODEL from .env)
            $modelName = config('services.google_cloud.model', 'gemini-2.0-flash-001');
            $model = "publishers/google/models/{$modelName}";

            $inputConfig = (new InputConfig())
                ->setInstancesFormat('jsonl')
                ->setGcsSource(
                    (new GcsSource())->setUris([$batch->gcs_input_uri])
                );

            $outputConfig = (new OutputConfig())
                ->setPredictionsFormat('jsonl')
                ->setGcsDestination(
                    (new GcsDestination())->setOutputUriPrefix($batch->gcs_output_uri)
                );

            $batchPredictionJob = (new BatchPredictionJob())
                ->setDisplayName("CV Import Batch {$batch->uid}")
                ->setModel($model)
                ->setInputConfig($inputConfig)
                ->setOutputConfig($outputConfig);

            $request = (new CreateBatchPredictionJobRequest())
                ->setParent($parent)
                ->setBatchPredictionJob($batchPredictionJob);

            $response = $client->createBatchPredictionJob($request);

            return $response->getName();
        } finally {
            $client->close();
        }
    }

    /**
     * Check batch job status and process results if complete
     */
    public function checkAndProcessBatch(CvImportBatch $batch): void
    {
        if ($batch->status !== 'processing' || !$batch->vertex_job_name) {
            return;
        }

        $credentialsPath = base_path(config('services.google_cloud.credentials'));

        // Use region-specific endpoint for EU data residency
        $apiEndpoint = "{$this->location}-aiplatform.googleapis.com";

        $client = new JobServiceClient([
            'credentials' => $credentialsPath,
            'apiEndpoint' => $apiEndpoint,
        ]);

        try {
            $request = (new GetBatchPredictionJobRequest())
                ->setName($batch->vertex_job_name);

            $job = $client->getBatchPredictionJob($request);
            $state = $job->getState();

            // Get error details if available
            $error = $job->getError();
            $errorMessage = $error ? $error->getMessage() : null;

            Log::info('Batch job status check', [
                'batch_id' => $batch->id,
                'state' => $state,
                'error' => $errorMessage,
            ]);

            // State values: JOB_STATE_UNSPECIFIED, JOB_STATE_QUEUED, JOB_STATE_PENDING, 
            // JOB_STATE_RUNNING, JOB_STATE_SUCCEEDED, JOB_STATE_FAILED, JOB_STATE_CANCELLING, 
            // JOB_STATE_CANCELLED, JOB_STATE_PAUSED, JOB_STATE_EXPIRED

            if ($state === 4) { // JOB_STATE_SUCCEEDED
                $this->processResults($batch);
            } elseif ($state === 5) { // JOB_STATE_FAILED
                $batch->update([
                    'status' => 'failed',
                    'error_message' => $errorMessage ?? 'Vertex AI batch job failed',
                    'completed_at' => now(),
                ]);

                Log::error('Vertex AI batch job failed', [
                    'batch_id' => $batch->id,
                    'job_name' => $batch->vertex_job_name,
                    'error' => $errorMessage,
                ]);
            }
        } finally {
            $client->close();
        }
    }

    /**
     * Process batch results from GCS
     */
    protected function processResults(CvImportBatch $batch): void
    {
        $bucket = $this->storageClient->bucket($this->bucket);
        $outputPrefix = str_replace("gs://{$this->bucket}/", '', $batch->gcs_output_uri);

        // List all output files
        $objects = $bucket->objects(['prefix' => $outputPrefix]);

        $successCount = 0;
        $failedFiles = $batch->failed_files ?? [];
        $skippedFiles = $batch->skipped_files ?? [];
        $tempDir = storage_path("app/temp/batch-{$batch->uid}");

        // Load file mapping
        $mappingPath = "{$tempDir}/file_mapping.json";
        $fileMapping = [];
        if (file_exists($mappingPath)) {
            $fileMapping = json_decode(file_get_contents($mappingPath), true) ?? [];
        }

        $lineIndex = 0;

        foreach ($objects as $object) {
            if (!str_ends_with($object->name(), '.jsonl')) {
                continue;
            }

            $content = $object->downloadAsString();
            $lines = explode("\n", trim($content));

            foreach ($lines as $line) {
                if (empty($line)) continue;

                $result = json_decode($line, true);
                if (!$result) continue;

                // Get file info from mapping using line index
                $fileInfo = $fileMapping[$lineIndex] ?? null;
                $filename = $fileInfo['filename'] ?? "line_{$lineIndex}";
                $filepath = $fileInfo['filepath'] ?? null;
                $lineIndex++;

                // Extract the response - Vertex AI format has "response" wrapper
                $response = $result['response'] ?? $result;
                $candidates = $response['candidates'] ?? [];
                $text = $candidates[0]['content']['parts'][0]['text'] ?? null;

                if (!$text) {
                    $failedFiles[] = [
                        'filename' => $filename,
                        'reason' => 'Geen response van Gemini',
                    ];
                    continue;
                }

                // Parse JSON response
                $text = preg_replace('/^```json\s*/', '', $text);
                $text = preg_replace('/\s*```$/', '', $text);
                $data = json_decode(trim($text), true);

                if (!$data || isset($data['error'])) {
                    $failedFiles[] = [
                        'filename' => $filename,
                        'reason' => $data['error'] ?? 'Ongeldige JSON response',
                    ];
                    continue;
                }

                if (empty($data['first_name']) || empty($data['last_name'])) {
                    $failedFiles[] = [
                        'filename' => $filename,
                        'reason' => 'Naam niet gevonden',
                    ];
                    continue;
                }

                // Normalize names (proper case, not ALL CAPS)
                $data['first_name'] = $this->normalizeName($data['first_name']);
                $data['last_name'] = $this->normalizeName($data['last_name']);
                if (!empty($data['prefix'])) {
                    $data['prefix'] = mb_strtolower($data['prefix']);
                }

                // Check for duplicate contact (case-insensitive name and email comparison)
                $existingContact = Contact::whereRaw('LOWER(first_name) = ?', [mb_strtolower($data['first_name'])])
                    ->whereRaw('LOWER(last_name) = ?', [mb_strtolower($data['last_name'])])
                    ->when(!empty($data['email']), function ($query) use ($data) {
                        return $query->whereRaw('LOWER(email) = ?', [mb_strtolower($data['email'])]);
                    })
                    ->first();

                if ($existingContact) {
                    Log::info('Batch CV import: Duplicate contact skipped', [
                        'filename' => $filename,
                        'existing_contact_id' => $existingContact->id,
                        'name' => $data['first_name'] . ' ' . $data['last_name'],
                    ]);
                    $skippedFiles[] = [
                        'filename' => $filename,
                        'reason' => 'Contact met deze naam' . (!empty($data['email']) ? ' en email' : '') . ' bestaat al',
                    ];
                    continue;
                }

                // Create contact
                try {
                    $contact = Contact::create([
                        'first_name' => $data['first_name'],
                        'prefix' => $data['prefix'] ?? null,
                        'last_name' => $data['last_name'],
                        'date_of_birth' => $data['date_of_birth'] ?? null,
                        'email' => $data['email'] ?? null,
                        'phone' => $data['phone'] ?? null,
                        'location' => $data['location'] ?? null,
                        'education' => $this->normalizeEducation($data['education'] ?? null),
                        'current_company' => $data['current_company'] ?? null,
                        'company_role' => $data['current_role'] ?? null,
                        'notes' => isset($data['skills']) ? "Skills: {$data['skills']}" : null,
                        'network_roles' => ['candidate'],
                    ]);

                    // Upload CV to R2 if filepath exists
                    if ($filepath && file_exists($filepath)) {
                        $this->uploadCvToR2($contact, $filepath, $filename, $batch->tenant_id);
                    }

                    $successCount++;
                } catch (\Exception $e) {
                    $failedFiles[] = [
                        'filename' => $filename,
                        'reason' => 'Database error: ' . $e->getMessage(),
                    ];
                }
            }
        }

        $batch->update([
            'status' => 'completed',
            'processed_files' => $batch->extracted_files,
            'success_count' => $successCount,
            'failed_count' => count($failedFiles),
            'skipped_count' => count($skippedFiles),
            'failed_files' => $failedFiles,
            'skipped_files' => $skippedFiles,
            'completed_at' => now(),
        ]);

        // Cleanup temp files
        $this->cleanupTempFiles($batch);

        Log::info('Batch CV import completed', [
            'batch_id' => $batch->id,
            'success_count' => $successCount,
            'failed_count' => count($failedFiles),
        ]);
    }

    /**
     * Upload CV to R2 storage
     */
    protected function uploadCvToR2(Contact $contact, string $filepath, string $filename, int $tenantId): void
    {
        $extension = pathinfo($filename, PATHINFO_EXTENSION);
        $mimeType = match (strtolower($extension)) {
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            default => 'application/octet-stream',
        };

        $storagePath = sprintf(
            '%s/contacts/%s/cv-%s.%s',
            $tenantId,
            $contact->uid,
            now()->format('Y-m-d-His'),
            $extension
        );

        Storage::disk('r2')->put($storagePath, file_get_contents($filepath), 'private');

        $document = ContactDocument::create([
            'contact_id' => $contact->id,
            'type' => 'cv',
            'original_filename' => $filename,
            'storage_path' => $storagePath,
            'mime_type' => $mimeType,
            'file_size' => filesize($filepath),
        ]);

        $contact->cv_url = "/api/v1/contact-documents/{$document->id}/download";
        $contact->save();
    }

    /**
     * Normalize education value
     */
    protected function normalizeEducation(?string $education): ?string
    {
        if (!$education) return null;

        $education = strtoupper(trim($education));

        if (in_array($education, ['MBO', 'HBO', 'UNI'])) {
            return $education;
        }

        $mapping = [
            'UNIVERSITEIT' => 'UNI',
            'UNIVERSITY' => 'UNI',
            'WO' => 'UNI',
            'MASTER' => 'UNI',
            'BACHELOR' => 'HBO',
            'HOGESCHOOL' => 'HBO',
        ];

        return $mapping[$education] ?? null;
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
     * Cleanup temporary files
     */
    protected function cleanupTempFiles(CvImportBatch $batch): void
    {
        $tempDir = storage_path("app/temp/batch-{$batch->uid}");

        if (is_dir($tempDir)) {
            $this->deleteDirectory($tempDir);
        }
    }

    /**
     * Recursively delete a directory
     */
    protected function deleteDirectory(string $dir): void
    {
        if (!is_dir($dir)) return;

        $files = array_diff(scandir($dir), ['.', '..']);

        foreach ($files as $file) {
            $path = "{$dir}/{$file}";
            is_dir($path) ? $this->deleteDirectory($path) : unlink($path);
        }

        rmdir($dir);
    }
}
