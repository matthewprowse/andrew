<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resource_items', function (Blueprint $table) {
            $table->dropColumn(['file_path', 'file_original_name', 'image_path']);
            $table->foreignId('file_media_id')->nullable()->after('external_url')->constrained('media')->nullOnDelete();
            $table->foreignId('image_media_id')->nullable()->after('file_media_id')->constrained('media')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('resource_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('file_media_id');
            $table->dropConstrainedForeignId('image_media_id');
            $table->string('file_path')->nullable();
            $table->string('file_original_name')->nullable();
            $table->string('image_path')->nullable();
        });
    }
};
