<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('assignments', function (Blueprint $table) {
            $table->id();
            $table->ulid('uid')->unique();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('recruiter_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status')->default('active');
            $table->integer('salary_min')->nullable();
            $table->integer('salary_max')->nullable();
            $table->integer('vacation_days')->nullable();
            $table->decimal('bonus_percentage', 5, 2)->nullable();
            $table->string('location')->nullable();
            $table->string('employment_type')->nullable();
            $table->date('start_date')->nullable();
            $table->json('benefits')->nullable();
            $table->string('notes_image_path')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('assignment_contact', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('called');
            $table->timestamps();
            $table->unique(['assignment_id', 'contact_id']);
        });

        Schema::create('account_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['account_id', 'contact_id']);
            $table->index(['account_id']);
            $table->index(['contact_id']);
        });

        Schema::create('assignment_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['assignment_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assignment_user');
        Schema::dropIfExists('account_contacts');
        Schema::dropIfExists('assignment_contact');
        Schema::dropIfExists('assignments');
    }
};
