<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Additive only: adds a nullable JSON column that every existing row
     * (and every row for a non-home slug) simply leaves null. Nothing reads
     * a null value as anything other than "use the current hardcoded
     * fallback copy" — see App\Models\Page::homeBlocksData() and
     * resources/js/pages/home.tsx. No existing column, row, or value is
     * touched. See docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 3, CMS-02.
     */
    public function up(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->json('home_blocks')->nullable()->after('sections');
        });
    }

    public function down(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->dropColumn('home_blocks');
        });
    }
};
