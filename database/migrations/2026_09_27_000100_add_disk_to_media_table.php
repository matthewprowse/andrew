<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Which filesystem disk a media file lives on. Files attached to paid
     * resources are moved to the private `local` disk so they can only be
     * reached through a checked download route.
     */
    public function up(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->string('disk')->default('public')->after('file_path');
        });
    }

    public function down(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->dropColumn('disk');
        });
    }
};
