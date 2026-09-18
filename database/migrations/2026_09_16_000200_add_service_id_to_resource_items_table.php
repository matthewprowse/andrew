<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// LIB-03 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4): resources currently have
// no service tagging at all, unlike blog_posts which already gained
// service_id in 2026_09_11_000000_add_service_id_to_blog_posts_table.php.
// Mirrors that migration's shape exactly (nullable, nullOnDelete — losing a
// service must never take a resource item down with it) so both content
// types expose the same read-only association shape to the new content
// facade. Additive only: no write to the services table itself.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resource_items', function (Blueprint $table) {
            $table->foreignId('service_id')->nullable()->after('resource_category_id')->constrained()->nullOnDelete();
            $table->index(['status', 'service_id']);
        });
    }

    public function down(): void
    {
        Schema::table('resource_items', function (Blueprint $table) {
            $table->dropIndex(['status', 'service_id']);
            $table->dropConstrainedForeignId('service_id');
        });
    }
};
