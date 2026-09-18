<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estimator_cities', function (Blueprint $table) {
            $table->id();
            $table->string('city');
            $table->string('country');
            $table->string('continent');
            $table->string('status')->default('inactive');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->index('status');
            $table->index('country');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estimator_cities');
    }
};
