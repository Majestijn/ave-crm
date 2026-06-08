<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `parent_logo_url` werd toegevoegd door de create-migratie te bewerken
 * (holding-logo feature). Dat werkt lokaal via fresh-migrate, maar op
 * productie draait de create-migratie nooit opnieuw, dus daar ontbrak de
 * kolom — waardoor het opslaan van een account een 500 gaf. Deze additieve
 * migratie voegt de kolom alsnog toe waar hij nog niet bestaat.
 */
return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('accounts', 'parent_logo_url')) {
            Schema::table('accounts', function (Blueprint $table) {
                $table->string('parent_logo_url')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('accounts', 'parent_logo_url')) {
            Schema::table('accounts', function (Blueprint $table) {
                $table->dropColumn('parent_logo_url');
            });
        }
    }
};
