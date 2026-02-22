<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->string('secondary_category')->nullable()->after('category');
            $table->json('tertiary_category')->nullable()->after('secondary_category');
            $table->json('merken')->nullable()->after('tertiary_category');
            $table->json('labels')->nullable()->after('merken');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn(['secondary_category', 'tertiary_category', 'merken', 'labels']);
        });
    }
};
