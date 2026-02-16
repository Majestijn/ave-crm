<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Str;
use Spatie\Multitenancy\Models\Concerns\UsesTenantConnection;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, UsesTenantConnection;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'uid',
        'name',
        'email',
        'password',
        'role',
        'calendar_token',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'calendar_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected $casts = [
        'uid' => 'string',
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function getRouteKeyName(): string
    {
        return 'uid';
    }

    protected static function booted(): void
    {
        static::creating(function ($user) {
            if (empty($user->uid)) {
                $user->uid = (string) Str::ulid();
            };
        });
    }

    public function scopeExcept($query, $userOrId)
    {
        $id = $userOrId instanceof self ? $userOrId->getKey() : $userOrId;

        return $query->where($query->getModel()->getKeyName(), '!=', $id);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }
    public function isManagement(): bool
    {
        return $this->role === 'management';
    }
    public function isRecruiter(): bool
    {
        return $this->role === 'recruiter';
    }
    public function isViewer(): bool
    {
        return $this->role === 'viewer';
    }

    /**
     * Generate or regenerate the calendar token for iCal feed access.
     */
    public function generateCalendarToken(): string
    {
        $this->calendar_token = Str::random(64);
        $this->save();
        return $this->calendar_token;
    }

    /**
     * Get or create the calendar token.
     */
    public function getOrCreateCalendarToken(): string
    {
        if (empty($this->calendar_token)) {
            return $this->generateCalendarToken();
        }
        return $this->calendar_token;
    }
    /**
     * Send the password reset notification.
     *
     * @param  string  $token
     * @return void
     */
    public function sendPasswordResetNotification($token)
    {
        $tenant = \Spatie\Multitenancy\Models\Tenant::current();
        
        if ($tenant && app()->environment('local')) {
            $url = "http://{$tenant->domain}:5173/reset-password?token={$token}&email={$this->email}";
        } elseif ($tenant) {
             $url = "https://{$tenant->domain}/reset-password?token={$token}&email={$this->email}";
        } else {
            $url = config('app.frontend_url', 'http://localhost:5173') . "/reset-password?token={$token}&email={$this->email}";
        }

        $this->notify(new \App\Notifications\ResetPasswordNotification($url));
    }
}
