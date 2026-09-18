<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('locations', function (Blueprint $table) {
            $table->id();
            $table->string('office_name');
            $table->longText('address');
            $table->string('phone', 64)->nullable();
            $table->string('email')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->index(['sort_order', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('locations');
    }
};
