<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Multitenancy\Models\Tenant as SpatieTenant;
use Spatie\Multitenancy\Models\Concerns\UsesLandlordConnection;
use Illuminate\Support\Str;

class Tenant extends SpatieTenant
{
    use HasFactory, UsesLandlordConnection;

    public $timestamps = true;
    protected $fillable = [
        'uid',
        'name',
        'slug',
        'domain',
        'database',
    ];

    protected $casts = [
        'uid' => 'string',
    ];

    protected static function booted(): void
    {
        static::creating(function ($tenant) {
            if (empty($tenant->uid)) {
                $tenant->uid = (string) Str::ulid();
            };
            if (empty($tenant->database)) {
                $tenant->database = 'tenant_' . str_replace('-', '_', $tenant->slug);
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uid';
    }
}
