<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->foreignId('service_id')->nullable()->after('category')->constrained()->nullOnDelete();
            $table->index(['status', 'service_id', 'publish_date', 'id']);
        });
    }

    public function down(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('service_id');
            $table->dropIndex(['status', 'service_id', 'publish_date', 'id']);
        });
    }
};
