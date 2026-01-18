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
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->ulid('uid')->unique();

            $table->string('name');
            $table->string('logo_url')->nullable();
            $table->string('location')->nullable();
            $table->string('website')->nullable();
            $table->string('industry')->nullable(); // Branche
            $table->integer('fte_count')->nullable(); // Aantal FTE
            $table->bigInteger('revenue_cents')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};
