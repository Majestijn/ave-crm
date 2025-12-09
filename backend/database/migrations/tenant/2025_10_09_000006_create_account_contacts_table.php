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
        Schema::create('account_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();

            $table->string('name'); // Naam van contactpersoon
            $table->string('phone')->nullable(); // Telefoonnummer
            $table->string('email')->nullable(); // Email adres
            $table->string('role')->nullable(); // Functie/rol (bijv. "Category Manager")

            $table->timestamps();
            $table->softDeletes();

            $table->index(['account_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('account_contacts');
    }
};
