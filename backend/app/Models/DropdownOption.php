<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Spatie\Multitenancy\Models\Concerns\UsesTenantConnection;

class DropdownOption extends Model
{
    use UsesTenantConnection;

    protected $fillable = [
        'type',
        'value',
        'label',
        'color',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public static function validValues(string $type): array
    {
        return static::ofType($type)->active()->orderBy('sort_order')->pluck('value')->toArray();
    }

    public static function validationRule(string $type): string
    {
        return 'in:' . implode(',', static::validValues($type));
    }

    public static function labelFor(string $type, string $value): string
    {
        return static::ofType($type)->where('value', $value)->value('label') ?? $value;
    }

    public static function colorFor(string $type, string $value): ?string
    {
        return static::ofType($type)->where('value', $value)->value('color');
    }
}
