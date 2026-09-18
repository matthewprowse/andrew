<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// LIB-04 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4): separates resource
// formats from future topic classifications.
//
// Purely a new admin-facing classification column: it changes no existing
// public category URL (resources.show still resolves by the existing
// `slug`) and ResourceAccessController's signed verification flow never
// reads this column at all.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resource_categories', function (Blueprint $table) {
            $table->string('kind')->default('format')->after('layout');
        });

    }

    public function down(): void
    {
        Schema::table('resource_categories', function (Blueprint $table) {
            $table->dropColumn('kind');
        });
    }
};
