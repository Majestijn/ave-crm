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

    /**
     * Geldige begin-status voor een nieuwe opdracht: de eerste funnel-fase.
     * Vervangt de oude lifecycle-default `active`, die geen geldige
     * `assignment_status`-dropdownwaarde (meer) is.
     */
    public const DEFAULT = '1e_contact_moment';

    /**
     * Map van oude lifecycle-statussen (van vóór de funnel-fases) naar de
     * huidige `assignment_status`-dropdownwaarden. Gebruikt om bestaande data
     * te normaliseren en om binnenkomende legacy-waarden op te vangen, zodat
     * ze niet op validatie ("The selected status is invalid") stuklopen.
     *
     * @var array<string, string>
     */
    public const LEGACY_MAP = [
        'active' => self::DEFAULT,
        'proposed' => self::DEFAULT,
        'hired' => 'aangenomen',
        'completed' => 'voltooid',
        'cancelled' => 'afgewezen',
        'shadow_management' => 'schaduwmanagement',
    ];

    /**
     * Zet een (mogelijk legacy) statuswaarde om naar een geldige
     * dropdownwaarde. Onbekende/al-geldige waarden blijven ongewijzigd.
     */
    public static function normalize(?string $status): ?string
    {
        if ($status === null) {
            return null;
        }

        return self::LEGACY_MAP[$status] ?? $status;
    }
}
