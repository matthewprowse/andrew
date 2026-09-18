<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('hero_heading')->nullable();
            $table->text('hero_subheading')->nullable();
            $table->string('intro_heading')->nullable();
            $table->text('intro_body')->nullable();
            $table->foreignId('intro_image_media_id')->nullable()->constrained('media')->nullOnDelete();
            $table->json('sections')->nullable();
            $table->boolean('show_team_section')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pages');
    }
};
