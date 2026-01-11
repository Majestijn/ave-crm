<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('assignment_contact', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('called'); // called, proposed, hired, rejected
            $table->timestamps();

            $table->unique(['assignment_id', 'contact_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assignment_contact');
    }
};
