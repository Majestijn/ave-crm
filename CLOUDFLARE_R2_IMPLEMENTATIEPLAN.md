# Cloudflare R2 Implementatieplan - AVE CRM

## Overzicht

Dit document beschrijft de implementatie van Cloudflare R2 voor bestandsopslag in de AVE CRM SaaS applicatie. R2 wordt gebruikt voor:
- **Notitie afbeeldingen** bij opdrachten (assignments)
- **CV's en documenten** bij contactpersonen

### Architectuur

```
┌─────────────────────────────────────────────────────────────────┐
│                        AVE CRM SaaS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐     ┌─────────────┐     ┌──────────────────┐ │
│   │   Frontend  │────▶│   Laravel   │────▶│  Cloudflare R2   │ │
│   │   (React)   │     │   Backend   │     │   (jouw account) │ │
│   └─────────────┘     └─────────────┘     └──────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│                       ┌─────────────┐                          │
│                       │  PostgreSQL │                          │
│                       │ (file URLs) │                          │
│                       └─────────────┘                          │
│                                                                 │
│   Tenant A ─────┐                                              │
│   Tenant B ─────┼───▶  Alle bestanden in één R2 bucket        │
│   Tenant C ─────┘      gescheiden door tenant_id prefix        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Mappenstructuur in R2

```
ave-crm-files/
├── {tenant_id}/
│   ├── assignments/
│   │   └── {assignment_uid}/
│   │       └── notes-2025-01-08-143022.jpg
│   │
│   └── contacts/
│       └── {contact_uid}/
│           ├── cv-2025-01-08-143022.pdf
│           └── certificate-2025-01-08-150000.pdf
```

---

## Fase 1: Cloudflare Account & R2 Setup

### Stap 1.1: Cloudflare Account aanmaken

1. Ga naar **https://dash.cloudflare.com/sign-up**
2. Vul in:
   - E-mailadres (gebruik een algemeen bedrijfsadres, bijv. `admin@jouwbedrijf.nl`)
   - Wachtwoord (bewaar in password manager!)
3. Verifieer je e-mailadres via de link in je inbox

### Stap 1.2: R2 Activeren

1. Log in op **https://dash.cloudflare.com**
2. Klik in de linker sidebar op **"R2 Object Storage"**
3. Klik op **"Get started with R2"** of **"Purchase R2"**
4. Accepteer de voorwaarden
   - ℹ️ Geen creditcard nodig voor gratis tier
   - Gratis tier: 10GB opslag, 10M reads, 1M writes per maand

### Stap 1.3: R2 Bucket aanmaken

1. Klik op **"Create bucket"**
2. Configureer:
   | Veld | Waarde |
   |------|--------|
   | Bucket name | `ave-crm-files` |
   | Location | `Automatic` of `Europe (WEUR)` voor GDPR |
3. Klik op **"Create bucket"**

### Stap 1.4: API Token aanmaken

1. Ga naar **R2** → **Overview** → rechterkolom
2. Klik op **"Manage R2 API Tokens"**
3. Klik op **"Create API Token"**
4. Configureer:
   | Veld | Waarde |
   |------|--------|
   | Token name | `ave-crm-backend` |
   | Permissions | `Object Read & Write` |
   | Specify bucket(s) | ✅ Selecteer `ave-crm-files` |
   | TTL | Laat leeg (permanent) |
5. Klik op **"Create API Token"**
6. **⚠️ BELANGRIJK - Kopieer en bewaar veilig:**

```
Access Key ID:     [kopieer dit]
Secret Access Key: [kopieer dit]  
Endpoint URL:      https://[account_id].r2.cloudflarestorage.com
```

> 💡 Bewaar deze in een password manager. De Secret Access Key wordt maar één keer getoond!

### Stap 1.5: Account ID vinden

1. Ga naar **R2** → **Overview**
2. In de rechterkolom zie je **"Account ID"**
3. Kopieer deze (nodig voor de endpoint URL)

---

## Fase 2: Laravel Backend Configuratie

### Stap 2.1: AWS S3 Flysystem Installeren

```bash
cd backend
composer require league/flysystem-aws-s3-v3 "^3.0"
```

### Stap 2.2: Environment Variables

Voeg toe aan `backend/.env`:

```env
# ===========================================
# Cloudflare R2 Configuration
# ===========================================
R2_ACCESS_KEY_ID=jouw_access_key_id_hier
R2_SECRET_ACCESS_KEY=jouw_secret_access_key_hier
R2_BUCKET=ave-crm-files
R2_ENDPOINT=https://JOUW_ACCOUNT_ID.r2.cloudflarestorage.com
R2_REGION=auto
```

Voeg ook toe aan `backend/.env.example` (zonder echte waarden):

```env
# Cloudflare R2 Configuration
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=ave-crm-files
R2_ENDPOINT=
R2_REGION=auto
```

### Stap 2.3: Filesystem Disk Configureren

Bewerk `backend/config/filesystems.php`:

```php
<?php

return [

    'default' => env('FILESYSTEM_DISK', 'local'),

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app'),
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        // Cloudflare R2 disk
        'r2' => [
            'driver' => 's3',
            'key' => env('R2_ACCESS_KEY_ID'),
            'secret' => env('R2_SECRET_ACCESS_KEY'),
            'region' => env('R2_REGION', 'auto'),
            'bucket' => env('R2_BUCKET'),
            'endpoint' => env('R2_ENDPOINT'),
            'use_path_style_endpoint' => true,
            'throw' => true,
        ],

    ],

];
```

---

## Fase 3: Database Migraties

### Stap 3.1: Assignments tabel uitbreiden

```bash
cd backend
php artisan make:migration add_notes_image_to_assignments_table
```

Bewerk de gegenereerde migratie:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assignments', function (Blueprint $table) {
            $table->string('notes_image_path')->nullable()->after('employment_type');
        });
    }

    public function down(): void
    {
        Schema::table('assignments', function (Blueprint $table) {
            $table->dropColumn('notes_image_path');
        });
    }
};
```

### Stap 3.2: Contact Documents tabel aanmaken

```bash
php artisan make:migration create_contact_documents_table
```

Bewerk de gegenereerde migratie:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id')->constrained()->onDelete('cascade');
            $table->string('type'); // 'cv', 'certificate', 'other'
            $table->string('original_filename');
            $table->string('storage_path');
            $table->string('mime_type');
            $table->unsignedBigInteger('file_size'); // bytes
            $table->timestamps();
            
            $table->index(['contact_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_documents');
    }
};
```

### Stap 3.3: Migraties uitvoeren

```bash
php artisan migrate
```

> ⚠️ Voor multi-tenant: zorg dat de migraties in de tenant database draaien!

---

## Fase 4: Laravel Models

### Stap 4.1: ContactDocument Model

```bash
php artisan make:model ContactDocument
```

Bewerk `backend/app/Models/ContactDocument.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'contact_id',
        'type',
        'original_filename',
        'storage_path',
        'mime_type',
        'file_size',
    ];

    protected $casts = [
        'file_size' => 'integer',
    ];

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * Get human readable file size
     */
    public function getFormattedFileSizeAttribute(): string
    {
        $bytes = $this->file_size;
        
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 1) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 1) . ' KB';
        }
        
        return $bytes . ' bytes';
    }
}
```

### Stap 4.2: Contact Model uitbreiden

Voeg toe aan `backend/app/Models/Contact.php`:

```php
use Illuminate\Database\Eloquent\Relations\HasMany;

// In de Contact class:

public function documents(): HasMany
{
    return $this->hasMany(ContactDocument::class);
}

public function cvDocuments(): HasMany
{
    return $this->hasMany(ContactDocument::class)->where('type', 'cv');
}
```

### Stap 4.3: Assignment Model uitbreiden

Voeg toe aan `backend/app/Models/Assignment.php` (in $fillable):

```php
protected $fillable = [
    // ... bestaande velden ...
    'notes_image_path',
];
```

---

## Fase 5: File Storage Service

### Stap 5.1: Service aanmaken

Maak `backend/app/Services/FileStorageService.php`:

```php
<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class FileStorageService
{
    protected string $disk = 'r2';

    /**
     * Upload assignment notes image
     */
    public function uploadAssignmentNotesImage(
        string $tenantId,
        string $assignmentUid,
        UploadedFile $file
    ): string {
        $extension = $file->getClientOriginalExtension();
        $filename = sprintf(
            'notes-%s.%s',
            now()->format('Y-m-d-His'),
            $extension
        );
        
        $path = sprintf(
            '%s/assignments/%s/%s',
            $tenantId,
            $assignmentUid,
            $filename
        );

        Storage::disk($this->disk)->put(
            $path, 
            $file->getContent(),
            'private'
        );

        return $path;
    }

    /**
     * Upload contact document (CV, certificate, etc.)
     */
    public function uploadContactDocument(
        string $tenantId,
        string $contactUid,
        UploadedFile $file,
        string $type = 'cv'
    ): array {
        $extension = $file->getClientOriginalExtension();
        $filename = sprintf(
            '%s-%s.%s',
            $type,
            now()->format('Y-m-d-His'),
            $extension
        );
        
        $path = sprintf(
            '%s/contacts/%s/%s',
            $tenantId,
            $contactUid,
            $filename
        );

        Storage::disk($this->disk)->put(
            $path, 
            $file->getContent(),
            'private'
        );

        return [
            'path' => $path,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
        ];
    }

    /**
     * Get temporary signed URL for secure access
     */
    public function getSignedUrl(string $path, int $expiresInMinutes = 60): string
    {
        return Storage::disk($this->disk)->temporaryUrl(
            $path,
            now()->addMinutes($expiresInMinutes)
        );
    }

    /**
     * Delete file from storage
     */
    public function delete(string $path): bool
    {
        return Storage::disk($this->disk)->delete($path);
    }

    /**
     * Check if file exists
     */
    public function exists(string $path): bool
    {
        return Storage::disk($this->disk)->exists($path);
    }

    /**
     * Get file contents
     */
    public function get(string $path): ?string
    {
        return Storage::disk($this->disk)->get($path);
    }
}
```

### Stap 5.2: Service Provider registreren (optioneel)

Als je dependency injection wilt gebruiken, voeg toe aan `backend/app/Providers/AppServiceProvider.php`:

```php
use App\Services\FileStorageService;

public function register(): void
{
    $this->app->singleton(FileStorageService::class, function ($app) {
        return new FileStorageService();
    });
}
```

---

## Fase 6: Controllers

### Stap 6.1: Assignment Controller uitbreiden

Voeg toe aan je bestaande AssignmentController (of maak aparte methods):

```php
<?php

// In AssignmentController.php

use App\Services\FileStorageService;
use Illuminate\Http\Request;

/**
 * Upload notes image for assignment
 */
public function uploadNotesImage(Request $request, string $uid)
{
    $request->validate([
        'notes_image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // max 5MB
    ]);

    $assignment = Assignment::where('uid', $uid)->firstOrFail();
    $tenantId = tenant('id');
    
    $fileService = new FileStorageService();

    // Delete old image if exists
    if ($assignment->notes_image_path) {
        $fileService->delete($assignment->notes_image_path);
    }

    // Upload new image
    $path = $fileService->uploadAssignmentNotesImage(
        $tenantId,
        $uid,
        $request->file('notes_image')
    );

    $assignment->update(['notes_image_path' => $path]);

    return response()->json([
        'message' => 'Afbeelding geüpload',
        'notes_image_path' => $path,
        'notes_image_url' => $fileService->getSignedUrl($path),
    ]);
}

/**
 * Delete notes image from assignment
 */
public function deleteNotesImage(string $uid)
{
    $assignment = Assignment::where('uid', $uid)->firstOrFail();
    
    if ($assignment->notes_image_path) {
        $fileService = new FileStorageService();
        $fileService->delete($assignment->notes_image_path);
        
        $assignment->update(['notes_image_path' => null]);
    }

    return response()->json([
        'message' => 'Afbeelding verwijderd',
    ]);
}
```

### Stap 6.2: ContactDocument Controller aanmaken

```bash
php artisan make:controller Api/V1/ContactDocumentController
```

Bewerk `backend/app/Http/Controllers/Api/V1/ContactDocumentController.php`:

```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactDocument;
use App\Services\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ContactDocumentController extends Controller
{
    public function __construct(
        protected FileStorageService $fileService
    ) {}

    /**
     * List all documents for a contact
     */
    public function index(string $contactUid): JsonResponse
    {
        $contact = Contact::where('uid', $contactUid)->firstOrFail();
        
        $documents = $contact->documents->map(function ($doc) {
            return [
                'id' => $doc->id,
                'type' => $doc->type,
                'filename' => $doc->original_filename,
                'mime_type' => $doc->mime_type,
                'size' => $doc->file_size,
                'size_formatted' => $doc->formatted_file_size,
                'uploaded_at' => $doc->created_at->toIso8601String(),
                'download_url' => $this->fileService->getSignedUrl($doc->storage_path),
            ];
        });

        return response()->json($documents);
    }

    /**
     * Upload a new document
     */
    public function store(Request $request, string $contactUid): JsonResponse
    {
        $request->validate([
            'document' => 'required|file|mimes:pdf,doc,docx|max:10240', // max 10MB
            'type' => 'required|in:cv,certificate,other',
        ]);

        $contact = Contact::where('uid', $contactUid)->firstOrFail();
        $tenantId = tenant('id');

        $fileData = $this->fileService->uploadContactDocument(
            $tenantId,
            $contactUid,
            $request->file('document'),
            $request->input('type')
        );

        $document = ContactDocument::create([
            'contact_id' => $contact->id,
            'type' => $request->input('type'),
            'original_filename' => $fileData['original_filename'],
            'storage_path' => $fileData['path'],
            'mime_type' => $fileData['mime_type'],
            'file_size' => $fileData['file_size'],
        ]);

        return response()->json([
            'message' => 'Document geüpload',
            'document' => [
                'id' => $document->id,
                'type' => $document->type,
                'filename' => $document->original_filename,
                'mime_type' => $document->mime_type,
                'size' => $document->file_size,
                'size_formatted' => $document->formatted_file_size,
                'uploaded_at' => $document->created_at->toIso8601String(),
                'download_url' => $this->fileService->getSignedUrl($document->storage_path),
            ],
        ], 201);
    }

    /**
     * Download/view a document
     */
    public function show(string $contactUid, int $documentId): JsonResponse
    {
        $contact = Contact::where('uid', $contactUid)->firstOrFail();
        $document = $contact->documents()->findOrFail($documentId);

        return response()->json([
            'download_url' => $this->fileService->getSignedUrl($document->storage_path, 5), // 5 min expiry
        ]);
    }

    /**
     * Delete a document
     */
    public function destroy(string $contactUid, int $documentId): JsonResponse
    {
        $contact = Contact::where('uid', $contactUid)->firstOrFail();
        $document = $contact->documents()->findOrFail($documentId);

        // Delete from storage
        $this->fileService->delete($document->storage_path);
        
        // Delete from database
        $document->delete();

        return response()->json([
            'message' => 'Document verwijderd',
        ]);
    }
}
```

---

## Fase 7: API Routes

Voeg toe aan `backend/routes/api.php`:

```php
<?php

use App\Http\Controllers\Api\V1\ContactDocumentController;

// Binnen je bestaande route group voor v1:

Route::middleware(['auth:sanctum', 'tenant'])->prefix('v1')->group(function () {
    
    // ... bestaande routes ...

    // Assignment notes image
    Route::post('/assignments/{uid}/notes-image', [AssignmentController::class, 'uploadNotesImage']);
    Route::delete('/assignments/{uid}/notes-image', [AssignmentController::class, 'deleteNotesImage']);

    // Contact documents (CV's, certificates)
    Route::prefix('contacts/{contactUid}/documents')->group(function () {
        Route::get('/', [ContactDocumentController::class, 'index']);
        Route::post('/', [ContactDocumentController::class, 'store']);
        Route::get('/{documentId}', [ContactDocumentController::class, 'show']);
        Route::delete('/{documentId}', [ContactDocumentController::class, 'destroy']);
    });

});
```

---

## Fase 8: Frontend Implementatie

### Stap 8.1: API Client voor File Uploads

Maak `frontend/src/api/mutations/files.ts`:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queries/keys";

const getBaseUrl = () =>
  `${window.location.protocol}//${window.location.hostname}:8080/api/v1`;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
});

/**
 * Upload notes image for an assignment
 */
export const useUploadAssignmentNotesImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, file }: { uid: string; file: File }) => {
      const formData = new FormData();
      formData.append("notes_image", file);

      const response = await fetch(
        `${getBaseUrl()}/assignments/${uid}/notes-image`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload mislukt");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },
  });
};

/**
 * Delete notes image from an assignment
 */
export const useDeleteAssignmentNotesImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uid: string) => {
      const response = await fetch(
        `${getBaseUrl()}/assignments/${uid}/notes-image`,
        {
          method: "DELETE",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Verwijderen mislukt");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },
  });
};

/**
 * Upload document (CV) for a contact
 */
export const useUploadContactDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactUid,
      file,
      type,
    }: {
      contactUid: string;
      file: File;
      type: "cv" | "certificate" | "other";
    }) => {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("type", type);

      const response = await fetch(
        `${getBaseUrl()}/contacts/${contactUid}/documents`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload mislukt");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
};

/**
 * Delete document from a contact
 */
export const useDeleteContactDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactUid,
      documentId,
    }: {
      contactUid: string;
      documentId: number;
    }) => {
      const response = await fetch(
        `${getBaseUrl()}/contacts/${contactUid}/documents/${documentId}`,
        {
          method: "DELETE",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Verwijderen mislukt");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
    },
  });
};
```

### Stap 8.2: Query Keys uitbreiden

Voeg toe aan `frontend/src/api/queries/keys.ts`:

```typescript
export const queryKeys = {
  // ... bestaande keys ...
  
  contactDocuments: {
    all: (contactUid: string) => ["contacts", contactUid, "documents"] as const,
  },
} as const;
```

### Stap 8.3: Query voor Contact Documents

Maak `frontend/src/api/queries/contactDocuments.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import API from "../client";
import { queryKeys } from "./keys";

export type ContactDocument = {
  id: number;
  type: "cv" | "certificate" | "other";
  filename: string;
  mime_type: string;
  size: number;
  size_formatted: string;
  uploaded_at: string;
  download_url: string;
};

export const useContactDocuments = (contactUid: string | undefined) => {
  return useQuery<ContactDocument[]>({
    queryKey: queryKeys.contactDocuments.all(contactUid!),
    queryFn: async () => {
      return await API.get(`/contacts/${contactUid}/documents`);
    },
    enabled: !!contactUid,
  });
};
```

---

## Fase 9: Testen

### Stap 9.1: Test R2 Connectie

Maak een test command om de R2 verbinding te testen:

```bash
php artisan make:command TestR2Connection
```

```php
<?php
// app/Console/Commands/TestR2Connection.php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class TestR2Connection extends Command
{
    protected $signature = 'r2:test';
    protected $description = 'Test Cloudflare R2 connection';

    public function handle()
    {
        $this->info('Testing R2 connection...');

        try {
            // Try to list files (empty bucket is fine)
            $files = Storage::disk('r2')->files();
            $this->info('✅ Connection successful!');
            $this->info('Files in bucket: ' . count($files));

            // Try to write a test file
            $testPath = 'test/connection-test.txt';
            Storage::disk('r2')->put($testPath, 'Test content - ' . now());
            $this->info('✅ Write test successful!');

            // Try to read it back
            $content = Storage::disk('r2')->get($testPath);
            $this->info('✅ Read test successful!');
            $this->info('Content: ' . $content);

            // Clean up
            Storage::disk('r2')->delete($testPath);
            $this->info('✅ Delete test successful!');

            $this->newLine();
            $this->info('🎉 All tests passed! R2 is properly configured.');

        } catch (\Exception $e) {
            $this->error('❌ Connection failed!');
            $this->error($e->getMessage());
            return 1;
        }

        return 0;
    }
}
```

Uitvoeren:

```bash
php artisan r2:test
```

### Stap 9.2: Test API Endpoints

Test met curl of Postman:

```bash
# Upload notes image
curl -X POST http://localhost:8080/api/v1/assignments/ASSIGNMENT_UID/notes-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "notes_image=@/path/to/image.jpg"

# Upload CV
curl -X POST http://localhost:8080/api/v1/contacts/CONTACT_UID/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@/path/to/cv.pdf" \
  -F "type=cv"
```

---

## Checklist

### Cloudflare Setup
- [ ] Cloudflare account aangemaakt
- [ ] R2 geactiveerd
- [ ] Bucket `ave-crm-files` aangemaakt
- [ ] API Token gegenereerd
- [ ] Credentials veilig opgeslagen

### Laravel Backend
- [ ] `composer require league/flysystem-aws-s3-v3` uitgevoerd
- [ ] `.env` geconfigureerd met R2 credentials
- [ ] `config/filesystems.php` aangepast
- [ ] Migratie `add_notes_image_to_assignments_table` aangemaakt
- [ ] Migratie `create_contact_documents_table` aangemaakt
- [ ] Migraties uitgevoerd
- [ ] `ContactDocument` model aangemaakt
- [ ] `Contact` model uitgebreid met `documents()` relatie
- [ ] `Assignment` model uitgebreid met `notes_image_path`
- [ ] `FileStorageService` aangemaakt
- [ ] `AssignmentController` uitgebreid met image upload methods
- [ ] `ContactDocumentController` aangemaakt
- [ ] API routes toegevoegd
- [ ] R2 connectie getest met `php artisan r2:test`

### Frontend
- [ ] `mutations/files.ts` aangemaakt
- [ ] Query keys uitgebreid
- [ ] `queries/contactDocuments.ts` aangemaakt
- [ ] Assignment form aangepast voor image upload
- [ ] Contact detail pagina aangepast voor CV upload

---

## Kosten Overzicht

### Cloudflare R2 Pricing

| Resource | Gratis Tier | Daarna |
|----------|-------------|--------|
| Opslag | 10 GB/maand | $0.015/GB |
| Class A Operations (writes) | 1M/maand | $4.50/miljoen |
| Class B Operations (reads) | 10M/maand | $0.36/miljoen |
| **Egress (downloads)** | **Onbeperkt** | **$0** |

### Geschatte maandelijkse kosten voor AVE CRM

| Scenario | Opslag | Kosten |
|----------|--------|--------|
| Klein (< 100 CV's, < 500 afbeeldingen) | ~2 GB | **Gratis** |
| Medium (< 1000 CV's, < 5000 afbeeldingen) | ~10 GB | **Gratis** |
| Groot (> 1000 CV's) | ~25 GB | ~$0.23/maand |

---

## Troubleshooting

### "Access Denied" error
- Controleer of de API token de juiste bucket permissions heeft
- Controleer of `R2_ENDPOINT` correct is (inclusief `https://`)

### "Connection refused" error
- Controleer of de endpoint URL klopt
- Controleer of er geen firewall de verbinding blokkeert

### Signed URLs werken niet
- Cloudflare R2 ondersteunt signed URLs, maar je moet wel de juiste regio hebben
- Probeer `R2_REGION=auto` te gebruiken

### Grote bestanden timeout
- Verhoog `upload_max_filesize` en `post_max_size` in `php.ini`
- Overweeg chunked uploads voor bestanden > 10MB

---

## Security Overwegingen

1. **Nooit credentials in Git**: Zorg dat `.env` in `.gitignore` staat
2. **Signed URLs**: Gebruik altijd signed URLs met korte expiry (5-60 min)
3. **Tenant isolatie**: Prefix alle paden met tenant ID
4. **Validatie**: Valideer altijd bestandstypen en -groottes
5. **CORS**: Configureer CORS correct als frontend en backend op verschillende domeinen draaien

---

*Document versie: 1.0*  
*Laatst bijgewerkt: 8 januari 2025*

