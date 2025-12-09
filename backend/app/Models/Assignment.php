<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Spatie\Multitenancy\Models\Concerns\UsesTenantConnection;

class Assignment extends Model
{
    use HasFactory, SoftDeletes, UsesTenantConnection;

    protected $fillable = [
        'uid',
        'account_id',
        'title',
        'description',
        'status',
    ];

    protected $casts = [
        'uid' => 'string',
    ];

    public function getRouteKeyName(): string
    {
        return 'uid';
    }

    protected static function booted(): void
    {
        static::creating(function ($assignment) {
            if (empty($assignment->uid)) {
                $assignment->uid = (string) Str::ulid();
            }
        });
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }
}

