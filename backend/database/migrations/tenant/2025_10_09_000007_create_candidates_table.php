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
        Schema::create('candidates', function (Blueprint $table) {
            $table->id();
            $table->ulid('uid')->unique();

            $table->string('first_name');
            $table->string('last_name');
            $table->string('gender', 16)->nullable();
            $table->string('location')->nullable();

            $table->string('current_role')->nullable();
            $table->string('current_company')->nullable();
            $table->integer('current_salary_cents')->nullable();
            $table->string('education')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('linkedin_url')->nullable();
            $table->string('cv_url')->nullable();
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
        Schema::dropIfExists('candidates');
    }
};
