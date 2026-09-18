<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estimator_settings', function (Blueprint $table) {
            $table->id();
            $table->string('currency')->default('USD');
            $table->decimal('vat_rate', 5, 4)->default(0.15);
            $table->decimal('contingency_rate', 5, 4)->default(0.10);
            $table->decimal('transit_insurance_share', 5, 4)->default(0.10);
            $table->unsignedInteger('validity_days')->default(90);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estimator_settings');
    }
};
