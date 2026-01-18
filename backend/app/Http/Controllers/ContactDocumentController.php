<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\ContactDocument;
use App\Services\FileStorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Multitenancy\Models\Tenant;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

        $documents = $contact->documents->map(function (ContactDocument $doc) {
            return [
                'id' => $doc->id,
                'type' => $doc->type,
                'original_filename' => $doc->original_filename,
                'mime_type' => $doc->mime_type,
                'file_size' => $doc->file_size,
                'formatted_file_size' => $doc->formatted_file_size,
                'download_url' => $this->getDownloadUrl($doc),
                'created_at' => $doc->created_at,
            ];
        });

        return response()->json($documents);
    }

    /**
     * Upload a document for a contact
     */
    public function store(Request $request, string $contactUid): JsonResponse
    {
        $contact = Contact::where('uid', $contactUid)->firstOrFail();

        // Debug logging
        \Log::info('ContactDocument upload request', [
            'contactUid' => $contactUid,
            'hasFile' => $request->hasFile('file'),
            'allFiles' => array_keys($request->allFiles()),
            'allInput' => array_keys($request->all()),
            'contentType' => $request->header('Content-Type'),
            'method' => $request->method(),
        ]);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            \Log::info('File details', [
                'originalName' => $file->getClientOriginalName(),
                'mimeType' => $file->getMimeType(),
                'size' => $file->getSize(),
                'isValid' => $file->isValid(),
                'error' => $file->getError(),
                'errorMessage' => $file->getErrorMessage(),
            ]);
        } else {
            \Log::warning('No file in request', [
                'files' => $_FILES,
                'post' => array_keys($_POST),
            ]);
        }

        $validated = $request->validate([
            'file' => 'required|file|max:10240|mimes:pdf,doc,docx,jpg,jpeg,png,gif,webp', // 10MB max
            'type' => 'required|string|in:cv,certificate,notes,other',
        ]);

        $tenantId = Tenant::current()->id;
        
        $fileData = $this->fileService->uploadContactDocument(
            $tenantId,
            $contact->uid,
            $request->file('file'),
            $validated['type']
        );

        $document = ContactDocument::create([
            'contact_id' => $contact->id,
            'type' => $validated['type'],
            'original_filename' => $fileData['original_filename'],
            'storage_path' => $fileData['path'],
            'mime_type' => $fileData['mime_type'],
            'file_size' => $fileData['file_size'],
        ]);

        return response()->json([
            'id' => $document->id,
            'type' => $document->type,
            'original_filename' => $document->original_filename,
            'mime_type' => $document->mime_type,
            'file_size' => $document->file_size,
            'formatted_file_size' => $document->formatted_file_size,
            'download_url' => $this->getDownloadUrl($document),
            'created_at' => $document->created_at,
        ], 201);
    }

    /**
     * Download a document
     */
    public function download(int $documentId): StreamedResponse|JsonResponse
    {
        \Log::info('Download request', ['documentId' => $documentId]);
        
        try {
            $document = ContactDocument::findOrFail($documentId);
            \Log::info('Document found', [
                'id' => $document->id,
                'storage_path' => $document->storage_path,
                'original_filename' => $document->original_filename,
            ]);
        } catch (\Exception $e) {
            \Log::error('Document not found in database', [
                'documentId' => $documentId,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Document niet gevonden in database'], 404);
        }

        $exists = $this->fileService->exists($document->storage_path);
        \Log::info('File exists check', [
            'path' => $document->storage_path,
            'exists' => $exists,
        ]);

        if (!$exists) {
            return response()->json([
                'message' => 'Bestand niet gevonden in storage',
                'path' => $document->storage_path,
            ], 404);
        }

        $content = $this->fileService->get($document->storage_path);

        return response()->streamDownload(
            function () use ($content) {
                echo $content;
            },
            $document->original_filename,
            [
                'Content-Type' => $document->mime_type,
                'Content-Length' => $document->file_size,
            ]
        );
    }

    /**
     * Get a signed URL for direct download
     */
    public function getSignedUrl(int $documentId): JsonResponse
    {
        $document = ContactDocument::findOrFail($documentId);

        try {
            $url = $this->fileService->getSignedUrl($document->storage_path, 60);
            return response()->json(['url' => $url]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Kon download URL niet genereren'], 500);
        }
    }

    /**
     * Delete a document
     */
    public function destroy(int $documentId): JsonResponse
    {
        $document = ContactDocument::findOrFail($documentId);

        // Delete from storage
        $this->fileService->delete($document->storage_path);

        // Delete database record
        $document->delete();

        return response()->json(['message' => 'Document succesvol verwijderd']);
    }

    /**
     * Generate download URL for a document
     */
    private function getDownloadUrl(ContactDocument $document): string
    {
        // Use a relative URL without the /api/v1 prefix
        // The frontend will prepend the API base URL
        return "/contact-documents/{$document->id}/download";
    }
}

