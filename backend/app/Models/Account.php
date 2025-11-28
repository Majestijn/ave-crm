<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Models\Concerns\BelongsToTenant;

class Account extends Model
{
    use HasFactory, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'uid',
        'tenant_id',
        'name',
        'logo_url',
        'location',
        'website',
        'revenue_cents',
        'notes',
    ];

    protected $casts = [
        'uid' => 'string',
        'revenue_cents' => 'integer',
    ];

    public function getRouteKeyName(): string
    {
        return 'uid';
    }

    protected static function booted(): void
    {
        static::creating(function ($account) {
            if (empty($account->uid)) {
                $account->uid = (string) Str::ulid();
            }
        });
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function contacts()
    {
        return $this->hasMany(AccountContact::class);
    }

    public function assignments()
    {
        return $this->hasMany(Assignment::class);
    }

    public function activities()
    {
        return $this->hasMany(AccountActivity::class);
    }
}

