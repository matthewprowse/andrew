<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Header ids that used to carry About/Careers/Insights/Resources into the
     * primary nav. Agreed IA keeps the header to Services, Locations, Contact
     * only; these destinations remain reachable through the footer instead.
     */
    private const LEGACY_HEADER_ONLY_IDS = ['company', 'about', 'careers', 'blog', 'resources', 'sustainability', 'brochures', 'webinars', 'books'];

    public function up(): void
    {
        if (! Schema::hasTable('site_settings')) {
            return;
        }

        foreach (DB::table('site_settings')->select('id', 'menu')->cursor() as $record) {
            $menu = array_values(array_filter(
                json_decode((string) $record->menu, true) ?: [],
                static fn (array $item): bool => $item['id'] !== 'estimator'
                    && $item['id'] !== 'footer-estimator'
                    && ! (in_array($item['id'], self::LEGACY_HEADER_ONLY_IDS, true) && $item['section'] === 'header'),
            ));

            if (! in_array('footer-careers', array_column($menu, 'id'), true)) {
                $menu[] = ['id' => 'footer-careers', 'label' => 'Careers', 'link' => '/careers', 'section' => 'footer', 'parentId' => null, 'sortOrder' => count($menu), 'childrenSource' => 'manual'];
            }

            DB::table('site_settings')->where('id', $record->id)->update(['menu' => json_encode($menu)]);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('site_settings')) {
            return;
        }

        foreach (DB::table('site_settings')->select('id', 'menu')->cursor() as $record) {
            $menu = array_values(array_filter(
                json_decode((string) $record->menu, true) ?: [],
                static fn (array $item): bool => $item['id'] !== 'footer-careers',
            ));

            $menu[] = ['id' => 'about', 'label' => 'About Us', 'link' => '/about', 'section' => 'header', 'parentId' => 'company', 'sortOrder' => count($menu), 'childrenSource' => 'manual'];
            $menu[] = ['id' => 'careers', 'label' => 'Careers', 'link' => '/careers', 'section' => 'header', 'parentId' => 'company', 'sortOrder' => count($menu), 'childrenSource' => 'manual'];
            $menu[] = ['id' => 'blog', 'label' => 'Insights', 'link' => '/blog', 'section' => 'header', 'parentId' => null, 'sortOrder' => count($menu), 'childrenSource' => 'manual'];
            $menu[] = ['id' => 'resources', 'label' => 'Resources', 'link' => '/resources', 'section' => 'header', 'parentId' => null, 'sortOrder' => count($menu), 'childrenSource' => 'manual'];
            $menu[] = ['id' => 'estimator', 'label' => 'Estimator', 'link' => '/estimator', 'section' => 'header', 'parentId' => null, 'sortOrder' => count($menu), 'childrenSource' => 'manual'];
            $menu[] = ['id' => 'footer-estimator', 'label' => 'Estimator', 'link' => '/estimator', 'section' => 'footer', 'parentId' => null, 'sortOrder' => count($menu), 'childrenSource' => 'manual'];

            DB::table('site_settings')->where('id', $record->id)->update(['menu' => json_encode($menu)]);
        }
    }
};
