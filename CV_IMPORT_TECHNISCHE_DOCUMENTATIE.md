# CV Import - Technische Documentatie

Dit document beschrijft in detail hoe de twee CV import implementaties werken: **Smart CV Import** (kleine batches) en **Bulk CV Import** (grote volumes via Vertex AI).

---

## Inhoudsopgave

1. [Overzicht](#overzicht)
2. [Smart CV Import](#smart-cv-import)
3. [Bulk CV Import](#bulk-cv-import)
4. [Gedeelde Componenten](#gedeelde-componenten)
5. [Database Schema](#database-schema)
6. [Configuratie](#configuratie)

---

## Overzicht

| Feature | Smart CV Import | Bulk CV Import |
|---------|-----------------|----------------|
| **Use case** | 1-50 CV's tegelijk | 100+ CV's (tot 200.000) |
| **API** | Google AI Studio (Gemini API) | Google Vertex AI Batch API |
| **Verwerking** | Laravel Queue Jobs | Vertex AI async batch job |
| **Kosten** | Standaard Gemini pricing | 50% korting (batch pricing) |
| **Snelheid** | Real-time (seconden per CV) | 5-60 minuten voor hele batch |
| **Input** | Losse PDF/DOCX bestanden | ZIP bestand met CV's |

---

## Smart CV Import

### Architectuur

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│  Laravel Queue  │
│ SmartBulkImport │     │ ContactController│     │ ProcessCvImport │
│    Dialog       │     │                 │     │      Job        │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   Cloudflare    │◀────│  CvParsing      │
                        │       R2        │     │    Service      │
                        │   (CV opslag)   │     │  (Gemini API)   │
                        └─────────────────┘     └─────────────────┘
```

### Bestanden

#### Frontend

**`frontend/src/components/features/SmartBulkImportDialog.tsx`**

Dit is de React dialog component voor de Smart CV Import.

```typescript
// Belangrijkste functies:

// 1. File selectie met drag & drop
const handleDrop = (event: React.DragEvent) => {
  // Accepteert PDF en Word bestanden
  // Voegt toe aan selectedFiles state
};

// 2. Upload in batches van 5
const handleImport = async () => {
  const BATCH_SIZE = 5;
  for (let i = 0; i < selectedFiles.length; i += BATCH_SIZE) {
    const batch = selectedFiles.slice(i, i + BATCH_SIZE);
    const formData = new FormData();
    batch.forEach(file => formData.append('files[]', file));
    
    // POST naar /api/v1/contacts/smart-import
    const response = await API.post('/contacts/smart-import', formData);
    currentBatchId = response.batch_id;
  }
  // Start polling voor status updates
  startPolling(currentBatchId);
};

// 3. Status polling
const pollBatchStatus = async (batchId: string) => {
  // GET /api/v1/contacts/smart-import/{batchId}
  // Update UI met voortgang
};
```

**Locatie in UI:** Wordt geopend via een button op `/network` pagina.

---

#### Backend

**`backend/app/Http/Controllers/ContactController.php`**

Bevat twee endpoints voor Smart Import:

```php
// POST /api/v1/contacts/smart-import
public function smartBulkImport(Request $request): JsonResponse
{
    // 1. Valideer uploaded files (PDF/DOCX, max 10MB per file)
    $request->validate([
        'files' => ['required', 'array', 'max:10'],
        'files.*' => ['file', 'mimes:pdf,doc,docx', 'max:10240'],
    ]);

    // 2. Genereer batch ID voor tracking
    $batchId = (string) Str::ulid();
    $tenant = Tenant::current();

    // 3. Voor elk bestand: sla tijdelijk op en dispatch job
    foreach ($request->file('files') as $file) {
        $tempPath = $file->store("temp/cv-import/{$batchId}", 'local');
        
        ProcessCvImport::dispatch(
            storage_path("app/{$tempPath}"),
            $file->getClientOriginalName(),
            $tenant->id,
            $auth->id,
            $batchId
        );
    }

    // 4. Initialiseer batch tracking in cache
    Cache::put("cv_import_batch:{$batchId}", [
        'total' => count($files),
        'processed' => 0,
        'success' => [],
        'failed' => [],
    ], now()->addHours(24));

    return response()->json([
        'batch_id' => $batchId,
        'queued_count' => count($files),
    ]);
}

// GET /api/v1/contacts/smart-import/{batchId}
public function smartBulkImportStatus(string $batchId): JsonResponse
{
    // Haal status uit cache en return naar frontend
    $status = Cache::get("cv_import_batch:{$batchId}");
    return response()->json([
        'total' => $status['total'],
        'processed' => $status['processed'],
        'is_complete' => $status['processed'] >= $status['total'],
        // ...
    ]);
}
```

---

**`backend/app/Jobs/ProcessCvImport.php`**

Laravel Queue Job die één CV verwerkt:

```php
class ProcessCvImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;  // Max 5 pogingen
    public array $backoff = [10, 30, 60, 120, 300];  // Exponentiële backoff

    public function __construct(
        public string $tempFilePath,
        public string $originalFilename,
        public int $tenantId,
        public int $userId,
        public string $batchId
    ) {}

    public function handle(
        CvParsingService $cvParser,
        FileStorageService $fileStorage
    ): void {
        // 1. Zet tenant context
        $tenant = Tenant::find($this->tenantId);
        $tenant->makeCurrent();

        try {
            // 2. Parse CV met Gemini AI
            $data = $cvParser->parseCv($this->tempFilePath);

            // 3. Maak Contact record aan
            $contact = Contact::create([
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'prefix' => $data['prefix'] ?? null,
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'] ?? null,
                'location' => $data['location'] ?? null,
                'education' => $data['education'] ?? null,
                'company_role' => $data['current_role'] ?? null,
                'network_roles' => ['candidate'],
            ]);

            // 4. Upload CV naar R2
            $document = $fileStorage->uploadContactDocument(
                $this->tempFilePath,
                $contact,
                'cv',
                $this->originalFilename
            );

            // 5. Link CV URL naar contact
            $contact->cv_url = "/api/v1/contact-documents/{$document->id}/download";
            $contact->save();

            // 6. Update batch status (success)
            $this->updateBatchStatus(true, $contact->full_name);

        } catch (\Exception $e) {
            // Update batch status (failed)
            $this->updateBatchStatus(false, null, $e->getMessage());
            throw $e;  // Re-throw voor retry mechanisme
        }
    }

    // Bij permanente failure na alle retries
    public function failed(\Throwable $exception): void
    {
        $this->updateBatchStatus(false, null, $exception->getMessage());
    }
}
```

---

**`backend/app/Services/CvParsingService.php`**

Service voor tekst extractie en Gemini API calls:

```php
class CvParsingService
{
    private string $apiKey;
    private string $model;

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key');
        $this->model = config('services.gemini.model', 'gemini-1.5-flash');
    }

    /**
     * Volledige CV parsing pipeline
     */
    public function parseCv(string $filePath): array
    {
        // 1. Extraheer tekst uit bestand
        $text = $this->extractText($filePath);

        if (strlen(trim($text)) < 50) {
            throw new \Exception('Geen tekst gevonden in het bestand');
        }

        // 2. Stuur naar Gemini voor data extractie
        return $this->parseWithGemini($text);
    }

    /**
     * Tekst extractie uit PDF of Word
     */
    public function extractText(string $filePath): string
    {
        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

        return match ($extension) {
            'pdf' => $this->extractFromPdf($filePath),
            'doc', 'docx' => $this->extractFromWord($filePath),
            default => throw new \Exception("Unsupported file type: {$extension}"),
        };
    }

    /**
     * PDF tekst extractie met smalot/pdfparser
     */
    private function extractFromPdf(string $filePath): string
    {
        $parser = new \Smalot\PdfParser\Parser();
        $pdf = $parser->parseFile($filePath);
        return $pdf->getText();
    }

    /**
     * Word tekst extractie met PhpOffice/PhpWord
     */
    private function extractFromWord(string $filePath): string
    {
        $phpWord = \PhpOffice\PhpWord\IOFactory::load($filePath);
        $text = '';

        foreach ($phpWord->getSections() as $section) {
            foreach ($section->getElements() as $element) {
                $text .= $this->extractTextFromElement($element);
            }
        }

        // Fallback: raw XML parsing als tekst leeg is
        if (empty(trim($text))) {
            $text = $this->extractFromWordXml($filePath);
        }

        return $text;
    }

    /**
     * Gemini API call voor CV data extractie
     */
    private function parseWithGemini(string $text): array
    {
        $prompt = $this->getExtractionPrompt();

        $response = Http::post(
            "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent?key={$this->apiKey}",
            [
                'contents' => [
                    ['role' => 'user', 'parts' => [['text' => $prompt . "\n\nCV TEKST:\n" . $text]]]
                ],
                'generationConfig' => [
                    'temperature' => 0.1,
                    'maxOutputTokens' => 8192,
                ]
            ]
        );

        // Handle rate limits (429) - throw exception voor retry
        if ($response->status() === 429) {
            throw new \RuntimeException('Gemini API rate limit exceeded');
        }

        // Parse JSON response van Gemini
        $jsonText = $response->json('candidates.0.content.parts.0.text');
        
        // Strip markdown code blocks
        $jsonText = preg_replace('/^```json\s*/', '', $jsonText);
        $jsonText = preg_replace('/\s*```$/', '', $jsonText);

        $data = json_decode(trim($jsonText), true);

        // Valideer verplichte velden
        if (empty($data['first_name']) || empty($data['last_name'])) {
            throw new \Exception('Naam niet gevonden in CV');
        }

        return $data;
    }

    /**
     * Prompt voor Gemini
     */
    private function getExtractionPrompt(): string
    {
        return <<<PROMPT
Je bent een CV-parser. Analyseer de volgende CV-tekst en extraheer de kandidaatgegevens.

Geef het resultaat terug als JSON met ALLEEN deze velden:
- first_name: voornaam (VERPLICHT)
- prefix: tussenvoegsel zoals "van", "de", "van der" (optioneel)
- last_name: achternaam (VERPLICHT)
- email: e-mailadres (optioneel)
- phone: telefoonnummer (optioneel)
- location: woonplaats of stad (optioneel)
- education: hoogst genoten opleiding: "MBO", "HBO", of "UNI" (optioneel)
- current_role: huidige of meest recente functietitel (optioneel)
- skills: relevante vaardigheden, gescheiden door komma's (optioneel)

BELANGRIJK:
- Retourneer ALLEEN geldige JSON, geen andere tekst
- first_name en last_name zijn VERPLICHT
- Als je deze niet kunt vinden, retourneer: {"error": "Naam niet gevonden"}

JSON RESPONSE:
PROMPT;
    }
}
```

---

### Flow Diagram - Smart Import

```
1. Gebruiker selecteert CV bestanden in frontend
                    │
                    ▼
2. Frontend POST /contacts/smart-import (FormData met files[])
                    │
                    ▼
3. ContactController::smartBulkImport()
   - Valideert files
   - Slaat tijdelijk op
   - Dispatcht ProcessCvImport job per file
   - Initialiseert cache tracking
                    │
                    ▼
4. Laravel Queue Worker pikt jobs op
                    │
                    ▼
5. ProcessCvImport::handle()
   - Zet tenant context
   - Roept CvParsingService::parseCv() aan
                    │
                    ▼
6. CvParsingService
   - extractText(): PDF/Word → plain text
   - parseWithGemini(): text → structured JSON
                    │
                    ▼
7. ProcessCvImport (vervolg)
   - Maakt Contact record
   - Upload CV naar R2 (FileStorageService)
   - Maakt ContactDocument record
   - Update Contact.cv_url
   - Update cache met success/fail
                    │
                    ▼
8. Frontend pollt /contacts/smart-import/{batchId}
   - Toont voortgang
   - Bij completion: toont resultaten
```

---

## Bulk CV Import

### Architectuur

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│  BatchCvImport  │
│  BatchImport    │     │ BatchCvImport   │     │    Service      │
│     Page        │     │   Controller    │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌────────────────────────────────┼────────────────────────────────┐
                        │                                │                                │
                        ▼                                ▼                                ▼
               ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
               │  Google Cloud   │              │   Vertex AI     │              │   Cloudflare    │
               │    Storage      │─────────────▶│   Batch API     │              │       R2        │
               │  (JSONL input)  │              │  (Gemini 2.5)   │              │   (CV opslag)   │
               └─────────────────┘              └─────────────────┘              └─────────────────┘
```

### Bestanden

#### Frontend

**`frontend/src/pages/default/batch-import.tsx`**

Volledige pagina voor Bulk CV Import:

```typescript
// State management
const [pageState, setPageState] = useState<PageState>("idle");
// "idle" | "uploading" | "processing" | "complete"

const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);

// 1. ZIP file upload
const handleUpload = async () => {
  setPageState("uploading");
  
  const formData = new FormData();
  formData.append("file", selectedFile);

  // POST /api/v1/cv-import/batch
  const response = await API.post<{batch_id: string}>("/cv-import/batch", formData, {
    onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded / e.total) * 100))
  });

  setPageState("processing");
  startPolling(response.batch_id);
};

// 2. Status polling (elke 5 seconden)
const pollBatchStatus = async (batchId: string) => {
  // GET /api/v1/cv-import/batch/{batchId}
  const status = await API.get<BatchStatus>(`/cv-import/batch/${batchId}`);
  setBatchStatus(status);

  if (status.is_complete) {
    setPageState("complete");
    clearInterval(pollIntervalRef.current);
  }
};

// 3. UI States
// - idle: drag & drop zone voor ZIP
// - uploading: progress bar
// - processing: status chip + voortgang
// - complete: resultaten (success/failed counts)
```

**Route:** `/batch-import` (zie `frontend/src/router.tsx`)

---

#### Backend

**`backend/app/Http/Controllers/BatchCvImportController.php`**

Controller voor Bulk Import endpoints:

```php
class BatchCvImportController extends Controller
{
    public function __construct(
        protected BatchCvImportService $batchService
    ) {}

    /**
     * POST /api/v1/cv-import/batch
     * Upload ZIP en start batch verwerking
     */
    public function upload(Request $request): JsonResponse
    {
        // Alleen owners/admins mogen bulk importeren
        if (!in_array($request->user()->role, ['owner', 'admin'])) {
            abort(403);
        }

        $request->validate([
            'file' => ['required', 'file', 'mimes:zip', 'max:512000'], // Max 500MB
        ]);

        // 1. Maak batch record
        $batch = CvImportBatch::create([
            'tenant_id' => Tenant::current()->id,
            'user_id' => $request->user()->id,
            'status' => 'pending',
        ]);

        // 2. Sla ZIP tijdelijk op
        $zipPath = storage_path("app/temp/batch-{$batch->uid}/upload.zip");
        $request->file('file')->move(dirname($zipPath), 'upload.zip');

        // 3. Start verwerking
        $this->batchService->processZipFile($zipPath, $batch);

        return response()->json([
            'batch_id' => $batch->uid,
            'total_files' => $batch->total_files,
        ], 202);
    }

    /**
     * GET /api/v1/cv-import/batch/{batchUid}
     * Haal status op en check Vertex AI job indien nodig
     */
    public function status(Request $request, string $batchUid): JsonResponse
    {
        $batch = CvImportBatch::where('uid', $batchUid)
            ->where('tenant_id', Tenant::current()->id)
            ->firstOrFail();

        // Als nog processing, check Vertex AI status
        if ($batch->status === 'processing') {
            $this->batchService->checkAndProcessBatch($batch);
            $batch->refresh();
        }

        return response()->json([
            'batch_id' => $batch->uid,
            'status' => $batch->status,
            'total_files' => $batch->total_files,
            'success_count' => $batch->success_count,
            'failed_count' => $batch->failed_count,
            'progress_percentage' => $batch->getProgressPercentage(),
            'is_complete' => $batch->isComplete(),
            'failed_files' => $batch->failed_files ?? [],
            // ...
        ]);
    }
}
```

---

**`backend/app/Services/BatchCvImportService.php`**

Hoofd service voor Vertex AI Batch verwerking:

```php
class BatchCvImportService
{
    protected StorageClient $storageClient;  // Google Cloud Storage
    protected CvParsingService $cvParser;
    protected FileStorageService $fileStorage;
    protected string $projectId;
    protected string $bucket;
    protected string $location;

    /**
     * Verwerk een ZIP bestand met CV's
     */
    public function processZipFile(string $zipPath, CvImportBatch $batch): void
    {
        $batch->update(['status' => 'extracting', 'started_at' => now()]);

        $tempDir = storage_path("app/temp/batch-{$batch->uid}");

        // 1. Unzip
        $zip = new ZipArchive();
        $zip->open($zipPath);
        $zip->extractTo("{$tempDir}/extracted");
        $zip->close();

        // 2. Vind alle CV bestanden (recursief)
        $files = $this->findCvFiles("{$tempDir}/extracted");
        $batch->update(['total_files' => count($files)]);

        // 3. Maak JSONL input bestand voor Vertex AI
        $jsonlPath = "{$tempDir}/input.jsonl";
        $this->createJsonlFile($files, $jsonlPath, $batch);

        // 4. Upload JSONL naar Google Cloud Storage
        $gcsInputUri = $this->uploadToGcs($jsonlPath, "batches/{$batch->uid}/input.jsonl");

        // 5. Start Vertex AI Batch Prediction Job
        $jobName = $this->startBatchPredictionJob($batch);

        $batch->update([
            'gcs_input_uri' => $gcsInputUri,
            'gcs_output_uri' => "gs://{$this->bucket}/batches/{$batch->uid}/output/",
            'vertex_job_name' => $jobName,
            'status' => 'processing',
        ]);
    }

    /**
     * Maak JSONL bestand met Gemini requests
     */
    protected function createJsonlFile(array $files, string $outputPath, CvImportBatch $batch): void
    {
        $handle = fopen($outputPath, 'w');
        $fileMapping = [];
        $lineIndex = 0;

        $prompt = $this->getExtractionPrompt();

        foreach ($files as $filePath) {
            $filename = basename($filePath);

            // Extraheer tekst uit CV
            $text = $this->cvParser->extractText($filePath);

            if (strlen(trim($text)) < 50) {
                // Skip lege bestanden
                continue;
            }

            // JSONL formaat voor Vertex AI Batch
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

            // Bewaar mapping voor later
            $fileMapping[$lineIndex] = [
                'filename' => $filename,
                'filepath' => $filePath,
            ];
            $lineIndex++;
        }

        fclose($handle);

        // Sla mapping op voor result processing
        file_put_contents(dirname($outputPath) . "/file_mapping.json", json_encode($fileMapping));
    }

    /**
     * Start Vertex AI Batch Prediction Job
     */
    protected function startBatchPredictionJob(CvImportBatch $batch): string
    {
        $credentialsPath = base_path(config('services.google_cloud.credentials'));
        $apiEndpoint = "{$this->location}-aiplatform.googleapis.com";

        $client = new JobServiceClient([
            'credentials' => $credentialsPath,
            'apiEndpoint' => $apiEndpoint,  // EU endpoint voor GDPR
        ]);

        $parent = $client->locationName($this->projectId, $this->location);
        $modelName = config('services.google_cloud.model', 'gemini-2.5-flash');

        $inputConfig = (new InputConfig())
            ->setInstancesFormat('jsonl')
            ->setGcsSource((new GcsSource())->setUris([$batch->gcs_input_uri]));

        $outputConfig = (new OutputConfig())
            ->setPredictionsFormat('jsonl')
            ->setGcsDestination((new GcsDestination())->setOutputUriPrefix($batch->gcs_output_uri));

        $batchPredictionJob = (new BatchPredictionJob())
            ->setDisplayName("CV Import Batch {$batch->uid}")
            ->setModel("publishers/google/models/{$modelName}")
            ->setInputConfig($inputConfig)
            ->setOutputConfig($outputConfig);

        $request = (new CreateBatchPredictionJobRequest())
            ->setParent($parent)
            ->setBatchPredictionJob($batchPredictionJob);

        $response = $client->createBatchPredictionJob($request);
        $client->close();

        return $response->getName();
    }

    /**
     * Check Vertex AI job status en verwerk resultaten
     */
    public function checkAndProcessBatch(CvImportBatch $batch): void
    {
        if ($batch->status !== 'processing') {
            return;
        }

        $client = new JobServiceClient([
            'credentials' => base_path(config('services.google_cloud.credentials')),
            'apiEndpoint' => "{$this->location}-aiplatform.googleapis.com",
        ]);

        $job = $client->getBatchPredictionJob(
            (new GetBatchPredictionJobRequest())->setName($batch->vertex_job_name)
        );

        $state = $job->getState();

        // State 4 = SUCCEEDED, State 5 = FAILED
        if ($state === 4) {
            $this->processResults($batch);
        } elseif ($state === 5) {
            $error = $job->getError();
            $batch->update([
                'status' => 'failed',
                'error_message' => $error?->getMessage() ?? 'Vertex AI batch job failed',
                'completed_at' => now(),
            ]);
        }

        $client->close();
    }

    /**
     * Verwerk batch resultaten van GCS
     */
    protected function processResults(CvImportBatch $batch): void
    {
        $bucket = $this->storageClient->bucket($this->bucket);

        // Laad file mapping
        $tempDir = storage_path("app/temp/batch-{$batch->uid}");
        $fileMapping = json_decode(file_get_contents("{$tempDir}/file_mapping.json"), true);

        // Download en parse output JSONL van GCS
        $outputPrefix = str_replace("gs://{$this->bucket}/", '', $batch->gcs_output_uri);
        $objects = $bucket->objects(['prefix' => $outputPrefix]);

        $lineIndex = 0;
        $successCount = 0;
        $failedFiles = [];

        foreach ($objects as $object) {
            if (!str_ends_with($object->name(), '.jsonl')) continue;

            $content = $object->downloadAsString();
            $lines = explode("\n", trim($content));

            foreach ($lines as $line) {
                if (empty($line)) continue;

                $result = json_decode($line, true);
                $fileInfo = $fileMapping[$lineIndex] ?? null;
                $lineIndex++;

                // Parse Gemini response
                $text = $result['response']['candidates'][0]['content']['parts'][0]['text'] ?? null;

                if (!$text) {
                    $failedFiles[] = ['filename' => $fileInfo['filename'], 'reason' => 'Geen response'];
                    continue;
                }

                // Parse JSON uit Gemini response
                $text = preg_replace('/^```json\s*/', '', $text);
                $text = preg_replace('/\s*```$/', '', $text);
                $data = json_decode(trim($text), true);

                if (empty($data['first_name']) || empty($data['last_name'])) {
                    $failedFiles[] = ['filename' => $fileInfo['filename'], 'reason' => 'Naam niet gevonden'];
                    continue;
                }

                // Maak Contact aan
                $contact = Contact::create([
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    // ... andere velden
                ]);

                // Upload CV naar R2
                if ($fileInfo['filepath'] && file_exists($fileInfo['filepath'])) {
                    $this->uploadCvToR2($contact, $fileInfo['filepath'], $fileInfo['filename'], $batch->tenant_id);
                }

                $successCount++;
            }
        }

        $batch->update([
            'status' => 'completed',
            'success_count' => $successCount,
            'failed_count' => count($failedFiles),
            'failed_files' => $failedFiles,
            'completed_at' => now(),
        ]);

        // Cleanup temp files
        $this->cleanupTempFiles($batch);
    }
}
```

---

**`backend/app/Models/CvImportBatch.php`**

Eloquent model voor batch tracking:

```php
class CvImportBatch extends Model
{
    protected $connection = 'landlord';  // Centrale tracking

    protected $fillable = [
        'uid', 'tenant_id', 'user_id', 'status',
        'total_files', 'extracted_files', 'processed_files',
        'success_count', 'failed_count',
        'gcs_input_uri', 'gcs_output_uri', 'vertex_job_name',
        'error_message', 'failed_files',
        'started_at', 'completed_at',
    ];

    protected $casts = [
        'failed_files' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function isComplete(): bool
    {
        return in_array($this->status, ['completed', 'failed']);
    }

    public function getProgressPercentage(): int
    {
        if ($this->total_files === 0) return 0;
        return (int) round(($this->processed_files / $this->total_files) * 100);
    }
}
```

---

### Flow Diagram - Bulk Import

```
1. Gebruiker uploadt ZIP bestand
                    │
                    ▼
2. BatchCvImportController::upload()
   - Maakt CvImportBatch record
   - Roept BatchCvImportService aan
                    │
                    ▼
3. BatchCvImportService::processZipFile()
   │
   ├─▶ Unzip naar temp directory
   │
   ├─▶ findCvFiles(): zoek alle PDF/DOCX
   │
   ├─▶ createJsonlFile():
   │   - Voor elk bestand: extractText()
   │   - Maak JSONL met Gemini requests
   │   - Sla file_mapping.json op
   │
   ├─▶ uploadToGcs(): upload JSONL naar GCS
   │
   └─▶ startBatchPredictionJob():
       - Maak Vertex AI BatchPredictionJob
       - Return job name
                    │
                    ▼
4. Frontend pollt /cv-import/batch/{id}
                    │
                    ▼
5. BatchCvImportController::status()
   └─▶ checkAndProcessBatch()
       - Check Vertex AI job state
       - Als SUCCEEDED: processResults()
                    │
                    ▼
6. processResults()
   - Download output JSONL van GCS
   - Parse elke response
   - Maak Contact records
   - Upload CV's naar R2
   - Update batch status
                    │
                    ▼
7. Frontend toont resultaten
```

---

## Gedeelde Componenten

### FileStorageService

**`backend/app/Services/FileStorageService.php`**

Abstractie laag voor Cloudflare R2 storage:

```php
class FileStorageService
{
    /**
     * Upload document voor een contact
     */
    public function uploadContactDocument(
        string $localPath,
        Contact $contact,
        string $type,
        string $originalFilename
    ): ContactDocument {
        $extension = pathinfo($originalFilename, PATHINFO_EXTENSION);
        $tenant = Tenant::current();

        $storagePath = sprintf(
            '%s/contacts/%s/%s-%s.%s',
            $tenant->id,
            $contact->uid,
            $type,
            now()->format('Y-m-d-His'),
            $extension
        );

        Storage::disk('r2')->put($storagePath, file_get_contents($localPath), 'private');

        return ContactDocument::create([
            'contact_id' => $contact->id,
            'type' => $type,
            'original_filename' => $originalFilename,
            'storage_path' => $storagePath,
            'mime_type' => mime_content_type($localPath),
            'file_size' => filesize($localPath),
        ]);
    }

    /**
     * Genereer signed URL voor download
     */
    public function getSignedUrl(string $path, int $expiresInMinutes = 60): string
    {
        // R2 signed URL generation
    }

    /**
     * Verwijder bestand uit R2
     */
    public function delete(string $path): bool
    {
        return Storage::disk('r2')->delete($path);
    }
}
```

---

### ContactDocument Model

**`backend/app/Models/ContactDocument.php`**

```php
class ContactDocument extends Model
{
    protected $fillable = [
        'contact_id', 'type', 'original_filename',
        'storage_path', 'mime_type', 'file_size',
    ];

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }
}
```

---

### ContactDocumentController

**`backend/app/Http/Controllers/ContactDocumentController.php`**

```php
class ContactDocumentController extends Controller
{
    /**
     * GET /api/v1/contact-documents/{id}/download
     */
    public function download(Request $request, int $id)
    {
        $document = ContactDocument::findOrFail($id);

        // Genereer signed URL en redirect
        $signedUrl = app(FileStorageService::class)
            ->getSignedUrl($document->storage_path);

        return redirect($signedUrl);
    }
}
```

---

## Database Schema

### Tenant Database (per klant)

```sql
-- contacts tabel
CREATE TABLE contacts (
    id BIGSERIAL PRIMARY KEY,
    uid VARCHAR(26) UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    prefix VARCHAR(50),
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    location VARCHAR(255),
    education VARCHAR(10),  -- MBO, HBO, UNI
    company_role VARCHAR(255),
    cv_url VARCHAR(500),  -- Link naar /api/v1/contact-documents/{id}/download
    network_roles JSONB,
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP  -- Soft delete
);

-- contact_documents tabel
CREATE TABLE contact_documents (
    id BIGSERIAL PRIMARY KEY,
    contact_id BIGINT REFERENCES contacts(id),
    type VARCHAR(50),  -- 'cv', 'certificate', etc.
    original_filename VARCHAR(255),
    storage_path VARCHAR(500),  -- R2 path
    mime_type VARCHAR(100),
    file_size BIGINT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Landlord Database (centraal)

```sql
-- cv_import_batches tabel (voor Bulk Import tracking)
CREATE TABLE cv_import_batches (
    id BIGSERIAL PRIMARY KEY,
    uid VARCHAR(26) UNIQUE NOT NULL,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    total_files INT DEFAULT 0,
    extracted_files INT DEFAULT 0,
    processed_files INT DEFAULT 0,
    success_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    gcs_input_uri VARCHAR(500),
    gcs_output_uri VARCHAR(500),
    vertex_job_name VARCHAR(500),
    error_message TEXT,
    failed_files JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- jobs tabel (Laravel Queue)
CREATE TABLE jobs (
    id BIGSERIAL PRIMARY KEY,
    queue VARCHAR(255) NOT NULL,
    payload TEXT NOT NULL,
    attempts SMALLINT NOT NULL,
    reserved_at INT,
    available_at INT NOT NULL,
    created_at INT NOT NULL
);
```

---

## Configuratie

### Environment Variables

```env
# Gemini API (voor Smart Import)
GEMINI_API_KEY=your-api-key
GEMINI_MODEL=gemini-1.5-flash

# Google Cloud (voor Bulk Import)
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_BUCKET=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=storage/app/google-credentials.json
VERTEX_AI_LOCATION=europe-west4
VERTEX_AI_MODEL=gemini-2.5-flash

# Cloudflare R2 (CV opslag)
R2_ACCESS_KEY_ID=your-key
R2_SECRET_ACCESS_KEY=your-secret
R2_BUCKET=your-bucket
R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
```

### Config Files

**`backend/config/services.php`**
```php
return [
    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-1.5-flash'),
    ],
    'google_cloud' => [
        'project_id' => env('GOOGLE_CLOUD_PROJECT'),
        'bucket' => env('GOOGLE_CLOUD_BUCKET'),
        'credentials' => env('GOOGLE_APPLICATION_CREDENTIALS'),
        'location' => env('VERTEX_AI_LOCATION', 'europe-west4'),
        'model' => env('VERTEX_AI_MODEL', 'gemini-2.5-flash'),
    ],
];
```

**`backend/config/filesystems.php`**
```php
'disks' => [
    'r2' => [
        'driver' => 's3',
        'key' => env('R2_ACCESS_KEY_ID'),
        'secret' => env('R2_SECRET_ACCESS_KEY'),
        'region' => 'auto',
        'bucket' => env('R2_BUCKET'),
        'endpoint' => env('R2_ENDPOINT'),
    ],
];
```

---

## Artisan Commands

```bash
# Test Gemini API verbinding
php artisan gemini:test

# Check batch import status
php artisan cv:status
php artisan cv:status {batch_id}

# Check en process pending batches
php artisan cv:check-batches

# Queue worker starten
php artisan queue:work --queue=default
```

---

## Samenvatting

| Aspect | Smart Import | Bulk Import |
|--------|--------------|-------------|
| **Frontend** | `SmartBulkImportDialog.tsx` | `batch-import.tsx` |
| **Controller** | `ContactController` | `BatchCvImportController` |
| **Service** | `CvParsingService` | `BatchCvImportService` |
| **Job/Async** | `ProcessCvImport` (Laravel Queue) | Vertex AI Batch Job |
| **Tracking** | Cache (Redis/File) | `CvImportBatch` model (DB) |
| **API** | Google AI Studio | Google Vertex AI |
| **Storage** | Cloudflare R2 | GCS (temp) + R2 (final) |
