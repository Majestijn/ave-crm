<?php

use App\Support\AssignmentStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Zet oude lifecycle-opdrachtstatussen ('active', 'hired', 'completed', ...)
 * om naar de huidige `assignment_status`-dropdownwaarden (funnel-fases). Zonder
 * dit blijven legacy-opdrachten een waarde houden die niet in de dropdown zit:
 * ze tonen rauw ("ACTIVE") en elke statuswijziging botst op de in:-validatie
 * ("The selected status is invalid").
 *
 * Idempotent: draait alleen op rijen die nog een legacy-waarde hebben; opnieuw
 * draaien is een no-op.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('assignments')) {
            return;
        }

        foreach (AssignmentStatus::LEGACY_MAP as $legacy => $target) {
            DB::table('assignments')
                ->where('status', $legacy)
                ->update(['status' => $target]);
        }
    }

    public function down(): void
    {
        // Onomkeerbaar: de oorspronkelijke lifecycle-waarde is niet te
        // reconstrueren uit de funnel-fase (meerdere legacy-waarden mappen op
        // dezelfde target). Bewust geen-op.
    }
};
