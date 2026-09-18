<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analytics_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_type'); // page_view | cta_click | resource_download
            $table->string('path')->nullable();
            $table->string('label')->nullable();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('resource_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('device_type')->nullable(); // desktop | mobile | tablet
            $table->string('browser')->nullable();
            $table->string('referrer_host')->nullable();
            // Reserved for coarse country/city once a GeoIP source is approved
            // (see docs/analytics-privacy-decision.md) — intentionally
            // unpopulated for now rather than guessing from an unapproved vendor.
            $table->string('country')->nullable();
            $table->string('city')->nullable();
            // sha256 of the session id — lets us count unique sessions/daily
            // visits without storing anything that identifies the visitor.
            $table->string('session_hash', 64)->nullable();
            $table->timestamp('occurred_at');
            $table->index(['event_type', 'occurred_at']);
            $table->index(['service_id', 'occurred_at']);
            $table->index(['resource_item_id', 'occurred_at']);
            $table->index('session_hash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_events');
    }
};
