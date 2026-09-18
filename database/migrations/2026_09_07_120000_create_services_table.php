<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('headline');
            $table->string('slug')->unique();
            $table->text('intro')->nullable();
            $table->longText('body')->nullable();
            $table->string('icon')->nullable();
            $table->text('banner_image')->nullable();
            $table->string('cta_text')->nullable();
            $table->string('cta_button_label')->nullable();
            $table->text('cta_link')->nullable();
            foreach (['scope', 'countries', 'featured_primary', 'featured_secondary', 'faqs'] as $field) {
                $table->json($field)->nullable();
            }
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('status')->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
