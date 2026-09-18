<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('faqs', function (Blueprint $table): void {
            $table->dropIndex(['visibility', 'status']);
            $table->dropColumn('visibility');
        });
    }

    public function down(): void
    {
        Schema::table('faqs', function (Blueprint $table): void {
            $table->string('visibility')->default('internal');
            $table->index(['visibility', 'status']);
        });
    }
};
