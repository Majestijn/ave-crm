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
        'salary_min',
        'salary_max',
        'has_bonus',
        'has_car',
        'vacation_days',
        'location',
        'employment_type',
    ];

    protected $casts = [
        'uid' => 'string',
        'salary_min' => 'integer',
        'salary_max' => 'integer',
        'has_bonus' => 'boolean',
        'has_car' => 'boolean',
        'vacation_days' => 'integer',
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

    public function candidates()
    {
        return $this->belongsToMany(Contact::class, 'assignment_contact')
            ->withPivot('id', 'status')
            ->withTimestamps();
    }
}
