<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estimator_route_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('origin_city_id')->constrained('estimator_cities')->cascadeOnDelete();
            $table->foreignId('destination_city_id')->constrained('estimator_cities')->cascadeOnDelete();
            $table->foreignId('estimator_service_id')->constrained()->cascadeOnDelete();
            $table->decimal('economy_rate_usd', 10, 2)->nullable();
            $table->decimal('business_rate_usd', 10, 2)->nullable();
            $table->timestamps();
            $table->unique(['origin_city_id', 'destination_city_id', 'estimator_service_id'], 'route_rates_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estimator_route_rates');
    }
};
