<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Careers no longer has its own public page — open positions are listed
     * at the bottom of /about instead, so the footer's standalone "Careers"
     * link (added by 2026_09_10_000000_trim_public_header_menu_...) is
     * removed rather than repointed.
     */
    public function up(): void
    {
        if (! Schema::hasTable('site_settings')) {
            return;
        }

        foreach (DB::table('site_settings')->select('id', 'menu')->cursor() as $record) {
            $menu = array_values(array_filter(
                json_decode((string) $record->menu, true) ?: [],
                static fn (array $item): bool => $item['id'] !== 'footer-careers',
            ));

            DB::table('site_settings')->where('id', $record->id)->update(['menu' => json_encode($menu)]);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('site_settings')) {
            return;
        }

        foreach (DB::table('site_settings')->select('id', 'menu')->cursor() as $record) {
            $menu = json_decode((string) $record->menu, true) ?: [];

            if (! in_array('footer-careers', array_column($menu, 'id'), true)) {
                $menu[] = ['id' => 'footer-careers', 'label' => 'Careers', 'link' => '/careers', 'section' => 'footer', 'parentId' => null, 'sortOrder' => count($menu), 'childrenSource' => 'manual'];
            }

            DB::table('site_settings')->where('id', $record->id)->update(['menu' => json_encode($menu)]);
        }
    }
};
