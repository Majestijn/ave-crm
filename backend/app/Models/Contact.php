<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Spatie\Multitenancy\Models\Concerns\UsesTenantConnection;

class Contact extends Model
{
    use HasFactory, SoftDeletes, UsesTenantConnection;

    protected $fillable = [
        'uid',
        'first_name',
        'prefix',
        'last_name',
        'date_of_birth',
        'gender',
        'email',
        'phone',
        'location',
        'current_company',
        'company_role',
        'network_roles',
        'current_salary_cents',
        'education',
        'linkedin_url',
        'cv_url',
        'notes',
    ];

    protected $casts = [
        'uid' => 'string',
        'date_of_birth' => 'date',
        'current_salary_cents' => 'integer',
        'network_roles' => 'array',
    ];

    protected $appends = ['name'];

    public function getNameAttribute(): string
    {
        $parts = [$this->first_name];
        if ($this->prefix) {
            $parts[] = $this->prefix;
        }
        $parts[] = $this->last_name;
        return trim(implode(' ', $parts));
    }

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

    /**
     * Get all documents for this contact
     */
    public function documents(): HasMany
    {
        return $this->hasMany(ContactDocument::class);
    }

    /**
     * Get only CV documents for this contact
     */
    public function cvDocuments(): HasMany
    {
        return $this->hasMany(ContactDocument::class)->where('type', 'cv');
    }
}
