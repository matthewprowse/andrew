<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Feedback submitted about the admin tool itself via the global FAB
     * (resources/js/components/admin/feedback-fab.tsx), not about site
     * content. user_id is nullable + set-null-on-delete so a submission
     * outlives the account that made it, rather than being silently
     * deleted — the timestamp/page/user-agent context still has value on
     * its own.
     */
    public function up(): void
    {
        Schema::create('admin_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('message');
            $table->string('page_url', 2048)->nullable();
            $table->string('user_agent', 512)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_feedback');
    }
};
