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

    /**
     * List files in a directory
     */
    public function listFiles(string $directory): array
    {
        return Storage::disk($this->disk)->files($directory);
    }
}

