<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Triage state for tool feedback (2026_09_19_000000 / 2026_09_20_000000)
     * — lets a root admin mark an entry resolved once it's been actioned,
     * separate from deleting it outright.
     */
    public function up(): void
    {
        Schema::table('admin_feedback', function (Blueprint $table) {
            $table->string('status')->default('open')->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('admin_feedback', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};
