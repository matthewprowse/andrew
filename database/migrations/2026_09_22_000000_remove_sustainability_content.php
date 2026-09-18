<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $categoryId = DB::table('resource_categories')
            ->where('slug', 'sustainability')
            ->value('id');

        if ($categoryId !== null) {
            $itemIds = DB::table('resource_items')
                ->where('resource_category_id', $categoryId)
                ->pluck('id');

            DB::table('resource_requests')->whereIn('resource_item_id', $itemIds)->delete();
            DB::table('resource_items')->whereIn('id', $itemIds)->delete();
            DB::table('resource_categories')->where('id', $categoryId)->delete();
        }

        DB::table('pages')->where('slug', 'sustainability')->delete();
    }

    public function down(): void
    {
        // Removed editorial content cannot be reconstructed safely.
    }
};
