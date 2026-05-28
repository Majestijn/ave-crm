<?php

namespace App\Support;

/**
 * Eén bron van waarheid voor opdracht-statussen.
 *
 * De actieve statuswaarden zijn dynamische dropdown-opties (type
 * `assignment_status`), maar de vraag "telt deze opdracht nog als lopend?"
 * stond verspreid en inconsistent over meerdere controllers. Deze klasse houdt
 * de set "afgeronde" statussen op één plek, zodat ze niet meer uit elkaar lopen.
 */
class AssignmentStatus
{
    /**
     * Statussen die niet meer als "lopend" tellen (NL + legacy EN).
     *
     * @var array<int, string>
     */
    public const CLOSED = [
        'aangenomen',
        'afgewezen',
        'administratief_voltooid',
        'voltooid',
        'opdracht_on_hold',
        'hired',
        'completed',
        'cancelled',
    ];

    /** Is deze opdracht-status afgerond (niet meer lopend)? */
    public static function isClosed(?string $status): bool
    {
        return $status !== null && in_array($status, self::CLOSED, true);
    }
}
