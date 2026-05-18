<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('assignments', function (Blueprint $table) {
            $table->unsignedInteger('total_fee')->nullable()->after('bonus_percentage');
            $table->unsignedInteger('advance_fee')->nullable()->after('total_fee');
        });
    }

    public function down(): void
    {
        Schema::table('assignments', function (Blueprint $table) {
            $table->dropColumn(['total_fee', 'advance_fee']);
        });
    }
};
