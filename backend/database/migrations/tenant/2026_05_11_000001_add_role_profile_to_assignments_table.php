<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assignments', function (Blueprint $table) {
            $table->string('role_profile_path')->nullable()->after('notes_image_path');
            $table->string('role_profile_original_filename')->nullable()->after('role_profile_path');
        });
    }

    public function down(): void
    {
        Schema::table('assignments', function (Blueprint $table) {
            $table->dropColumn(['role_profile_path', 'role_profile_original_filename']);
        });
    }
};
