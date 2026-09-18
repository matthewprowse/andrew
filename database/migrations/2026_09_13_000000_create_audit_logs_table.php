<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action'); // e.g. deleted, anonymized
            $table->string('subject_type'); // e.g. media, lead, resource_request
            // Not a foreign key: the subject row may legitimately be gone
            // (hard-deleted) or anonymized by the time this log is read —
            // the audit trail must survive that regardless.
            $table->unsignedBigInteger('subject_id');
            $table->json('context')->nullable();
            $table->timestamp('created_at');
            $table->index(['subject_type', 'subject_id']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
