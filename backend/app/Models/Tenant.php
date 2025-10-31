<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Tenant extends Model
{
    use HasFactory;

    public $timestamps = true;
    protected $fillable = [
        'uid',
        'name',
        'slug',
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
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uid';
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
