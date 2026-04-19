<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->ulid('uid')->unique();
            $table->string('name');
            $table->string('logo_url')->nullable();
            $table->string('location')->nullable();
            $table->string('website')->nullable();
            $table->string('phone')->nullable();
            $table->string('industry')->nullable();
            $table->string('category')->nullable();
            $table->string('secondary_category')->nullable();
            $table->json('tertiary_category')->nullable();
            $table->json('merken')->nullable();
            $table->json('labels')->nullable();
            $table->integer('fte_count')->nullable();
            $table->bigInteger('revenue_cents')->nullable();
            $table->text('notes')->nullable();
            $table->json('sales_target')->nullable();
            $table->string('client_status')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->ulid('uid')->unique();
            $table->string('first_name');
            $table->string('prefix')->nullable();
            $table->string('last_name');
            $table->date('date_of_birth')->nullable();
            $table->string('gender', 16)->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('location')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('current_company')->nullable();
            $table->string('company_role')->nullable();
            $table->json('network_roles')->nullable();
            $table->string('education')->nullable();
            $table->date('availability_date')->nullable();
            $table->string('linkedin_url')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['latitude', 'longitude']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contacts');
        Schema::dropIfExists('accounts');
    }
};
