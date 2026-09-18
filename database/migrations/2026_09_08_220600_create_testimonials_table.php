<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('testimonials', function (Blueprint $table): void {
            $table->id();
            $table->text('quote');
            $table->string('author');
            $table->string('company')->nullable();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('status')->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'service_id', 'sort_order', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('testimonials');
    }
};
