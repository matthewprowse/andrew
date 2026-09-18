<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resource_item_service', function (Blueprint $table) {
            $table->foreignId('resource_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();
            $table->primary(['resource_item_id', 'service_id']);
        });

        DB::table('resource_items')
            ->whereNotNull('service_id')
            ->select(['id', 'service_id'])
            ->orderBy('id')
            ->each(function (object $item): void {
                DB::table('resource_item_service')->insert([
                    'resource_item_id' => $item->id,
                    'service_id' => $item->service_id,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('resource_item_service');
    }
};
