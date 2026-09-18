<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->nullable()->unique();
            $table->foreignId('resource_item_id')->nullable()->constrained('resource_items')->nullOnDelete();
            $table->foreignId('resource_request_id')->nullable()->constrained('resource_requests')->nullOnDelete();
            $table->string('email');
            $table->unsignedInteger('amount_cents');
            $table->char('currency', 3);
            // pending | paid | refunded | cancelled
            $table->string('status')->default('pending');
            $table->string('gateway');
            $table->string('gateway_order_id')->nullable()->index();
            $table->string('payer_name')->nullable();
            $table->string('payer_email')->nullable();
            // "{resource_item_id}:{email}" while the order is paid, null
            // otherwise — a database-level guarantee that one email can only
            // hold one paid order per resource.
            $table->string('paid_key')->nullable()->unique();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('anonymized_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
            $table->index(['resource_item_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
