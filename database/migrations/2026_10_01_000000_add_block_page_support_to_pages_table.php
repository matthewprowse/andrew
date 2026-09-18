<?php

use App\Models\Page;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adds the block-page concept alongside the existing fixed-field
     * ("legacy") page shape. About, Contact and Locations keep using their
     * hero/intro/sections columns unchanged — only Home converts to
     * `kind = 'block'` here, and new pages created from the admin will use
     * it too. See App\Models\Page and App\Http\Controllers\PageController.
     */
    public function up(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->string('title')->nullable()->after('slug');
            $table->string('kind')->default(Page::KIND_LEGACY)->after('title');
            $table->boolean('is_system')->default(false)->after('kind');
            $table->json('blocks')->nullable()->after('is_system');
        });

        DB::table('pages')->updateOrInsert(['slug' => 'home'], [
            'title' => 'Home',
            'kind' => Page::KIND_BLOCK,
            'is_system' => true,
            'blocks' => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->dropColumn(['title', 'kind', 'is_system', 'blocks']);
        });
    }
};
