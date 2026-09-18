<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estimator_relocation_service_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('estimator_city_id')->constrained()->cascadeOnDelete();
            $table->foreignId('estimator_service_id')->constrained()->cascadeOnDelete();
            $table->decimal('rate_usd', 10, 2)->nullable();
            $table->timestamps();
            $table->unique(['estimator_city_id', 'estimator_service_id'], 'relocation_service_rates_city_service_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estimator_relocation_service_rates');
    }
};
