<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->string('meta_title')->nullable()->after('published_at');
            $table->string('meta_description', 320)->nullable()->after('meta_title');
        });

        Schema::table('blog_posts', function (Blueprint $table) {
            $table->string('meta_title')->nullable()->after('publish_date');
            $table->string('meta_description', 320)->nullable()->after('meta_title');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['meta_title', 'meta_description']);
        });

        Schema::table('blog_posts', function (Blueprint $table) {
            $table->dropColumn(['meta_title', 'meta_description']);
        });
    }
};
