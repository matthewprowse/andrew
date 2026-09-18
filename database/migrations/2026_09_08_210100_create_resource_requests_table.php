<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resource_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resource_item_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('email');
            $table->string('company')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('submitted_at');
            $table->timestamps();
            $table->index('submitted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resource_requests');
    }
};
