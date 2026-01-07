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
        Schema::create('calendar_events', function (Blueprint $table) {
            $table->id();
            $table->ulid('uid')->unique();

            // Event details
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location')->nullable();

            // Timing
            $table->dateTime('start_at');
            $table->dateTime('end_at');
            $table->boolean('all_day')->default(false);

            // Owner of the event
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Optional: link to account/assignment/contact
            $table->foreignId('account_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('assignment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->nullOnDelete();

            // Event type/category
            $table->string('event_type')->default('meeting'); // meeting, call, interview, reminder, other

            // Visual
            $table->string('color')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes for querying
            $table->index(['user_id', 'start_at', 'end_at']);
            $table->index(['start_at', 'end_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('calendar_events');
    }
};

