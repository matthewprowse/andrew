<?php

namespace Database\Seeders;

use App\Models\Page;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PageContentSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            // Approved copy lives alongside the other seed JSON, so this seeder and the
            // content:sync command (see App\Console\Commands\SyncContent) read one source of truth.
            $source = file_get_contents(__DIR__.'/pages.json');
            if ($source === false) {
                throw new \RuntimeException('Cannot read page seed content.');
            }
            $pages = json_decode($source, true, 512, JSON_THROW_ON_ERROR);

            foreach ($pages as $slug => $page) {
                // Home and About moved to the block-page system — their
                // rows are created and populated by migrations, not this
                // seeder (see 2026_10_01_000000_add_block_page_support_to_pages_table,
                // 2026_10_01_000200_seed_home_page_blocks and
                // 2026_10_02_000000_convert_about_page_to_blocks). The
                // exists() check below already skips both automatically —
                // this is just the explicit, cheaper short-circuit for Home.
                if ($slug === 'home' || Page::where('slug', $slug)->exists()) {
                    continue;
                }

                Page::create([
                    'slug' => $slug,
                    'hero_heading' => $page['heroHeading'],
                    'hero_subheading' => $page['heroSubheading'],
                    'intro_heading' => $page['introHeading'],
                    'intro_body' => $page['introBody'],
                    'sections' => $page['sections'],
                    // Team section stays off by default for every page, matching the prior seed;
                    // staff opt in per page from the admin (see PageContentController::update()).
                    'show_team_section' => false,
                    'meta_title' => $page['metaTitle'],
                    'meta_description' => $page['metaDescription'],
                ]);
            }
        });
    }
}
