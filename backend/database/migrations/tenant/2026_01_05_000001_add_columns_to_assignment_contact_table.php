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
        Schema::table('assignment_contact', function (Blueprint $table) {
            if (!Schema::hasColumn('assignment_contact', 'assignment_id')) {
                $table->foreignId('assignment_id')->constrained()->cascadeOnDelete();
            }
            if (!Schema::hasColumn('assignment_contact', 'contact_id')) {
                $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            }
            if (!Schema::hasColumn('assignment_contact', 'status')) {
                $table->string('status')->default('called');
            }
            // Add unique constraint if not exists (hard to check, catch exception or assume not exists if columns didn't exist)
            // $table->unique(['assignment_id', 'contact_id']); 
        });
        
        // Add unique index in a separate call or same? 
        // Safer to do it here, but strict check might fail if it exists.
        // Given the table was empty, we can just add it.
        try {
            Schema::table('assignment_contact', function (Blueprint $table) {
                 $table->unique(['assignment_id', 'contact_id']);
            });
        } catch (\Exception $e) {
            // Ignore if index exists
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assignment_contact', function (Blueprint $table) {
            $table->dropForeign(['assignment_id']);
            $table->dropForeign(['contact_id']);
            $table->dropColumn(['assignment_id', 'contact_id', 'status']);
        });
    }
};
