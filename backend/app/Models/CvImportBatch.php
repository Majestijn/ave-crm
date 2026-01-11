<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CvImportBatch extends Model
{
    protected $connection = 'landlord';

    protected $fillable = [
        'uid',
        'tenant_id',
        'user_id',
        'status',
        'total_files',
        'extracted_files',
        'processed_files',
        'success_count',
        'failed_count',
        'skipped_count',
        'gcs_input_uri',
        'gcs_output_uri',
        'vertex_job_name',
        'error_message',
        'failed_files',
        'skipped_files',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'failed_files' => 'array',
        'skipped_files' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function getRouteKeyName(): string
    {
        return 'uid';
    }

    protected static function booted(): void
    {
        static::creating(function ($batch) {
            if (empty($batch->uid)) {
                $batch->uid = (string) Str::ulid();
            }
        });
    }

    public function isComplete(): bool
    {
        return in_array($this->status, ['completed', 'failed']);
    }

    public function getProgressPercentage(): int
    {
        if ($this->total_files === 0) {
            return 0;
        }
        return (int) round(($this->processed_files / $this->total_files) * 100);
    }
}
