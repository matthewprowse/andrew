<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->timestamp('anonymized_at')->nullable()->after('submitted_at');
        });
        Schema::table('resource_requests', function (Blueprint $table) {
            $table->timestamp('anonymized_at')->nullable()->after('consent_given_at');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn('anonymized_at');
        });
        Schema::table('resource_requests', function (Blueprint $table) {
            $table->dropColumn('anonymized_at');
        });
    }
};
