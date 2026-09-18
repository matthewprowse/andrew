<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PUB-01/PUB-02 (docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 5 batch 5B):
     * additive, append-only revision history for `App\Models\Page` only —
     * scoped deliberately to core Pages per the build plan's own wording,
     * not BlogPost/ResourceItem/Testimonial/Faq. The live `pages` table is
     * never altered by this migration and stays the published baseline
     * exactly as before; nothing here changes what a public page currently
     * renders. Every ordinary draft save INSERTs a new row (never updates
     * one in place), so a row's own auto-increment `id` doubles as an
     * unambiguous version marker for PUB-02's optimistic concurrency check,
     * and every state the content has ever been in remains individually
     * inspectable and restorable — see App\Services\PagePublishingService.
     */
    public function up(): void
    {
        Schema::create('page_revisions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('page_id')->constrained('pages')->cascadeOnDelete();
            // 'draft' | 'published'. A page has at most one row with
            // status='draft' that isn't superseded by a later row — that
            // row is "the current draft" — plus any number of historical
            // rows (some published, some superseded drafts) kept purely for
            // restore-as-draft/history.
            $table->string('status');
            // Every editable Page field (hero/intro/sections/home_blocks/
            // meta/etc.) in the same snake_case shape PageContentController
            // already writes to the live row — see
            // PageContentController::buildSnapshot(). Deliberately excludes
            // computed/derived fields (e.g. adminData()'s resolved
            // introImage/ogImage objects) since those are recomputed from
            // the stored media-id columns whenever a snapshot is read back.
            $table->json('snapshot');
            // Nullable: an actor whose user record is later deleted must
            // not block reading this otherwise-permanent history.
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['page_id', 'status']);
            $table->index(['page_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_revisions');
    }
};
