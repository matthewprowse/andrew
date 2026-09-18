<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->string('meta_title')->nullable()->after('show_team_section');
            $table->string('meta_description', 320)->nullable()->after('meta_title');
            $table->foreignId('og_image_media_id')->nullable()->after('meta_description')->constrained('media')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('og_image_media_id');
            $table->dropColumn(['meta_title', 'meta_description']);
        });
    }
};
