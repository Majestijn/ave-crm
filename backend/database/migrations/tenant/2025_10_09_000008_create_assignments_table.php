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
        Schema::create('assignments', function (Blueprint $table) {
            $table->id();
            $table->ulid('uid')->unique();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();

            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status')->default('active'); // active, completed, cancelled

            $table->integer('salary_min')->nullable(); // Minimum salary in EUR
            $table->integer('salary_max')->nullable(); // Maximum salary in EUR
            $table->boolean('has_bonus')->default(false);
            $table->boolean('has_car')->default(false);
            $table->integer('vacation_days')->nullable(); // Number of vacation days
            $table->string('location')->nullable();
            $table->string('employment_type')->nullable(); // Fulltime, Parttime, etc.
            $table->string('notes_image_path')->nullable(); // Image attachment for notes

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assignments');
    }
};
