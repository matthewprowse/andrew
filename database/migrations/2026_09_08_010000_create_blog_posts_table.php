<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('category');
            $table->longText('excerpt');
            $table->longText('body');
            $table->string('banner_image', 2048)->nullable();
            $table->enum('status', ['draft', 'published'])->default('draft');
            $table->date('publish_date')->nullable();
            $table->timestamps();
            $table->index(['status', 'publish_date', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_posts');
    }
};
