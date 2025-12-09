<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Spatie\Multitenancy\Models\Concerns\UsesTenantConnection;

class Candidate extends Model
{
    use HasFactory, SoftDeletes, UsesTenantConnection;

    protected $fillable = [
        'uid',
        'first_name',
        'last_name',
        'gender',
        'location',
        'current_role',
        'current_company',
        'current_salary_cents',
        'education',
        'email',
        'phone',
        'linkedin_url',
        'cv_url',
        'notes',
    ];

    protected $casts = [
        'uid' => 'string',
        'current_salary_cents' => 'integer',
    ];

    public function getRouteKeyName(): string
    {
        return 'uid';
    }

    protected static function booted(): void
    {
        static::creating(function ($candidate) {
            if (empty($candidate->uid)) {
                $candidate->uid = (string) Str::ulid();
            }
        });
    }
}

