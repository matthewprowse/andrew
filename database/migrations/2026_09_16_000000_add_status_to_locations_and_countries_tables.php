<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // CMS-04: additive status column (draft/published/archived) on both
        // tables, defaulted to 'published' for every existing AND every new
        // row. That default is exactly what "preserve existing public
        // records' visibility during migration" means here: every office and
        // country that is live on the public site today keeps rendering the
        // instant this migration runs, because it is backfilled to
        // 'published' rather than 'draft' — nothing that's live goes dark.
        // See docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 3 (CMS-04) and
        // docs/PHASE0_BASELINE.md (neither table had any publication
        // control before this).
        Schema::table('locations', function (Blueprint $table) {
            $table->string('status')->default('published')->after('sort_order');
        });

        Schema::table('countries', function (Blueprint $table) {
            $table->string('status')->default('published')->after('sort_order');
        });

        Schema::table('locations', function (Blueprint $table) {
            $table->index(['status', 'sort_order']);
        });

        Schema::table('countries', function (Blueprint $table) {
            $table->index(['status', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            $table->dropIndex(['status', 'sort_order']);
            $table->dropColumn('status');
        });

        Schema::table('countries', function (Blueprint $table) {
            $table->dropIndex(['status', 'sort_order']);
            $table->dropColumn('status');
        });
    }
};
