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
        Schema::create('cv_import_batches', function (Blueprint $table) {
            $table->id();
            $table->ulid('uid')->unique();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('user_id');
            
            // Batch status
            $table->string('status')->default('pending'); // pending, extracting, processing, completed, failed
            
            // File counts
            $table->integer('total_files')->default(0);
            $table->integer('extracted_files')->default(0);
            $table->integer('processed_files')->default(0);
            $table->integer('success_count')->default(0);
            $table->integer('failed_count')->default(0);
            $table->integer('skipped_count')->default(0);
            
            // Google Cloud references
            $table->string('gcs_input_uri')->nullable(); // gs://bucket/path/input.jsonl
            $table->string('gcs_output_uri')->nullable(); // gs://bucket/path/output/
            $table->string('vertex_job_name')->nullable(); // Vertex AI batch job name
            
            // Error tracking
            $table->text('error_message')->nullable();
            $table->json('failed_files')->nullable(); // [{filename, reason}, ...]
            $table->json('skipped_files')->nullable(); // [{filename, reason}, ...] - duplicates
            
            // Timing
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cv_import_batches');
    }
};
