<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resource_items', function (Blueprint $table) {
            $table->boolean('requires_email_verification')->default(false)->after('external_url');
        });
    }

    public function down(): void
    {
        Schema::table('resource_items', function (Blueprint $table) {
            $table->dropColumn('requires_email_verification');
        });
    }
};
