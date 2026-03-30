<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('dropdown_options', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('value');
            $table->string('label');
            $table->string('color')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['type', 'value']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dropdown_options');
    }
};
