<?php

namespace App\Models;

use App\Services\GeocodingService;
use Illuminate\Database\Eloquent\Builder;
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
        'latitude',
        'longitude',
        'current_company',
        'company_role',
        'network_roles',
        'current_salary_cents',
        'education',
        'linkedin_url',
        'notes',
    ];

    protected $casts = [
        'uid' => 'string',
        'date_of_birth' => 'date',
        'current_salary_cents' => 'integer',
        'network_roles' => 'array',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    protected $appends = ['name', 'cv_url'];

    public function getNameAttribute(): string
    {
        $parts = [$this->first_name];
        if ($this->prefix) {
            $parts[] = $this->prefix;
        }
        $parts[] = $this->last_name;
        return trim(implode(' ', $parts));
    }

    /**
     * Get the CV URL from the most recent CV document
     */
    public function getCvUrlAttribute(): ?string
    {
        $cvDocument = $this->documents()->where('type', 'cv')->latest()->first();
        
        if (!$cvDocument) {
            return null;
        }

        return "/contact-documents/{$cvDocument->id}/download";
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

        // Auto-geocode when location changes
        static::saving(function ($contact) {
            if ($contact->isDirty('location') && !empty($contact->location)) {
                $geocoder = app(GeocodingService::class);
                $coords = $geocoder->geocode($contact->location);
                
                if ($coords) {
                    $contact->latitude = $coords['latitude'];
                    $contact->longitude = $coords['longitude'];
                }
            }
            
            // Clear coordinates if location is cleared
            if ($contact->isDirty('location') && empty($contact->location)) {
                $contact->latitude = null;
                $contact->longitude = null;
            }
        });
    }

    /**
     * Scope to filter contacts within a radius of a location
     * 
     * @param Builder $query
     * @param float $latitude Center point latitude
     * @param float $longitude Center point longitude
     * @param float $radiusKm Radius in kilometers
     * @return Builder
     */
    public function scopeWithinRadius(Builder $query, float $latitude, float $longitude, float $radiusKm): Builder
    {
        // Haversine formula for PostgreSQL
        // We need to use whereRaw for filtering (not HAVING, which requires GROUP BY)
        $haversine = "(6371 * acos(
            LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) +
            sin(radians(?)) * sin(radians(latitude)))
        ))";

        return $query
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->whereRaw("{$haversine} <= ?", [$latitude, $longitude, $latitude, $radiusKm])
            ->selectRaw("*, {$haversine} AS distance", [$latitude, $longitude, $latitude])
            ->orderByRaw("{$haversine}", [$latitude, $longitude, $latitude]);
    }

    /**
     * Scope to add distance from a point (without filtering)
     */
    public function scopeWithDistanceFrom(Builder $query, float $latitude, float $longitude): Builder
    {
        $haversine = "(6371 * acos(
            LEAST(1.0, cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) +
            sin(radians(?)) * sin(radians(latitude)))
        ))";

        return $query->selectRaw("*, {$haversine} AS distance", [$latitude, $longitude, $latitude]);
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
