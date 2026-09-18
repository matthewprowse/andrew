<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('analytics_events', function (Blueprint $table) {
            // Raw IP is now persisted — privacy policy/lawful basis approved
            // 2026-09-13, superseding the "no raw IP" default from
            // docs/analytics-privacy-decision.md. 45 chars fits IPv6.
            $table->string('ip_address', 45)->nullable()->after('referrer_host');
            // "Area code" per Andrew = postal/ZIP code, resolved from ip_address.
            $table->string('postal_code')->nullable()->after('city');
        });
    }

    public function down(): void
    {
        Schema::table('analytics_events', function (Blueprint $table) {
            $table->dropColumn(['ip_address', 'postal_code']);
        });
    }
};
