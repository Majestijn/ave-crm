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
            $table->ulid('uid');
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();

            $table->string('name'); // Bedrijfsnaam
            $table->string('logo_url')->nullable(); // Logo URL/path
            $table->string('location')->nullable(); // Locatie
            $table->string('website')->nullable(); // Website
            $table->bigInteger('revenue_cents')->nullable(); // Omzet in cents (bijv. 750 mln = 750000000000 cents)
            $table->text('notes')->nullable(); // Extra notities

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'uid']);
            $table->index(['tenant_id', 'name']);
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
