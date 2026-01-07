<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Spatie\Multitenancy\Models\Concerns\UsesTenantConnection;

class CalendarEvent extends Model
{
    use HasFactory, SoftDeletes, UsesTenantConnection;

    protected $fillable = [
        'uid',
        'title',
        'description',
        'location',
        'start_at',
        'end_at',
        'all_day',
        'user_id',
        'account_id',
        'assignment_id',
        'contact_id',
        'event_type',
        'color',
    ];

    protected $casts = [
        'uid' => 'string',
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'all_day' => 'boolean',
    ];

    public function getRouteKeyName(): string
    {
        return 'uid';
    }

    protected static function booted(): void
    {
        static::creating(function ($event) {
            if (empty($event->uid)) {
                $event->uid = (string) Str::ulid();
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function assignment()
    {
        return $this->belongsTo(Assignment::class);
    }

    public function contact()
    {
        return $this->belongsTo(Contact::class);
    }
}

