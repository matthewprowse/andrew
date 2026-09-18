<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estimator_services', function (Blueprint $table) {
            $table->id();
            $table->string('category');
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->boolean('selected_by_default')->default(false);
            $table->boolean('active')->default(true);
            $table->boolean('tiered_pricing')->default(false);
            $table->unsignedInteger('first_threshold')->default(0);
            $table->decimal('adjustment_above_threshold', 6, 2)->default(0);
            $table->unsignedInteger('next_threshold')->default(0);
            $table->decimal('adjustment_above_next_threshold', 6, 2)->default(0);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->index(['category', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estimator_services');
    }
};
