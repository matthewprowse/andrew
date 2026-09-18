<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * New FAQ store (LIB-06, docs/ADMIN_UX_SEO_BUILD_PLAN.md §Phase 4).
     * Additive only — never touches the frozen `services` table. `service_id`
     * is a read-only association (same precedent as ResourceItem.service_id
     * from Phase 4A/LIB-03): only ever read for a dropdown, never written to
     * Service. `source` carries the idempotency guarantee for the Service-FAQ
     * import: a unique, nullable provenance marker like
     * "service:{$serviceId}:{$index}" for imported rows, null for FAQs
     * created directly in the new admin. Unique + nullable is safe here —
     * every supported DB (MySQL, SQLite, Postgres) allows multiple NULLs in
     * a unique index, so genuinely new records never collide with each
     * other while still hard-blocking a duplicate import at the DB layer,
     * not just in application logic.
     */
    public function up(): void
    {
        Schema::create('faqs', function (Blueprint $table): void {
            $table->id();
            $table->text('question');
            $table->text('answer');
            $table->foreignId('service_id')->nullable()->constrained('services')->nullOnDelete();
            // 'public' | 'internal'. Imported rows are marked 'public' because
            // they are already public today via the frozen Service payload;
            // new admin-created rows default to 'internal' (enforced in
            // App\Models\Faq::create defaults / the admin controller, not
            // just here) so nothing newly authored is assumed public.
            $table->string('visibility')->default('internal');
            // 'draft' | 'published'.
            $table->string('status')->default('draft');
            $table->string('source')->nullable()->unique();
            $table->date('review_date')->nullable();
            $table->timestamps();
            $table->index(['visibility', 'status']);
            $table->index(['service_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('faqs');
    }
};
