<?php

namespace App\Models;

use Spatie\Multitenancy\Models\Concerns\UsesTenantConnection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountActivity extends Model
{
    use UsesTenantConnection;

    protected $fillable = [
        'account_id',
        'candidate_id',
        'assignment_id',
        'type',
        'description',
        'date',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function candidate(): BelongsTo
    {
        return $this->belongsTo(Candidate::class);
    }

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(Assignment::class);
    }
}
