<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Append-only ledger of every money movement against an order. Rows are
     * never updated or deleted, so the history stays complete for accounting
     * and for partial refunds later.
     */
    public function up(): void
    {
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->restrictOnDelete();
            // capture | refund
            $table->string('type');
            // completed | failed
            $table->string('status');
            $table->unsignedInteger('amount_cents');
            $table->char('currency', 3);
            $table->string('gateway');
            $table->string('gateway_transaction_id')->nullable();
            $table->text('reason')->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('payload')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index(['order_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
    }
};
