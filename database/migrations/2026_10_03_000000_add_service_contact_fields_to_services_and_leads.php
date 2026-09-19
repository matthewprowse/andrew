<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->json('contact_fields')->nullable()->after('cta_link');
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->foreignId('service_id')->nullable()->after('message')->constrained()->nullOnDelete();
            $table->json('custom_fields')->nullable()->after('service_id');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropConstrainedForeignId('service_id');
            $table->dropColumn('custom_fields');
        });

        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn('contact_fields');
        });
    }
};
