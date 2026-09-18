<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resource_items', function (Blueprint $table) {
            $table->foreignId('author_id')->nullable()->after('service_id')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('resource_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('author_id');
        });
    }
};
