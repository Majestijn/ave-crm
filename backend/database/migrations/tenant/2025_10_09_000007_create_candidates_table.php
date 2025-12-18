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
        Schema::create('contacts', function (Blueprint $table) {
            // Primary identifiers
            $table->id();
            $table->ulid('uid')->unique();

            // Personal information
            $table->string('first_name');
            $table->string('last_name');
            $table->string('gender', 16)->nullable();

            // Contact information
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('location')->nullable();

            // Professional information
            $table->string('current_company')->nullable();
            $table->string('company_role')->nullable();
            $table->string('network_role')->nullable();
            $table->integer('current_salary_cents')->nullable();
            $table->string('education')->nullable();

            // External links
            $table->string('linkedin_url')->nullable();
            $table->string('cv_url')->nullable();

            // Additional information
            $table->text('notes')->nullable();

            // Timestamps
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
