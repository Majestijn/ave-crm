<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->unsignedBigInteger('annual_salary_cents')->nullable()->after('network_roles');
            $table->unsignedInteger('hourly_rate_cents')->nullable()->after('annual_salary_cents');
            $table->unsignedSmallInteger('vacation_days')->nullable()->after('hourly_rate_cents');
            $table->decimal('bonus_percentage', 5, 2)->nullable()->after('vacation_days');
            $table->json('benefits')->nullable()->after('bonus_percentage');
        });
    }

    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->dropColumn([
                'annual_salary_cents',
                'hourly_rate_cents',
                'vacation_days',
                'bonus_percentage',
                'benefits',
            ]);
        });
    }
};
