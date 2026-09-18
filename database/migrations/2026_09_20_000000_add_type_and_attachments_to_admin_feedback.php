<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Additive extension of admin_feedback (2026_09_19_000000): a category
     * (bug/feature/content_change/other) and one-to-many screenshot/photo
     * attachments. Attachments are feedback-specific, disposable files —
     * unlike App\Models\Media (reusable site assets with impact-aware
     * delete, see Phase 5A), they're deleted outright when their parent
     * feedback entry is, no usage tracking needed.
     */
    public function up(): void
    {
        Schema::table('admin_feedback', function (Blueprint $table) {
            $table->string('type')->default('other')->after('user_id');
        });

        Schema::create('admin_feedback_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_feedback_id')->constrained('admin_feedback')->cascadeOnDelete();
            $table->string('file_path', 2048);
            $table->string('file_name');
            $table->string('mime_type');
            $table->unsignedBigInteger('size');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_feedback_attachments');
        Schema::table('admin_feedback', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};
