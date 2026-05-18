<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('assignments', function (Blueprint $table) {
            $table->unsignedSmallInteger('hours_per_week_min')->nullable()->after('employment_type');
            $table->unsignedSmallInteger('hours_per_week_max')->nullable()->after('hours_per_week_min');
        });
    }

    public function down(): void
    {
        Schema::table('assignments', function (Blueprint $table) {
            $table->dropColumn(['hours_per_week_min', 'hours_per_week_max']);
        });
    }
};
