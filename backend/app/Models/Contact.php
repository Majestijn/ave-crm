<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Spatie\Multitenancy\Models\Concerns\UsesTenantConnection;

class Contact extends Model
{
    use HasFactory, SoftDeletes, UsesTenantConnection;

    protected $fillable = [
        'uid',
        'first_name',
        'last_name',
        'gender',
        'email',
        'phone',
        'location',
        'current_company',
        'company_role',
        'network_role',
        'current_salary_cents',
        'education',
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
        static::creating(function ($contact) {
            if (empty($contact->uid)) {
                $contact->uid = (string) Str::ulid();
            }
        });
    }
}
