<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->string('category')->nullable();
            $table->string('secondary_category')->nullable();
            $table->json('tertiary_category')->nullable();
            $table->json('merken')->nullable();
            $table->json('labels')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->dropColumn([
                'category',
                'secondary_category',
                'tertiary_category',
                'merken',
                'labels',
            ]);
        });
    }
};
