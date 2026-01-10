<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id')->constrained()->onDelete('cascade');
            $table->string('type'); // 'cv', 'certificate', 'other'
            $table->string('original_filename');
            $table->string('storage_path');
            $table->string('mime_type');
            $table->unsignedBigInteger('file_size'); // bytes
            $table->timestamps();

            $table->index(['contact_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_documents');
    }
};

